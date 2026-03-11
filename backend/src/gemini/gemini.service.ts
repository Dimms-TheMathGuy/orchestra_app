import { Injectable } from '@nestjs/common'
import { GoogleGenerativeAI } from '@google/generative-ai'

@Injectable()
export class GeminiService {

    private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

    async summarize(text: string) {

        const model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        })

        const prompt = `
Summarize the following Zoom meeting transcript.

Transcript:
${text}
`

        const result = await model.generateContent(prompt)

        const response = result.response.text()

        return response

    }

}