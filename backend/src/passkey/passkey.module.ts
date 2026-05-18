import { Module } from '@nestjs/common';
import { PasskeyController } from './passkey.controller';
import { PasskeyService } from './passkey.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PasskeyController],
  providers: [PasskeyService, PrismaService],
})
export class PasskeyModule {}