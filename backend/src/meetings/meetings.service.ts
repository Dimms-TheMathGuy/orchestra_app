import { Injectable } from '@nestjs/common'


type Meeting = {
    id: number;
    title: string;
    date: Date;
}

@Injectable()
export class MeetingsService {
    private meetings: Meeting[] = [];

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