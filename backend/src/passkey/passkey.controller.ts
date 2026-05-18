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

// // test endpoint
// import { Body, Controller, Post } from '@nestjs/common';
// import { PasskeyService } from './passkey.service';

// @Controller('passkey')
// export class PasskeyController {
//   constructor(private readonly passkeyService: PasskeyService) {}

//   @Post('register/options')
//   async generateRegisterOptions(@Body() body: any) {
//     return this.passkeyService.generateRegisterOptions(body.userId);
//   }

//   @Post('register/verify')
//   async verifyRegister(@Body() body: any) {
//     return this.passkeyService.verifyRegister(body.userId, body.response);
//   }

//   @Post('auth/options')
//   async generateAuthOptions(@Body() body: any) {
//     return this.passkeyService.generateAuthOptions(body.userId);
//   }

//   @Post('auth/verify')
//   async verifyAuth(@Body() body: any) {
//     return this.passkeyService.verifyAuth(body.userId, body.response);
//   }
// }