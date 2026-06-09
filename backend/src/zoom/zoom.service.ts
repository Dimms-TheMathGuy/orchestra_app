import { Injectable, BadRequestException, ForbiddenException, InternalServerErrorException, UnauthorizedException, NotFoundException, BadGatewayException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranscriptsService } from '../transcript/transcripts.service';
import { SummariesService } from '../summaries/summaries.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import axios from 'axios';
import crypto from 'crypto';

type ZoomTokens = {
    access_token: string;
    expires_at: number;
};

@Injectable()
export class ZoomService {
    private tokenCache: ZoomTokens | null = null;
    private readonly baseUrl = 'https://api.zoom.us/v2';
    private meetingBlockMap = new Map<string, string>();
    // meetingId -> app userId of whoever created/scheduled the meeting (the host)
    private meetingHostMap = new Map<string, string>();

    constructor(
        private config: ConfigService,
        private transcripts: TranscriptsService,
        private summaries: SummariesService,
        private prisma: PrismaService,
        private roles: RolesService,
    ) {}

    // --- Error translation ---

    /**
     * Turn a raw axios/Zoom failure into an HttpException that carries Zoom's
     * actual reason, so the client sees something better than "Internal server error".
     */
    private translateZoomError(error: unknown, context: string): never {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data: any = error.response?.data;
            const zoomMessage =
                (data && (data.message || data.reason)) ||
                (typeof data === 'string' && data ? data : null);
            const detail = `${context}: ${zoomMessage ?? error.message}`;

            switch (status) {
                case 400: throw new BadRequestException(detail);
                case 401: throw new UnauthorizedException(detail);
                case 403: throw new ForbiddenException(detail);
                case 404: throw new NotFoundException(detail);
                case 429: throw new HttpException(detail, 429);
            }
            // No response (network/timeout) or an upstream 5xx — it's a gateway problem.
            throw new BadGatewayException(detail);
        }
        throw new InternalServerErrorException(
            `${context}: ${(error as any)?.message ?? 'Unknown error'}`,
        );
    }

    // --- Token Management ---

    private async getAccessToken(): Promise<string> {
        if (this.tokenCache && Date.now() < this.tokenCache.expires_at - 60_000) {
            return this.tokenCache.access_token;
        }

        const accountId = this.config.get<string>('ZOOM_ACCOUNT_ID');
        const clientId = this.config.get<string>('ZOOM_CLIENT_ID');
        const clientSecret = this.config.get<string>('ZOOM_CLIENT_SECRET');

        if (!accountId || !clientId || !clientSecret) {
            throw new InternalServerErrorException(
                'Zoom credentials not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET in .env',
            );
        }

        let res;
        try {
            res = await axios.post(
                'https://zoom.us/oauth/token',
                new URLSearchParams({ grant_type: 'account_credentials', account_id: accountId }),
                {
                    headers: {
                        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );
        } catch (error) {
            this.translateZoomError(error, 'Zoom authentication failed (check ZOOM_ACCOUNT_ID / CLIENT_ID / CLIENT_SECRET)');
        }

        this.tokenCache = {
            access_token: res.data.access_token,
            expires_at: Date.now() + res.data.expires_in * 1000,
        };

        return this.tokenCache.access_token;
    }

    private async zoomRequest<T = any>(method: 'get' | 'post', path: string, data?: unknown): Promise<T> {
        const token = await this.getAccessToken();
        try {
            const res = await axios({
                method,
                url: `${this.baseUrl}${path}`,
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data,
            });
            return res.data;
        } catch (error) {
            this.translateZoomError(error, `Zoom API ${method.toUpperCase()} ${path} failed`);
        }
    }

    // --- Meetings ---

    async scheduleMeeting(params: {
        topic: string;
        start_time: string;
        duration_minutes: number;
        agenda?: string;
        blockId?: string;
        hostUserId?: string;
        projectId?: string;
        organizerTeam?: string | null;
        allowedTeams?: string[];
    }) {
        const payload = {
            topic: params.topic,
            type: 2, // scheduled meeting
            start_time: params.start_time,
            duration: params.duration_minutes,
            timezone: 'Asia/Jakarta',
            agenda: params.agenda ?? '',
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: false,
                auto_recording: 'cloud',
            },
        };

        const meeting = await this.zoomRequest<any>('post', '/users/me/meetings', payload);
        const meetingId = String(meeting.id);

        if (params.blockId) {
            this.meetingBlockMap.set(meetingId, params.blockId);
        }

        // Remember who created this meeting so only they get host privileges
        if (params.hostUserId) {
            this.meetingHostMap.set(meetingId, params.hostUserId);
        }

        // Persist ACL metadata for group-zoom (survives restart + enables filtering)
        if (params.projectId && params.hostUserId) {
            await this.prisma.projectMeeting.upsert({
                where: { zoomMeetingId: meetingId },
                create: {
                    projectId: params.projectId,
                    zoomMeetingId: meetingId,
                    topic: meeting.topic,
                    hostUserId: params.hostUserId,
                    organizerTeam: params.organizerTeam ?? null,
                    allowedTeams: params.allowedTeams ?? [],
                    startTime: meeting.start_time ? new Date(meeting.start_time) : null,
                },
                update: {
                    organizerTeam: params.organizerTeam ?? null,
                    allowedTeams: params.allowedTeams ?? [],
                },
            });
        }

        return {
            id: meetingId,
            topic: meeting.topic,
            start_time: meeting.start_time,
            duration: meeting.duration,
            join_url: meeting.join_url,
            start_url: meeting.start_url,
            password: meeting.password,
            agenda: meeting.agenda,
            isHost: true,
            organizerTeam: params.organizerTeam ?? null,
            allowedTeams: params.allowedTeams ?? [],
        };
    }

    /** Whether a member context may join a meeting given its ACL. */
    private canAccessMeeting(
        acl: { organizerTeam: string | null; allowedTeams: string[] },
        ctx: { level: number; team: string | null },
    ): boolean {
        // Management (PM + board) can join any project meeting
        if (ctx.level <= 1) return true;
        // Project-wide meeting (no organizer team) — any member can join
        if (!acl.organizerTeam) return true;
        // The organizing team can join
        if (ctx.team && ctx.team === acl.organizerTeam) return true;
        // Explicitly invited teams can join
        if (ctx.team && acl.allowedTeams.includes(ctx.team)) return true;
        return false;
    }

    /**
     * Meetings for a project, filtered by the requesting user's role ACL.
     * Meetings with a stored ProjectMeeting record are scoped to that project;
     * meetings with no record (legacy/personal) are shown to all project members.
     */
    async listProjectMeetings(projectId: string, userId: string) {
        const ctx = await this.roles.getMemberContext(projectId, userId);
        if (!ctx.isMember) {
            throw new ForbiddenException('Not a project member');
        }

        const live = await this.listMeetings(userId);

        const aclForProject = await this.prisma.projectMeeting.findMany({
            where: { projectId },
        });
        const aclMap = new Map(aclForProject.map((a) => [a.zoomMeetingId, a]));

        // Meeting IDs claimed by ANY project (to hide other projects' meetings)
        const claimed = await this.prisma.projectMeeting.findMany({
            select: { zoomMeetingId: true },
        });
        const claimedSet = new Set(claimed.map((c) => c.zoomMeetingId));

        const result: any[] = [];
        for (const m of live) {
            const acl = aclMap.get(m.id);
            if (acl) {
                if (this.canAccessMeeting(acl, ctx)) {
                    result.push({
                        ...m,
                        organizerTeam: acl.organizerTeam,
                        allowedTeams: acl.allowedTeams,
                        scope: acl.organizerTeam ? 'team' : 'project',
                    });
                }
            } else if (!claimedSet.has(m.id)) {
                // Legacy / personal meeting not tied to any project — visible to all members
                result.push({ ...m, organizerTeam: null, allowedTeams: [], scope: 'global' });
            }
            // else: claimed by another project → skip
        }

        return result;
    }

    async listMeetings(userId?: string) {
        const data = await this.zoomRequest<any>('get', '/users/me/meetings?page_size=30&type=scheduled');

        // Map each Zoom meeting back to the project that owns it (if any), so the
        // dashboard calendar can deep-link a meeting to its project workspace.
        const claimed = await this.prisma.projectMeeting.findMany({
            select: { zoomMeetingId: true, projectId: true },
        });
        const projectByMeeting = new Map(claimed.map((c) => [c.zoomMeetingId, c.projectId]));

        return (data.meetings ?? []).map((m: any) => {
            const id = String(m.id);
            const isHost = userId ? this.meetingHostMap.get(id) === userId : false;
            return {
                id,
                topic: m.topic,
                start_time: m.start_time,
                duration: m.duration,
                join_url: m.join_url,
                password: m.password,
                isHost,
                projectId: projectByMeeting.get(id) ?? null,
                // start_url is sensitive (grants host control) — only expose to the host
                start_url: isHost ? m.start_url : undefined,
            };
        });
    }

    // Fresh ZAK token lets the host start a meeting from the embedded web client.
    // The ZAK embedded in start_url expires (~2h); fetching fresh avoids that.
    async getZak(): Promise<string> {
        const data = await this.zoomRequest<any>('get', '/users/me/token?type=zak');
        return data.token as string;
    }

    // --- Recordings & Transcript ---

    async getMeetingRecordings(meetingId: string) {
        const data = await this.zoomRequest<any>(
            'get',
            `/meetings/${meetingId}/recordings`,
        );

        return {
            meetingId,
            topic: data.topic,
            start_time: data.start_time,
            duration: data.duration,
            recording_files: (data.recording_files ?? []).map((f: any) => ({
                id: f.id,
                file_type: f.file_type,
                file_size: f.file_size,
                download_url: f.download_url,
                recording_type: f.recording_type,
            })),
        };
    }

    async retrieveTranscript(meetingId: string) {
        const recordings = await this.getMeetingRecordings(meetingId);

        const transcriptFile = recordings.recording_files.find(
            (f: any) => f.file_type === 'TRANSCRIPT' && f.download_url,
        );

        if (!transcriptFile) {
            throw new BadRequestException(
                `No transcript found for meeting ${meetingId}. Ensure cloud recording with transcript is enabled.`,
            );
        }

        const token = await this.getAccessToken();
        let res;
        try {
            res = await axios.get(`${transcriptFile.download_url}?access_token=${token}`);
        } catch (error) {
            this.translateZoomError(error, `Failed to download transcript for meeting ${meetingId}`);
        }
        const transcriptText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

        // Save into shared transcript store so summaries can use it
        this.transcripts.upload(meetingId, transcriptText);

        return {
            meetingId,
            topic: recordings.topic,
            transcript: transcriptText,
        };
    }

    // --- Webhook ---

    verifyWebhookSignature(body: unknown, signatureHeader: string | undefined) {
        const secretToken = this.config.get<string>('ZOOM_SECRET_TOKEN');

        if (!secretToken) {
            throw new InternalServerErrorException('ZOOM_SECRET_TOKEN not configured in .env');
        }

        if (!signatureHeader) {
            throw new UnauthorizedException('Missing x-zm-signature header');
        }

        const rawBody = JSON.stringify(body);
        const expected = `v1=${crypto.createHmac('sha256', secretToken).update(rawBody).digest('hex')}`;

        const received = Buffer.from(signatureHeader);
        const expectedBuf = Buffer.from(expected);

        if (received.length !== expectedBuf.length || !crypto.timingSafeEqual(received, expectedBuf)) {
            throw new UnauthorizedException('Invalid Zoom webhook signature');
        }
    }

    async handleWebhook(body: any) {
        const event = body.event;

        if (event === 'endpoint.url_validation') {
            const plainToken = body.payload?.plainToken;
            const secretToken = this.config.get<string>('ZOOM_SECRET_TOKEN');

            if (!plainToken || !secretToken) {
                throw new BadRequestException('Invalid URL validation payload');
            }

            const encryptedToken = crypto.createHmac('sha256', secretToken).update(plainToken).digest('hex');

            return { plainToken, encryptedToken };
        }

        if (event === 'recording.completed') {
            const meetingId = String(body.payload?.object?.id);

            if (!meetingId) {
                throw new BadRequestException('Missing meeting ID in webhook payload');
            }

            console.log(`Recording completed for meeting ${meetingId} — pulling transcript...`);

            await this.retrieveTranscript(meetingId);

            const blockId = this.meetingBlockMap.get(meetingId);

            if (blockId) {
                console.log(`Auto-generating drafts for meeting ${meetingId} with block ${blockId}`);
                await this.summaries.generate(meetingId, blockId);
                this.meetingBlockMap.delete(meetingId);
            } else {
                console.log(`No blockId mapped for meeting ${meetingId} — transcript saved, drafts not auto-generated`);
            }

            return { ok: true, meetingId };
        }

        console.log('Unhandled Zoom webhook event:', event);
        return { ok: true };
    }
}

