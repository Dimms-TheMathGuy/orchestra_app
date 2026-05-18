import { Module } from '@nestjs/common';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';
import { TranscriptsModule } from '../transcript/transcripts.module';
import { SummariesModule } from '../summaries/summaries.module';

@Module({
    imports: [TranscriptsModule, SummariesModule],
    controllers: [ZoomController],
    providers: [ZoomService],
    exports: [ZoomService],
})
export class ZoomModule {}