import { Module } from '@nestjs/common'
import { ZoomService } from './zoom.service'
import { ZoomController } from './zoom.controller'
import { TranscriptsModule } from '../transcript/transcripts.module'

@Module({
    imports: [TranscriptsModule],
    providers: [ZoomService],
    controllers: [ZoomController],
})
export class ZoomModule { }
