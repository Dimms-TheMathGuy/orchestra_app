import { Module } from '@nestjs/common'
import { SummariesController } from './summaries.controller'
import { SummariesService } from './summaries.service'

import { GeminiModule } from '../gemini/gemini.module'
import { TranscriptsModule } from '../transcript/transcripts.module'
import { NotionModule } from 'src/notion/notion.module'

@Module({
    imports: [
        GeminiModule,
        TranscriptsModule,
        NotionModule
    ],
    controllers: [SummariesController],
    providers: [SummariesService]
})
export class SummariesModule { }