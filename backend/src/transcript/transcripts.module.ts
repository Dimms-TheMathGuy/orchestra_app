import { Module } from '@nestjs/common';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptsService } from './transcripts.service';
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], 
  controllers: [TranscriptsController],
  providers: [TranscriptsService],
})
export class TranscriptsModule {}