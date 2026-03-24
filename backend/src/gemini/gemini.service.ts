import { Injectable } from '@nestjs/common'
import { GoogleGenerativeAI } from '@google/generative-ai'

@Injectable()
export class GeminiService {

    private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

    async summarize(text: string, schemaContext: any) {

        const model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        })

        const prompt = `
You are an AI note taker. Follow the provided Notion schema context exactly.

Notion schema context:
${JSON.stringify(schemaContext, null, 2)}

Transcript:
${text}
`

        const result = await model.generateContent(prompt)

        const response = result.response.text()

        return response

    }

}
