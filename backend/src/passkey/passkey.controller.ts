import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { PrismaService } from '../prisma/prisma.service';

@Controller('passkey')
export class PasskeyController {
  constructor(private prisma: PrismaService) {}

  rpName = 'Orchestra';
  rpID = 'localhost';
  origin = 'http://localhost:3000';

  @Post('register/options')
  async registerOptions(@Req() req: any) {
    // SEMENTARA TESTING:
    // nanti ganti ini dari user login/JWT
    const userId = 'test-user-id';

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Buffer.from(userId),
      userName: 'testuser@orchestra.com',
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    req.session.challenge = options.challenge;
    req.session.userId = userId;

    return options;
  }

  @Post('register/verify')
  async registerVerify(@Req() req: any, @Body() body: any) {
    const expectedChallenge = req.session.challenge;
    const userId = req.session.userId;

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { verified: false };
    }

    const { credential } = verification.registrationInfo;

    await this.prisma.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter,
      },
    });

    return { verified: true };
  }

  @Post('auth/options')
  async authOptions(@Req() req: any) {
    const userId = 'test-user-id';

    const passkeys = await this.prisma.passkey.findMany({
      where: { userId },
    });

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
      allowCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId,
        type: 'public-key',
      })),
    });

    req.session.challenge = options.challenge;
    req.session.userId = userId;

    return options;
  }

  @Post('auth/verify')
  async authVerify(@Req() req: any, @Body() body: any) {
    const userId = req.session.userId;

    const passkey = await this.prisma.passkey.findFirst({
      where: {
        userId,
        credentialId: body.id,
      },
    });

    if (!passkey) {
      return { verified: false };
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: req.session.challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: Buffer.from(passkey.publicKey, 'base64'),
        counter: passkey.counter,
      },
    });

    if (!verification.verified) {
      return { verified: false };
    }

    await this.prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
      },
    });

    return { verified: true };
  }
}