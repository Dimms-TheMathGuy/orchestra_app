import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GetDatabaseResponse } from '@notionhq/client';
import axios from 'axios';

export type GeminiPropertySummary = {
    name: string;
    type: string;
    options?: string[];
};

export type GeminiDatabaseContext = {
    databaseId: string;
    title: string;
    properties: GeminiPropertySummary[];
};

@Injectable()
export class NotionService {

    // initialize notion SDK client : this creates a live Notion SDK client. if success, it's ready to make API calls
    private notionClient: Client;

    constructor(private configService: ConfigService) {
        this.notionClient = new Client({
            auth: this.configService.get<string>('NOTION_API_KEY'),
        });
    }


    estimateSize(payload: unknown): number{
        return JSON.stringify(payload).length;
    }

    normalizeSchema(schema: any): GeminiDatabaseContext{
        return{
            databaseId: schema.id,
            title: schema.title?.[0]?.plain_text ?? '',
            properties: Object.entries(schema.properties ?? {}).map(([name, prop]: any) => ({
                name,
                type: prop.type,
                options: prop.type == 'select' || prop.type === 'status' || prop.type === 'multi_select' ? prop[prop.type]?.options?.map((option: any) => option.name) ?? []: undefined,
            })),
        };
    }

    async fetchAllDatabaseSchema(databaseIds: string[]) {
        const schemas: GeminiDatabaseContext[] = [];

        const apiKey = this.configService.get<string>('NOTION_API_KEY');

        try {
            for (const id of databaseIds) {
                const res = await axios.get(`https://api.notion.com/v1/databases/${id}`, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Notion-Version': '2022-06-28',
                    },
                });

                const compactSchema = this.normalizeSchema(res.data);

                if (this.estimateSize(compactSchema) > 10000) {
                    throw new Error('Schema is too large for Gemini: upgrade to premium to connect large notion templates')
                }

                schemas.push(compactSchema);
            }
        } catch (error) {
            console.error('DATABASE SCHEMA ERROR:', error);
            throw new NotFoundException(' Invalid Database ID : Database Not Found');
        }

        return schemas;
    }

    async fetchBlockChildren(blockId: string) {
        let databaseIds: string[] = [];
        try {
            const response = await this.notionClient.blocks.children.list({ block_id: blockId });
            console.log('BLOCKS FOUND:', JSON.stringify(response.results, null, 2));
            const dbBlocks = response.results.filter((x) => 'type' in x && x.type === "child_database"); // Check that 'type' exists in the object before comparing its value, cause the response can be PartialBlockObjectResponse that has no 'type'
            console.log('DB BLOCKS:', dbBlocks.length);
            const ids = dbBlocks.map((x) => x.id);
            databaseIds.push(...ids);
        } catch (error) {
            console.error('BLOCK CHILDREN ERROR:', error);
            throw new NotFoundException('Invalid Block ID : Page Not Found');
        }

        const schemasContext = await this.fetchAllDatabaseSchema(databaseIds);

        return schemasContext;
    }

    // Types that require Notion user IDs — cannot be set from plain text, skip them
    private readonly UNSUPPORTED_TYPES = new Set(['people', 'files', 'relation', 'rollup', 'formula', 'created_by', 'last_edited_by', 'created_time', 'last_edited_time']);

    buildPropertyPayload(propertyType: string, value: unknown): Record<string, unknown> | null {
        if (this.UNSUPPORTED_TYPES.has(propertyType)) return null;

        // If value is already Notion-native format, pass through
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const keys = Object.keys(value as Record<string, unknown>);
            const notionTypeKeys = ['title', 'rich_text', 'number', 'date', 'select', 'multi_select', 'status', 'checkbox', 'url', 'email', 'phone_number'];
            if (keys.length > 0 && notionTypeKeys.includes(keys[0])) {
                return value as Record<string, unknown>;
            }
        }

        switch (propertyType) {
            case 'title':
                return { title: [{ text: { content: String(value ?? '') } }] };
            case 'rich_text':
                return { rich_text: [{ text: { content: String(value ?? '') } }] };
            case 'number':
                return { number: Number(value) || 0 };
            case 'date':
                return { date: { start: String(value ?? '') } };
            case 'select':
                return { select: { name: String(value ?? '') } };
            case 'multi_select': {
                const items = Array.isArray(value) ? value : String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);
                return { multi_select: items.map((name: string) => ({ name: String(name) })) };
            }
            case 'status':
                return { status: { name: String(value ?? '') } };
            case 'checkbox':
                return { checkbox: Boolean(value) };
            case 'url':
                return { url: String(value ?? '') };
            case 'email':
                return { email: String(value ?? '') };
            case 'phone_number':
                return { phone_number: String(value ?? '') };
            default:
                return { rich_text: [{ text: { content: String(value ?? '') } }] };
        }
    }

    convertDraftProperties(
        rawProperties: Record<string, unknown>,
        schema: GeminiPropertySummary[],
    ): Record<string, unknown> {
        const converted: Record<string, unknown> = {};
        const schemaMap = new Map(schema.map(p => [p.name, p.type]));

        for (const [propName, propValue] of Object.entries(rawProperties)) {
            const propType = schemaMap.get(propName);
            if (!propType) continue; // skip properties not in schema (AI hallucinations)
            const payload = this.buildPropertyPayload(propType, propValue);
            if (payload !== null) {
                converted[propName] = payload;
            }
            // null = unsupported type (e.g. people) — silently skip
        }

        return converted;
    }

    /**
     * Resolve a configured Notion id into concrete database ids.
     * The project may store either a database id directly, or a page/block id
     * that *contains* child databases (the AI Note Taker template pattern).
     */
    async resolveDatabaseIds(idOrPageId: string): Promise<string[]> {
        const apiKey = this.configService.get<string>('NOTION_API_KEY');

        // First: is it a database on its own?
        try {
            await axios.get(`https://api.notion.com/v1/databases/${idOrPageId}`, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Notion-Version': '2022-06-28',
                },
            });
            return [idOrPageId];
        } catch {
            // Not a database — fall through and treat as a page/block
        }

        // Otherwise treat it as a page/block and collect its child databases
        try {
            const response = await this.notionClient.blocks.children.list({ block_id: idOrPageId });
            return response.results
                .filter((x: any) => 'type' in x && x.type === 'child_database')
                .map((x: any) => x.id);
        } catch (error) {
            console.error('RESOLVE DATABASE IDS ERROR:', error);
            return [];
        }
    }

    /** Map a raw Notion status/select name to one of: todo | in_progress | done. */
    normalizeStatusGroup(statusName?: string | null): 'todo' | 'in_progress' | 'done' {
        const s = (statusName ?? '').toLowerCase().trim();
        if (!s) return 'todo';
        if (/(done|complete|closed|finished|shipped|merged)/.test(s)) return 'done';
        if (/(progress|review|doing|wip|testing|qa|ongoing|active)/.test(s)) return 'in_progress';
        return 'todo';
    }

    /**
     * Query a Notion task database and extract a flat task list.
     * For each page we pull: title, status (first status/select prop), and assignees
     * (first people prop — emails only present if the integration can read user info).
     */
    async queryDatabaseTasks(databaseId: string) {
        const tasks: {
            notionPageId: string;
            title: string;
            status: string | null;
            statusGroup: 'todo' | 'in_progress' | 'done';
            assigneeEmails: string[];
            assigneeNames: string[];
            url: string | null;
            dueDate: string | null;
        }[] = [];

        const apiKey = this.configService.get<string>('NOTION_API_KEY');

        try {
            let cursor: string | undefined = undefined;
            do {
                const response = await axios.post(
                    `https://api.notion.com/v1/databases/${databaseId}/query`,
                    { start_cursor: cursor, page_size: 100 },
                    {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Notion-Version': '2022-06-28',
                        },
                    },
                );

                const res: any = response.data;

                for (const page of res.results) {
                    if (!('properties' in page)) continue;
                    const props: Record<string, any> = page.properties;

                    let title = '';
                    let status: string | null = null;
                    let dueDate: string | null = null;
                    const assigneeEmails: string[] = [];
                    const assigneeNames: string[] = [];

                    for (const value of Object.values(props)) {
                        switch (value?.type) {
                            case 'title':
                                if (!title) {
                                    title = (value.title ?? []).map((t: any) => t.plain_text).join('');
                                }
                                break;
                            case 'status':
                                if (status === null) status = value.status?.name ?? null;
                                break;
                            case 'select':
                                // Use a select only if we haven't found a real status property
                                if (status === null) status = value.select?.name ?? null;
                                break;
                            case 'date':
                                // First date property is treated as the task's deadline
                                if (dueDate === null) dueDate = value.date?.start ?? null;
                                break;
                            case 'people':
                                for (const person of value.people ?? []) {
                                    if (person?.name) assigneeNames.push(person.name);
                                    const email = person?.person?.email;
                                    if (email) assigneeEmails.push(email);
                                }
                                break;
                        }
                    }

                    tasks.push({
                        notionPageId: page.id,
                        title: title || 'Untitled task',
                        status,
                        statusGroup: this.normalizeStatusGroup(status),
                        assigneeEmails,
                        assigneeNames,
                        url: page.url ?? null,
                        dueDate,
                    });
                }

                cursor = res.has_more ? res.next_cursor : undefined;
            } while (cursor);
        } catch (error: any) {
            console.error('NOTION TASK QUERY ERROR:', error?.body ?? error?.message ?? error);
            throw new BadRequestException(
                error?.message || 'Failed to query Notion task database',
            );
        }

        return tasks;
    }

    async createPage(databaseId: string, properties: any) {
        try {
            await this.notionClient.pages.create({ parent: { database_id: databaseId }, properties: properties });
        } catch (error: any) {
            console.error(error); // This will print Notion's actual complaint to Nest.js server terminal
            throw new BadRequestException(error.message || 'Failed to create page in Notion');
        }
    }

    buildCompletionProperties(
        propertyName: string,
        propertyType: string,
        completionValue: unknown,
    ) {
        switch (propertyType) {
            case 'checkbox':
                return {
                    [propertyName]: {
                        checkbox: Boolean(completionValue),
                    },
                };
            case 'status':
                return {
                    [propertyName]: {
                        status: {
                            name: String(completionValue),
                        },
                    },
                };
            case 'select':
                return {
                    [propertyName]: {
                        select: {
                            name: String(completionValue),
                        },
                    },
                };
            default:
                throw new BadRequestException(`Unsupported Notion completion property type: ${propertyType}`);
        }
    }

    async updatePageProperties(pageId: string, properties: any) {
        try {
            await this.notionClient.pages.update({
                page_id: pageId,
                properties,
            });
        } catch (error: any) {
            console.error(error);
            throw new BadRequestException(error.message || 'Failed to update page in Notion');
        }
    }

    async markTaskComplete(
        pageId: string,
        propertyName: string,
        propertyType: string,
        completionValue: unknown,
    ) {
        const properties = this.buildCompletionProperties(
            propertyName,
            propertyType,
            completionValue,
        );

        await this.updatePageProperties(pageId, properties);
    }

    /**
     * Push an "in progress" value to the same completion property when work
     * starts on the linked branch. Uses the identical property builder as
     * completion — the only difference is the value written.
     */
    async markTaskInProgress(
        pageId: string,
        propertyName: string,
        propertyType: string,
        inProgressValue: unknown,
    ) {
        const properties = this.buildCompletionProperties(
            propertyName,
            propertyType,
            inProgressValue,
        );

        await this.updatePageProperties(pageId, properties);
    }

}
