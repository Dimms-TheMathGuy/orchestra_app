import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GetDatabaseResponse } from '@notionhq/client';

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
                const res = await fetch(`https://api.notion.com/v1/databases/${id}`, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Notion-Version': '2022-06-28',
                    },
                });

                if (!res.ok) {
                    throw new Error(`Notion API error ${res.status}`);
                }

                const rawSchema = await res.json();
                const compactSchema = this.normalizeSchema(rawSchema);

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

}
