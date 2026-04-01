import { Module } from '@nestjs/common'
import { ZoomService } from './zoom.service'
import { TranscriptsService } from '../transcript/transcripts.service'
import { ZoomController } from './zoom.controller'

@Module({
    providers: [ZoomService, TranscriptsService],
    controllers: [ZoomController],
})
export class ZoomModule { }