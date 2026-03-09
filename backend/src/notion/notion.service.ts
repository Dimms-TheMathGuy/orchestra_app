import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GetDatabaseResponse } from '@notionhq/client';

@Injectable()
export class NotionService {

    // initialize notion SDK client : this creates a live Notion SDK client. if success, it's ready to make API calls
    private notionClient: Client;

    constructor(private configService: ConfigService) {
        this.notionClient = new Client({
            auth: this.configService.get<string>('NOTION_API_KEY'),
        });
    }

    async fetchAllDatabaseSchema(databaseIds: string[]) {
        let schemas: GetDatabaseResponse[] = [];  // the type of var must be suitable with the return type of the method called

        try {
            for (const id of databaseIds) {
                const schema = await this.notionClient.databases.retrieve({ database_id: id });
                schemas.push(schema);
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
            const dbBlocks = response.results.filter((x) => 'type' in x && x.type === "child_database"); // Check that 'type' exists on the object before comparing its value, cause the response can be PartialBlockObjectResponse that has no 'type'
            const ids = dbBlocks.map((x) => x.id);
            databaseIds.push(...ids);
        } catch (error) {
            throw new NotFoundException('Invalid Block ID : Page Not Found');
        }

        const schemas = await this.fetchAllDatabaseSchema(databaseIds);

        return schemas;
    }

    async createPage(databaseId: string, properties: any) {
        try {
            await this.notionClient.pages.create({ parent: { database_id: databaseId }, properties: properties });
        } catch (error: any) {
            console.error(error); // This will print Notion's actual complaint to Nest.js server terminal
            throw new BadRequestException(error.message || 'Failed to create page in Notion');
        }
    }


}
