import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';

@Injectable()
export class NotionService {

    // initialize notion SDK client : this creates a live Notion SDK client. if success, it's ready to make API calls
    private notionClient: Client;

    constructor(private configService : ConfigService) {
        this.notionClient = new Client({
            auth: this.configService.get<string>('NOTION_API_KEY'),  
        });
    }

    async getDatabaseSchema(databaseId:string) {
        try{
            const databaseSchema = await this.notionClient.databases.retrieve({database_id: databaseId});
            return databaseSchema; 
        }catch (error){
            throw new Error('failed to read the schema of the template');
        }   
    }

    async createPage(databaseId:string, properties:any){
        try{
            await this.notionClient.pages.create({parent : {database_id: databaseId}, properties: properties});
        }catch(error){
            throw new Error('failed to generate notion content');
        }
    }


}
