import { Injectable } from '@nestjs/common'

@Injectable()
export class MeetingsService {
    private meetings: any[] = []
    create(meeting) {
        const newMeeting = {
            id: Date.now(),
            ...meeting
        }

        this.meetings.push(newMeeting)

        return newMeeting
    }

    findAll() {
        return this.meetings
    }

    findOne(id: number) {
        return this.meetings.find(m => m.id === id)
    }
}