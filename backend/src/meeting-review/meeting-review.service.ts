import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SyncState } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SummariesService } from '../summaries/summaries.service';
import { TranscriptsService } from '../transcript/transcripts.service';

type MeetingReviewProject = Prisma.ProjectGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    members: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
          };
        };
      };
      orderBy: {
        joinedAt: 'asc';
      };
    };
    repositories: {
      orderBy: {
        createdAt: 'asc';
      };
    };
    activities: {
      orderBy: {
        createdAt: 'desc';
      };
      take: 6;
    };
    taskBranchSyncs: {
      include: {
        repo: {
          select: {
            githubOwner: true;
            githubRepo: true;
            githubUrl: true;
          };
        };
      };
      orderBy: {
        updatedAt: 'desc';
      };
      take: 4;
    };
    meetings: {
      orderBy: {
        createdAt: 'desc';
      };
      take: 5;
    };
  };
}>;

type SummaryDraft =
  NonNullable<ReturnType<SummariesService['findByMeeting']>>['drafts'][number];

@Injectable()
export class MeetingReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transcripts: TranscriptsService,
    private readonly summaries: SummariesService,
  ) {}

  async getMeetingReview(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        repositories: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 6,
        },
        taskBranchSyncs: {
          include: {
            repo: {
              select: {
                githubOwner: true,
                githubRepo: true,
                githubUrl: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 4,
        },
        meetings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const activeMeeting = project.meetings[0] ?? null;
    const summaryMeetingId = this.resolveSummaryMeetingId(
      activeMeeting?.zoomMeetingId ?? project.zoomMeetingId,
    );
    const summaryDrafts = summaryMeetingId
      ? this.summaries.findByMeeting(summaryMeetingId)?.drafts ?? []
      : [];
    const transcriptText =
      activeMeeting?.transcriptVtt ??
      this.transcripts.findByMeeting(activeMeeting?.zoomMeetingId ?? '')?.text ??
      null;

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
        owner: {
          id: project.owner.id,
          name: project.owner.name,
          email: project.owner.email,
          initials: this.getInitials(project.owner.name),
        },
        members: project.members.map((member) => ({
          id: member.id,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
          user: {
            ...member.user,
            initials: this.getInitials(member.user.name),
          },
        })),
        repositories: project.repositories.map((repo) => ({
          id: repo.id,
          githubOwner: repo.githubOwner,
          githubRepo: repo.githubRepo,
          githubUrl: repo.githubUrl,
          label: `${repo.githubOwner}/${repo.githubRepo}`,
        })),
      },
      sections: {
        topNav: [
          {
            id: 'drafts',
            label: 'Drafts',
            meta: `${this.countPending(summaryDrafts, project)} pending`,
          },
          {
            id: 'sync-status',
            label: 'Sync Status',
            meta: this.describeSyncState(project.taskBranchSyncs[0]?.syncState),
          },
          {
            id: 'team',
            label: 'Team',
            meta: `${project.members.length} members`,
          },
        ],
        sideNav: [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'projects', label: 'Projects' },
          { id: 'sessions', label: 'Sessions', active: true },
          { id: 'integrations', label: 'Integrations' },
          { id: 'settings', label: 'Settings' },
        ],
      },
      history: this.buildHistory(project, activeMeeting?.id ?? null),
      review: {
        breadcrumb: ['Sessions', this.buildReviewLabel(activeMeeting?.status)],
        title:
          activeMeeting?.topic?.trim() ||
          `${project.name} Meeting Result Review`,
        aiSummary: this.buildAiSummary(project, activeMeeting, summaryDrafts.length),
        keyDecisions: this.buildKeyDecisions(project, activeMeeting),
        transcript: {
          title: 'Transcript',
          searchPlaceholder: 'Search transcript...',
          messages: this.buildTranscriptMessages(transcriptText, project),
        },
        drafts: this.buildDrafts(project, summaryDrafts),
      },
    };
  }

  private resolveSummaryMeetingId(zoomMeetingId: string | null | undefined) {
    if (!zoomMeetingId) {
      return null;
    }

    const parsed = Number(zoomMeetingId);
    return Number.isFinite(parsed) ? zoomMeetingId : null;
  }

  private countPending(drafts: SummaryDraft[], project: MeetingReviewProject) {
    if (drafts.length > 0) {
      return drafts.filter((draft) => draft.status === 'pending').length;
    }

    return project.taskBranchSyncs.filter(
      (sync) => sync.syncState === 'LINKED' || sync.syncState === 'IN_PROGRESS',
    ).length;
  }

  private describeSyncState(syncState: SyncState | undefined) {
    if (!syncState) {
      return 'Waiting';
    }

    return this.toTitleCase(syncState);
  }

  private buildReviewLabel(status: string | null | undefined) {
    if (!status?.trim()) {
      return 'Design Review';
    }

    return this.toTitleCase(status);
  }

  private buildHistory(
    project: MeetingReviewProject,
    activeMeetingId: string | null,
  ) {
    if (project.meetings.length > 0) {
      return project.meetings.map((meeting, index) => ({
        id: meeting.id,
        label: meeting.topic?.trim() || `Meeting ${index + 1}`,
        dayLabel: index === 0 ? 'Today' : 'Earlier',
        isActive: meeting.id === activeMeetingId,
      }));
    }

    if (project.activities.length > 0) {
      return project.activities.slice(0, 4).map((activity, index) => ({
        id: activity.id,
        label: this.truncate(activity.title, 26),
        dayLabel: index < 2 ? 'Today' : 'Earlier',
        isActive: index === 0,
      }));
    }

    return [
      {
        id: `project-${project.id}`,
        label: `${project.name} overview`,
        dayLabel: 'Today',
        isActive: true,
      },
    ];
  }

  private buildAiSummary(
    project: MeetingReviewProject,
    activeMeeting: MeetingReviewProject['meetings'][number] | null,
    draftCount: number,
  ) {
    if (activeMeeting?.aiSummary?.trim()) {
      return activeMeeting.aiSummary.trim();
    }

    const summarySegments = [
      project.description?.trim()
        ? project.description.trim()
        : `${project.name} is connected to ${project.repositories.length} linked repo${project.repositories.length === 1 ? '' : 's'}.`,
      activeMeeting?.topic?.trim()
        ? `This review centers on ${activeMeeting.topic.trim()}.`
        : 'This review screen is ready to surface transcript-driven meeting insights.',
    ];

    if (draftCount > 0) {
      summarySegments.push(
        `${draftCount} editable Notion draft${draftCount === 1 ? ' is' : 's are'} available for approval.`,
      );
    } else if (project.taskBranchSyncs.length > 0) {
      summarySegments.push(
        `${project.taskBranchSyncs.length} branch sync${project.taskBranchSyncs.length === 1 ? ' is' : 's are'} already tracked for downstream delivery.`,
      );
    } else {
      summarySegments.push(
        'Connect a Zoom transcript and Notion template to unlock structured review drafts.',
      );
    }

    return summarySegments.join(' ');
  }

  private buildKeyDecisions(
    project: MeetingReviewProject,
    activeMeeting: MeetingReviewProject['meetings'][number] | null,
  ) {
    const actionItems = this.normalizeItems(activeMeeting?.actionItems);

    if (actionItems.length > 0) {
      return actionItems.slice(0, 4);
    }

    if (project.taskBranchSyncs.length > 0) {
      return project.taskBranchSyncs.slice(0, 3).map((sync) => {
        const repoLabel = `${sync.repo.githubOwner}/${sync.repo.githubRepo}`;
        return `Track ${sync.branchName} in ${repoLabel} toward ${sync.targetBranch} (${this.toTitleCase(sync.syncState)}).`;
      });
    }

    return [
      'Summaries generated from Zoom transcripts can be reviewed here before syncing to Notion.',
      'Editable draft entries use the existing schema-aware summary backend already present in this project.',
      'Repository sync state will appear alongside meeting outputs once branches are linked to Notion tasks.',
    ];
  }

  private normalizeItems(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.normalizeItem(item))
        .filter((item): item is string => Boolean(item));
    }

    const single = this.normalizeItem(value);
    return single ? [single] : [];
  }

  private normalizeItem(value: unknown): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;

    for (const key of ['decision', 'title', 'summary', 'text', 'name']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    const nested = Object.values(record)
      .map((item) => this.normalizeItem(item))
      .find((item): item is string => Boolean(item));

    return nested ?? null;
  }

  private buildTranscriptMessages(
    transcriptText: string | null,
    project: MeetingReviewProject,
  ) {
    const parsed = transcriptText
      ? this.parseTranscriptMessages(transcriptText, project)
      : [];

    if (parsed.length > 0) {
      return parsed.slice(0, 16);
    }

    return [
      {
        id: 'system-empty',
        speaker: 'Orchestra',
        role: 'System',
        timestamp: null,
        text: 'No transcript is available for this meeting yet. Once Zoom transcript data is uploaded, this panel will render the conversation here.',
        initials: 'OR',
        avatarUrl: null,
      },
    ];
  }

  private parseTranscriptMessages(
    transcriptText: string,
    project: MeetingReviewProject,
  ) {
    const blocks = transcriptText
      .replace(/\r/g, '')
      .split(/\n\s*\n/g)
      .map((block) => block.trim())
      .filter(Boolean);
    const messages: Array<{
      id: string;
      speaker: string;
      role: string;
      timestamp: string | null;
      text: string;
      initials: string;
      avatarUrl: string | null;
    }> = [];

    for (const block of blocks) {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter(
          (line) =>
            line !== 'WEBVTT' &&
            !line.startsWith('NOTE') &&
            !line.startsWith('Kind:') &&
            !line.startsWith('Language:') &&
            !/^\d+$/.test(line),
        );

      if (lines.length === 0) {
        continue;
      }

      const timeLine = lines.find((line) => line.includes('-->'));
      const content = lines.filter((line) => !line.includes('-->')).join(' ').trim();

      if (!content) {
        continue;
      }

      const speakerMatch = content.match(/^([^:]{2,40}):\s*(.+)$/);
      const speaker = speakerMatch?.[1]?.trim() || 'Transcript';
      const text = speakerMatch?.[2]?.trim() || content;
      const member = project.members.find(
        (candidate) =>
          candidate.user.name.trim().toLowerCase() === speaker.toLowerCase(),
      );

      messages.push({
        id: `${messages.length + 1}`,
        speaker: member?.user.name ?? speaker,
        role: member?.role ?? 'Participant',
        timestamp: timeLine?.split('-->')[0]?.trim() || null,
        text,
        initials: member ? this.getInitials(member.user.name) : this.getInitials(speaker),
        avatarUrl: member?.user.avatarUrl ?? null,
      });
    }

    return messages;
  }

  private buildDrafts(project: MeetingReviewProject, drafts: SummaryDraft[]) {
    if (drafts.length > 0) {
      return {
        title: 'Structured Notion Drafts',
        badge: `${drafts.filter((draft) => draft.status === 'pending').length} items pending`,
        items: drafts.map((draft) => ({
          id: draft.draftId,
          status: draft.status,
          templateLabel: draft.title || 'Notion Template',
          entryCount: draft.entries.length,
          fields: this.mapSummaryFields(draft),
        })),
      };
    }

    if (project.taskBranchSyncs.length > 0) {
      return {
        title: 'Structured Notion Drafts',
        badge: `${project.taskBranchSyncs.length} sync links`,
        items: project.taskBranchSyncs.map((sync) => ({
          id: sync.id,
          status: this.mapSyncStatus(sync.syncState),
          templateLabel: sync.branchName,
          entryCount: 1,
          fields: [
            {
              label: 'Repository',
              value: `${sync.repo.githubOwner}/${sync.repo.githubRepo}`,
            },
            {
              label: 'Target Branch',
              value: sync.targetBranch,
            },
            {
              label: 'Completion Field',
              value: `${sync.completionPropertyName} (${sync.completionPropertyType})`,
            },
          ],
        })),
      };
    }

    return {
      title: 'Structured Notion Drafts',
      badge: 'No items yet',
      items: [
        {
          id: 'empty',
          status: 'idle',
          templateLabel: 'Drafts will appear here',
          entryCount: 0,
          fields: [
            {
              label: 'Status',
              value: 'Waiting for transcript + schema generation',
            },
            {
              label: 'Source',
              value: 'SummariesService and Notion integration are ready to feed this section',
            },
          ],
        },
      ],
    };
  }

  private mapSummaryFields(draft: SummaryDraft) {
    const firstEntry = draft.entries[0];

    if (!firstEntry) {
      return [
        {
          label: 'Status',
          value: 'Awaiting entries',
        },
      ];
    }

    return Object.entries(firstEntry.properties)
      .slice(0, 4)
      .map(([label, value]) => ({
        label,
        value: this.stringifyValue(value),
      }));
  }

  private mapSyncStatus(syncState: SyncState) {
    return syncState.toLowerCase();
  }

  private stringifyValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'Not set';
    }

    if (typeof value === 'string') {
      return value.trim() || 'Not set';
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      const parts = value
        .map((item) => this.stringifyValue(item))
        .filter((item) => item !== 'Not set');

      return parts.length > 0 ? parts.join(', ') : 'Not set';
    }

    if (typeof value !== 'object') {
      return 'Not set';
    }

    const record = value as Record<string, unknown>;
    for (const key of ['name', 'plain_text', 'content', 'email']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    const nested = Object.values(record)
      .map((item) => this.stringifyValue(item))
      .filter((item) => item !== 'Not set');

    if (nested.length > 0) {
      return this.truncate(nested.join(', '), 88);
    }

    return this.truncate(JSON.stringify(record), 88);
  }

  private getInitials(name: string) {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return parts.length > 0
      ? parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
      : 'OR';
  }

  private toTitleCase(value: string) {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private truncate(value: string, limit: number) {
    if (value.length <= limit) {
      return value;
    }

    return `${value.slice(0, Math.max(limit - 3, 0)).trimEnd()}...`;
  }
}
