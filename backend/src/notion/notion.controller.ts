import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { NotionService } from './notion.service';

@Controller('notion')
// all routes start with /notion
export class NotionController {
    constructor(private notionService: NotionService) { }

    @Get('schema/:id')
    // GET /notion/schema/:id  -> take the block_ids from url
    async getSchema(@Param('id') block_id: string) {
        // @Param extracts :id from the URL
        return this.notionService.fetchBlockChildren(block_id);
    }

    @Post()
    //POST /notion
    async createPage(@Body('databaseId') databaseId: string, @Body('properties') properties: any) {
        // @Body extracts the JSON body from the request
        return this.notionService.createPage(databaseId, properties);
    }
}