import { Injectable, BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranscriptsService } from '../transcript/transcripts.service';
import { SummariesService } from '../summaries/summaries.service';
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

    constructor(
        private config: ConfigService,
        private transcripts: TranscriptsService,
        private summaries: SummariesService,
    ) {}

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

        const res = await axios.post(
            'https://zoom.us/oauth/token',
            new URLSearchParams({ grant_type: 'account_credentials', account_id: accountId }),
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );

        this.tokenCache = {
            access_token: res.data.access_token,
            expires_at: Date.now() + res.data.expires_in * 1000,
        };

        return this.tokenCache.access_token;
    }

    private async zoomRequest<T = any>(method: 'get' | 'post', path: string, data?: unknown): Promise<T> {
        const token = await this.getAccessToken();
        const res = await axios({
            method,
            url: `${this.baseUrl}${path}`,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data,
        });
        return res.data;
    }

    // --- Meetings ---

    async scheduleMeeting(params: {
        topic: string;
        start_time: string;
        duration_minutes: number;
        agenda?: string;
        blockId?: string;
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

        return {
            id: meetingId,
            topic: meeting.topic,
            start_time: meeting.start_time,
            duration: meeting.duration,
            join_url: meeting.join_url,
            agenda: meeting.agenda,
        };
    }

    async listMeetings() {
        const data = await this.zoomRequest<any>('get', '/users/me/meetings?page_size=30&type=scheduled');

        return (data.meetings ?? []).map((m: any) => ({
            id: String(m.id),
            topic: m.topic,
            start_time: m.start_time,
            duration: m.duration,
            join_url: m.join_url,
        }));
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
        const res = await axios.get(`${transcriptFile.download_url}?access_token=${token}`);
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

