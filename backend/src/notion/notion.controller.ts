import { Controller, Get, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { NotionService } from './notion.service';
import { createPageSchema } from './dto/create-page.dto';


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
    async createPage(@Body() body: unknown) {
        // @Body extracts the JSON body from the request
        try{
            const validated = createPageSchema.parse(body);
            return this.notionService.createPage(validated.databaseId, validated.properties);
        }catch(error){
            throw new BadRequestException(error.errors);
        }
    }
}