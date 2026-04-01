import { Injectable, HttpException } from '@nestjs/common'
import axios from 'axios'

@Injectable()
export class ZoomService {

    private readonly baseUrl = 'https://api.zoom.us/v2'

    private async getAccessToken(): Promise<string> {
        // Replace with your OAuth token retrieval logic
        return process.env.ZOOM_ACCESS_TOKEN
    }

    async retrieveTranscript(meetingId: string) {

        const token = await this.getAccessToken()

        // Step 1: Get recordings
        const response = await axios.get(
            `${this.baseUrl}/meetings/${meetingId}/recordings`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const recordings = response.data.recording_files

        // Step 2: Filter transcript file
        const transcriptFile = recordings.find(
            (file: any) => file.recording_type === 'audio_transcript'
        )

        if (!transcriptFile) {
            throw new HttpException('Transcript not available', 404)
        }

        // Step 3: Download transcript
        const transcriptResponse = await axios.get(
            transcriptFile.download_url,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        return {
            meetingId,
            transcript: transcriptResponse.data
        }
    }
}
