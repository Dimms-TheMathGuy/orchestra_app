import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotionService } from './notion.service';

describe('NotionService', () => {
  let service: NotionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-key') } },
      ],
    }).compile();

    service = module.get<NotionService>(NotionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
