import { Module } from '@nestjs/common'
import { SummariesController } from './summaries.controller'
import { SummariesService } from './summaries.service'

import { GeminiModule } from '../gemini/gemini.module'
import { TranscriptsModule } from '../transcripts/transcripts.module'

@Module({
    imports: [
        GeminiModule,
        TranscriptsModule
    ],
    controllers: [SummariesController],
    providers: [SummariesService]
})
export class SummariesModule { }