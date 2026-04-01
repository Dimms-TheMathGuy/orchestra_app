import { Injectable, HttpException } from '@nestjs/common'
import axios from 'axios'

type ZoomRecordingFile = {
    recording_type: string
    download_url: string
}

@Injectable()
export class ZoomService {

    private readonly baseUrl = 'https://api.zoom.us/v2'

    private async getAccessToken(): Promise<string> {
        const token = process.env.ZOOM_ACCESS_TOKEN
        if (!token) {
            throw new HttpException('Missing Zoom access token', 500)
        }
        return token
    }

    async retrieveTranscript(meetingId: string) {

        const token = await this.getAccessToken()

        // Step 1: Get recordings
        const response = await axios.get(
            `${this.baseUrl}/meetings/${encodeURIComponent(meetingId)}/recordings`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const recordings: ZoomRecordingFile[] = response.data?.recording_files ?? []

        // Step 2: Filter transcript file
        const transcriptFile = recordings.find(
            (file) => file.recording_type === 'audio_transcript'
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
            id,
            meetingId,
            text: transcriptResponse.data
        }
    }
}
