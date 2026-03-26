import { BadGatewayException, Injectable } from '@nestjs/common'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const draftEntrySchema = z.object({
    properties: z.record(z.string(), z.unknown()),
});

const databaseDraftSchema = z.object({
    databaseId: z.string().min(1),
    title: z.string(),
    entries: z.array(draftEntrySchema),
});

const databaseDraftListSchema = z.array(databaseDraftSchema);

type DatabaseDraft = z.infer<typeof databaseDraftSchema>;

@Injectable()
export class GeminiService {

    private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

    private stripCodeFence(responseText: string): string {
        return responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    }

    async summarize(text: string, schemaContext: unknown): Promise<DatabaseDraft[]> {

        const model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        })

        const prompt = `
You are an AI note taker that creates editable Notion draft data.
Follow the provided Notion schema context exactly.

Return valid JSON only.
Do not include markdown, code fences, comments, or explanation text.
The top-level JSON must be an array.

Each item in the array must have this shape:
{
  "databaseId": "string",
  "title": "string",
  "entries": [
    {
      "properties": {
        "propertyName": "value"
      }
    }
  ]
}

Rules:
- Group results by database.
- Only use databaseId and title that exist in the schema context.
- Only use property names that exist in each database schema.
- If a database has no relevant meeting data, return it with an empty "entries" array.
- Entries must contain only the "properties" object.

Notion schema context:
${JSON.stringify(schemaContext, null, 2)}

Transcript:
${text}
`

        const result = await model.generateContent(prompt)
        const rawResponse = result.response.text().trim()

        if (!rawResponse) {
            throw new BadGatewayException('Gemini returned an empty response')
        }

        const cleanResponse = this.stripCodeFence(rawResponse)
        let parsedDrafts: unknown;

        try {
            parsedDrafts = JSON.parse(cleanResponse);
        } catch {
            throw new BadGatewayException('Gemini returned invalid JSON draft')
        }

        const validatedDrafts = databaseDraftListSchema.safeParse(parsedDrafts);

        if (!validatedDrafts.success) {
            throw new BadGatewayException('Gemini returned a draft with an unexpected shape')
        }

        return validatedDrafts.data

    }

}
