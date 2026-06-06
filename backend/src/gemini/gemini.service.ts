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

    private stripCodeFence(responseText: string): string {
        return responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    }

    private getModel() {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new BadGatewayException('Gemini API key is not configured')
        }

        return new GoogleGenerativeAI(apiKey).getGenerativeModel({
            model: "gemini-1.5-flash"
        })
    }

    async summarize(text: string, schemaContext: unknown): Promise<DatabaseDraft[]> {
        // Demo fallback: use mock output when MOCK_GEMINI is enabled
        if (process.env.MOCK_GEMINI === 'true') {
            return this.mockSummarize(schemaContext, text);
        }

        const model = this.getModel()

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
`               // end of prompt

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

    // Mock to unblock demos when external API quota/credentials are unavailable
    private mockSummarize(schemaContext: any, transcriptText: string): DatabaseDraft[] {
        const contexts: Array<{ databaseId?: string; title?: string }> = Array.isArray(schemaContext) ? schemaContext : []

        // Parsed demo data from the transcript
        const meetingTitle = 'Q3 Roadmap Discussion'
        const meetingSummary = transcriptText
        const task1 = { name: 'Launch new dashboard', assignee: 'John', status: 'Not started', deadline: '2026-05-31' }
        const task2 = { name: 'Fix authentication bug', assignee: 'Sarah', status: 'Not started', deadline: '2026-05-31' }

        return contexts.map((ctx) => {
            const dbTitle = String(ctx.title ?? 'Demo Drafts')
            const dbId = String(ctx.databaseId ?? 'mock-db')

            if (dbTitle === 'Meeting Summaries') {
                return {
                    databaseId: dbId,
                    title: dbTitle,
                    entries: [{
                        properties: {
                            Name: { title: [{ text: { content: meetingTitle } }] },
                            Summaries: { rich_text: [{ text: { content: meetingSummary } }] }
                        }
                    }]
                }
            }

            if (dbTitle === 'Tasks') {
                return {
                    databaseId: dbId,
                    title: dbTitle,
                    entries: [
                        {
                            properties: {
                                Name: { title: [{ text: { content: task1.name } }] },
                                Status: { status: { name: task1.status } },
                                Deadline: { date: { start: task1.deadline } }
                            }
                        },
                        {
                            properties: {
                                Name: { title: [{ text: { content: task2.name } }] },
                                Status: { status: { name: task2.status } },
                                Deadline: { date: { start: task2.deadline } }
                            }
                        }
                    ]
                }
            }

            if (dbTitle === 'bugs and Report') {
                return {
                    databaseId: dbId,
                    title: dbTitle,
                    entries: [{
                        properties: {
                            Name: { title: [{ text: { content: task2.name } }] },
                            Status: { status: { name: task2.status } }
                        }
                    }]
                }
            }

            // Fallback for unknown databases
            return {
                databaseId: dbId,
                title: dbTitle,
                entries: [{
                    properties: {
                        Name: { title: [{ text: { content: meetingTitle } }] }
                    }
                }]
            }
        })
    }

}
