import { Injectable } from '@nestjs/common'
import { GeminiService } from 'src/gemini/gemini.service'
import { TranscriptsService } from 'src/transcript/transcripts.service'
import { NotionService } from 'src/notion/notion.service'

type DraftStatus = 'pending' | 'approved' | 'cancelled';

type Summary = {
    id: number;
    meetingId: number;
    drafts: MeetingDraft[];
};

type GeneratedDatabaseDraft = {
    databaseId: string;
    title: string;
    entries: DraftEntry[];
};

type DraftEntry = {
    properties: Record<string, unknown>;
};

type MeetingDraft = GeneratedDatabaseDraft & {
    draftId: string;
    status: DraftStatus;
};


@Injectable()
export class SummariesService {

    private summaries: Summary[] = [];


    constructor(
        private gemini: GeminiService,
        private transcripts: TranscriptsService,
        private notion: NotionService
    ) { };

    async generate(meetingId: number, blockId: string) {

        const transcript = await this.transcripts.findByMeeting(String(meetingId));

        if (!transcript) {
            return { error: "Transcript not found" }
        }

        const fullText = transcript.map(t => t.text).join("\n");

        const schemaContext = await this.notion.fetchBlockChildren(blockId);

        const generatedDrafts: GeneratedDatabaseDraft[] = await this.gemini.summarize(fullText, schemaContext);
        const draftBatchId = Date.now();

        const meetingDrafts: MeetingDraft[] = generatedDrafts.map((draft, index) => ({
            draftId: `${draftBatchId}-${index}`,
            status: 'pending',
            ...draft
        }));

        const summary = {
            id: draftBatchId,
            meetingId,
            drafts: meetingDrafts
        }

        const existingSummaryIndex = this.summaries.findIndex((s) => s.meetingId === meetingId);

        if (existingSummaryIndex >= 0) {
            this.summaries[existingSummaryIndex] = summary;
        } else {
            this.summaries.push(summary);
        }

        return summary;
    }

    findByMeeting(meetingId: number) {

        return this.summaries.find((s) => s.meetingId === meetingId);

    }

    private findDraft(meetingId: number, draftId: string) {

        const summary = this.findByMeeting(meetingId);
        if (!summary) {
            return { error: 'Meeting summary not found' }
        }

        const draft = summary.drafts.find((item) => item.draftId === draftId);
        if (!draft) {
            return { error: 'Draft not found' }
        }

        return { summary, draft }
    }

    async approveDraft(meetingId: number, draftId: string) {

        const draftLookup = this.findDraft(meetingId, draftId);
        if ('error' in draftLookup) {
            return draftLookup
        }

        const { draft } = draftLookup;

        if (draft.status === 'approved') {
            return { error: 'Draft already approved' }
        }

        if (draft.status === 'cancelled') {
            return { error: 'Cancelled draft cannot be approved' }
        }

        let syncedPages = 0;

        for (const entry of draft.entries) {
            await this.notion.createPage(draft.databaseId, entry.properties);
            syncedPages += 1;
        }

        draft.status = 'approved';

        return {
            meetingId,
            draftId,
            databaseId: draft.databaseId,
            syncedPages,
            message: 'Draft approved and synced to Notion'
        }
    }

    updateDraft(meetingId: number, draftId: string, entries: DraftEntry[]) {

        const draftLookup = this.findDraft(meetingId, draftId);
        if ('error' in draftLookup) {
            return draftLookup
        }

        const { draft } = draftLookup;

        if (draft.status === 'approved') {
            return { error: 'Approved draft cannot be edited' }
        }

        if (draft.status === 'cancelled') {
            return { error: 'Cancelled draft cannot be edited' }
        }

        draft.entries = entries;

        return draft;
    }

    cancelDraft(meetingId: number, draftId: string) {

        const draftLookup = this.findDraft(meetingId, draftId);
        if ('error' in draftLookup) {
            return draftLookup
        }

        const { draft } = draftLookup;

        if (draft.status === 'approved') {
            return { error: 'Approved draft cannot be cancelled' }
        }

        if (draft.status === 'cancelled') {
            return { error: 'Draft already cancelled' }
        }

        draft.status = 'cancelled';

        return {
            meetingId,
            draftId,
            status: draft.status,
            message: 'Draft cancelled'
        }
    }

}
