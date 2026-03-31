import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GetDatabaseResponse } from '@notionhq/client';

type GeminiPropertySummary = {
    name: string;
    type: string;
    options?: string[];
};

type GeminiDatabaseContext = {
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
            properties: Object.entries(schema.properties).map(([name, prop]: any) => ({
                name,
                type: prop.type,
                options: prop.type == 'select' || prop.type === 'status' || prop.type === 'multi_select' ? prop[prop.type]?.options?.map((option: any) => option.name) ?? []: undefined,
            })),
        };
    }

    async fetchAllDatabaseSchema(databaseIds: string[]) {
        const schemas: GeminiDatabaseContext[] = [];  // the type of var must be suitable with the return type of the method called

        try {
            for (const id of databaseIds) {
                const rawSchema = await this.notionClient.databases.retrieve({ database_id: id });
                const compactSchema = this.normalizeSchema(rawSchema);

                if (this.estimateSize(compactSchema) > 10000) {
                    throw new Error('Schema is too large for Gemini: upgrade to premium to connect large notion templates')
                }
                
                schemas.push(compactSchema);
            }
        } catch (error) {
            throw new NotFoundException(' Invalid Database ID : Database Not Found');
        }

        return schemas;
    }

    async fetchBlockChildren(blockId: string) {
        let databaseIds: string[] = [];
        try {
            const response = await this.notionClient.blocks.children.list({ block_id: blockId });
            const dbBlocks = response.results.filter((x) => 'type' in x && x.type === "child_database"); // Check that 'type' exists in the object before comparing its value, cause the response can be PartialBlockObjectResponse that has no 'type'
            const ids = dbBlocks.map((x) => x.id);
            databaseIds.push(...ids);
        } catch (error) {
            throw new NotFoundException('Invalid Block ID : Page Not Found');
        }

        const schemasContext = await this.fetchAllDatabaseSchema(databaseIds);

        return schemasContext;
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
