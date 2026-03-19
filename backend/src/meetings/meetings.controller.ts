import { Controller, Get, Post, Body, Param } from '@nestjs/common'

import { MeetingsService } from './meetings.service'

@Controller('meetings')
export class MeetingsController {
    constructor(private meetingsService: MeetingsService) { }

    @Get()
    findAll() {
        return this.meetingsService.findAll()
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.meetingsService.findOne(Number(id))
    }
}