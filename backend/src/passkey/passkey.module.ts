import { Module } from '@nestjs/common';
import { PasskeyController } from './passkey.controller';
import { PasskeyService } from './passkey.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PasskeyController],
  providers: [PasskeyService, PrismaService],
})
export class PasskeyModule {}