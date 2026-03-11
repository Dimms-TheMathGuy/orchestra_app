import { Injectable } from '@nestjs/common'

@Injectable()
export class ZoomService {

    async retrieveTranscript(meetingId: string) {

        return {
            meetingId,
            transcript: "Example transcript retrieved from Zoom."
        }

    }

}