import { BadGatewayException, Injectable } from '@nestjs/common'
import Groq from 'groq-sdk'
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

    private getClient(): Groq {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new BadGatewayException('GROQ_API_KEY is not configured');
        }
        return new Groq({ apiKey });
    }

    async summarize(text: string, schemaContext: unknown): Promise<DatabaseDraft[]> {
        if (process.env.MOCK_GEMINI === 'true') {
            return this.mockSummarize(schemaContext, text);
        }

        const client = this.getClient();

        const prompt = `You are an AI note taker that creates editable Notion draft data.
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
${text}`;

        const completion = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
        });

        const rawResponse = completion.choices[0]?.message?.content?.trim() ?? '';

        if (!rawResponse) {
            throw new BadGatewayException('AI returned an empty response');
        }

        const cleanResponse = this.stripCodeFence(rawResponse);
        let parsedDrafts: unknown;

        try {
            parsedDrafts = JSON.parse(cleanResponse);
        } catch {
            throw new BadGatewayException('AI returned invalid JSON draft');
        }

        const validatedDrafts = databaseDraftListSchema.safeParse(parsedDrafts);

        if (!validatedDrafts.success) {
            throw new BadGatewayException('AI returned a draft with an unexpected shape');
        }

        return validatedDrafts.data;
    }

    async quickSummarize(text: string, lang = 'en'): Promise<{ summary: string; keyDecisions: string[] }> {
        if (process.env.MOCK_GEMINI === 'true') {
            return {
                summary: 'The team discussed project progress, upcoming deadlines, and assigned responsibilities for the next sprint.',
                keyDecisions: [
                    'Launch new dashboard by end of sprint',
                    'Fix authentication bug before next release',
                    'Schedule follow-up meeting next Thursday',
                ],
            };
        }

        const client = this.getClient();
        const langInstruction = lang === 'id'
            ? 'Respond entirely in Indonesian (Bahasa Indonesia).'
            : 'Respond entirely in English.';
        const prompt = `You are an AI meeting summarizer. ${langInstruction}
Return a JSON object with exactly two fields:
{
  "summary": "A concise 2-4 sentence summary of the meeting",
  "keyDecisions": ["Decision or action item 1", "Decision or action item 2", ...]
}

Return valid JSON only. No markdown, no code fences, no extra text.
Extract the 3-7 most important decisions or action items from this transcript.

Transcript:
${text}`;

        const completion = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
        });

        const rawResponse = completion.choices[0]?.message?.content?.trim() ?? '';
        const cleanResponse = this.stripCodeFence(rawResponse);

        try {
            const parsed = JSON.parse(cleanResponse);
            return {
                summary: String(parsed.summary ?? ''),
                keyDecisions: Array.isArray(parsed.keyDecisions)
                    ? parsed.keyDecisions.map(String)
                    : [],
            };
        } catch {
            throw new BadGatewayException('AI returned invalid JSON for quick summary');
        }
    }

    // Mock to unblock demos when external API quota/credentials are unavailable
    private mockSummarize(schemaContext: any, transcriptText: string): DatabaseDraft[] {
        const contexts: Array<{ databaseId?: string; title?: string }> = Array.isArray(schemaContext) ? schemaContext : []

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
