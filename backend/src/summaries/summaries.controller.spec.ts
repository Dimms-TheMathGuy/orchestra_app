import { Test, TestingModule } from '@nestjs/testing';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';

describe('SummariesController', () => {
  let controller: SummariesController;
  let summariesService: {
    generate: jest.Mock;
    findByMeeting: jest.Mock;
    updateDraft: jest.Mock;
    cancelDraft: jest.Mock;
    approveDraft: jest.Mock;
  };

  beforeEach(async () => {
    summariesService = {
      generate: jest.fn(),
      findByMeeting: jest.fn(),
      updateDraft: jest.fn(),
      cancelDraft: jest.fn(),
      approveDraft: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SummariesController],
      providers: [{ provide: SummariesService, useValue: summariesService }],
    }).compile();

    controller = module.get<SummariesController>(SummariesController);
  });

  it('passes meetingId and blockId to generate', () => {
    controller.generate('10', 'block-xyz');

    expect(summariesService.generate).toHaveBeenCalledWith(10, 'block-xyz');
  });

  it('passes meetingId and draftId to approve', () => {
    controller.approveSummary('10', 'draft-1');

    expect(summariesService.approveDraft).toHaveBeenCalledWith(10, 'draft-1');
  });

  it('passes validated entries to updateDraft', () => {
    const body = {
      entries: [{ properties: { Name: 'Edited task' } }],
    };

    controller.updateDraft('10', 'draft-1', body);

    expect(summariesService.updateDraft).toHaveBeenCalledWith(
      10,
      'draft-1',
      body.entries,
    );
  });

  it('passes meetingId and draftId to cancelDraft', () => {
    controller.cancelDraft('10', 'draft-1');

    expect(summariesService.cancelDraft).toHaveBeenCalledWith(10, 'draft-1');
  });
});
