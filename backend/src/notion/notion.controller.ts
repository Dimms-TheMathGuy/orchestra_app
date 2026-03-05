import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { NotionService } from './notion.service';

@Controller('notion')
// all routes start with /notion
export class NotionController {
    constructor(private notionService: NotionService){}

    @Get('schema/:databaseId')
    // GET /notion/schema/:databaseId  -> take the database/notion page id from url
    async getSchema(@Param('databaseId') databaseId: string){
        // @Param extracts :id from the URL
        return this.notionService.getDatabaseSchema(databaseId);
    }

    @Post()
    //POST /notion
    async createPage(@Body('databaseId') databaseId: string, @Body('properties') properties: any){
        // @Body extracts the JSON body from the request
        return this.notionService.createPage(databaseId, properties);
    }
}
