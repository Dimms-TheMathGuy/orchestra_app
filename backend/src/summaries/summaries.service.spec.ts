import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from 'src/gemini/gemini.service';
import { NotionService } from 'src/notion/notion.service';
import { TranscriptsService } from 'src/transcript/transcripts.service';
import { SummariesService } from './summaries.service';

describe('SummariesService', () => {
  let service: SummariesService;
  let geminiService: { summarize: jest.Mock };
  let transcriptsService: { findByMeeting: jest.Mock };
  let notionService: { fetchBlockChildren: jest.Mock; createPage: jest.Mock };

  beforeEach(async () => {
    geminiService = {
      summarize: jest.fn(),
    };

    transcriptsService = {
      findByMeeting: jest.fn(),
    };

    notionService = {
      fetchBlockChildren: jest.fn(),
      createPage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummariesService,
        { provide: GeminiService, useValue: geminiService },
        { provide: TranscriptsService, useValue: transcriptsService },
        { provide: NotionService, useValue: notionService },
      ],
    }).compile();

    service = module.get<SummariesService>(SummariesService);
  });

  it('generates grouped drafts per database for a meeting', async () => {
    transcriptsService.findByMeeting.mockReturnValue({
      id: 1,
      meetingId: 12,
      text: 'Discuss bug triage and new tasks',
    });

    notionService.fetchBlockChildren.mockResolvedValue([
      { databaseId: 'db-task', title: 'New Tasks', properties: [] },
      { databaseId: 'db-bug', title: 'Bugs and Issues', properties: [] },
    ]);

    geminiService.summarize.mockResolvedValue([
      {
        databaseId: 'db-task',
        title: 'New Tasks',
        entries: [{ properties: { Name: 'Follow up payment bug' } }],
      },
      {
        databaseId: 'db-bug',
        title: 'Bugs and Issues',
        entries: [{ properties: { Name: 'Checkout failure' } }],
      },
    ]);

    const result = await service.generate(12, 'block-123');

    expect(transcriptsService.findByMeeting).toHaveBeenCalledWith(12);
    expect(notionService.fetchBlockChildren).toHaveBeenCalledWith('block-123');
    expect(geminiService.summarize).toHaveBeenCalledWith(
      'Discuss bug triage and new tasks',
      expect.any(Array),
    );
    expect(result.meetingId).toBe(12);
    expect(result.drafts).toHaveLength(2);
    expect(result.drafts[0]).toEqual(
      expect.objectContaining({
        draftId: expect.any(String),
        status: 'pending',
        databaseId: 'db-task',
      }),
    );
  });

  it('updates a pending draft without changing other drafts', async () => {
    transcriptsService.findByMeeting.mockReturnValue({
      id: 1,
      meetingId: 99,
      text: 'Meeting transcript',
    });

    notionService.fetchBlockChildren.mockResolvedValue([
      { databaseId: 'db-task', title: 'New Tasks', properties: [] },
      { databaseId: 'db-note', title: 'Notulen', properties: [] },
    ]);

    geminiService.summarize.mockResolvedValue([
      {
        databaseId: 'db-task',
        title: 'New Tasks',
        entries: [{ properties: { Name: 'Initial task' } }],
      },
      {
        databaseId: 'db-note',
        title: 'Notulen',
        entries: [{ properties: { Summary: 'Initial notes' } }],
      },
    ]);

    const generated = await service.generate(99, 'block-99');
    const targetDraft = generated.drafts[0];
    const untouchedDraft = generated.drafts[1];

    const updated = service.updateDraft(99, targetDraft.draftId, [
      { properties: { Name: 'Edited task' } },
    ]);

    expect(updated).toEqual(
      expect.objectContaining({
        draftId: targetDraft.draftId,
        entries: [{ properties: { Name: 'Edited task' } }],
      }),
    );

    const summary = service.findByMeeting(99);
    expect(summary?.drafts[0].entries).toEqual([{ properties: { Name: 'Edited task' } }]);
    expect(summary?.drafts[1]).toEqual(untouchedDraft);
  });

  it('cancels only the requested draft', async () => {
    transcriptsService.findByMeeting.mockReturnValue({
      id: 2,
      meetingId: 77,
      text: 'Meeting transcript',
    });

    notionService.fetchBlockChildren.mockResolvedValue([
      { databaseId: 'db-task', title: 'New Tasks', properties: [] },
      { databaseId: 'db-bug', title: 'Bugs and Issues', properties: [] },
    ]);

    geminiService.summarize.mockResolvedValue([
      {
        databaseId: 'db-task',
        title: 'New Tasks',
        entries: [{ properties: { Name: 'Task A' } }],
      },
      {
        databaseId: 'db-bug',
        title: 'Bugs and Issues',
        entries: [{ properties: { Name: 'Bug A' } }],
      },
    ]);

    const generated = await service.generate(77, 'block-77');

    const result = service.cancelDraft(77, generated.drafts[1].draftId);

    expect(result).toEqual(
      expect.objectContaining({
        draftId: generated.drafts[1].draftId,
        status: 'cancelled',
      }),
    );
    expect(service.findByMeeting(77)?.drafts[0].status).toBe('pending');
    expect(service.findByMeeting(77)?.drafts[1].status).toBe('cancelled');
  });

  it('approves and syncs only one draft', async () => {
    transcriptsService.findByMeeting.mockReturnValue({
      id: 3,
      meetingId: 55,
      text: 'Meeting transcript',
    });

    notionService.fetchBlockChildren.mockResolvedValue([
      { databaseId: 'db-task', title: 'New Tasks', properties: [] },
      { databaseId: 'db-bug', title: 'Bugs and Issues', properties: [] },
    ]);

    geminiService.summarize.mockResolvedValue([
      {
        databaseId: 'db-task',
        title: 'New Tasks',
        entries: [
          { properties: { Name: 'Task A' } },
          { properties: { Name: 'Task B' } },
        ],
      },
      {
        databaseId: 'db-bug',
        title: 'Bugs and Issues',
        entries: [{ properties: { Name: 'Bug A' } }],
      },
    ]);

    const generated = await service.generate(55, 'block-55');

    const result = await service.approveDraft(55, generated.drafts[0].draftId);

    expect(notionService.createPage).toHaveBeenCalledTimes(2);
    expect(notionService.createPage).toHaveBeenNthCalledWith(
      1,
      'db-task',
      { Name: 'Task A' },
    );
    expect(notionService.createPage).toHaveBeenNthCalledWith(
      2,
      'db-task',
      { Name: 'Task B' },
    );
    expect(result).toEqual(
      expect.objectContaining({
        draftId: generated.drafts[0].draftId,
        databaseId: 'db-task',
        syncedPages: 2,
      }),
    );
    expect(service.findByMeeting(55)?.drafts[0].status).toBe('approved');
    expect(service.findByMeeting(55)?.drafts[1].status).toBe('pending');
  });
});
