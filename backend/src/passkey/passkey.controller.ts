import { Body, Controller, Post, Req } from '@nestjs/common';
import { PasskeyService } from './passkey.service';

@Controller('passkey')
export class PasskeyController {
  constructor(private readonly passkeyService: PasskeyService) {}

  @Post('register/options')
  async generateRegisterOptions(@Req() req: any) {
    const userId = req.user.id;
    return this.passkeyService.generateRegisterOptions(userId);
  }

  @Post('register/verify')
  async verifyRegister(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;
    return this.passkeyService.verifyRegister(userId, body);
  }

  @Post('auth/options')
  async generateAuthOptions(@Req() req: any) {
    const userId = req.user.id;
    return this.passkeyService.generateAuthOptions(userId);
  }

  @Post('auth/verify')
  async verifyAuth(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;
    return this.passkeyService.verifyAuth(userId, body);
  }
}