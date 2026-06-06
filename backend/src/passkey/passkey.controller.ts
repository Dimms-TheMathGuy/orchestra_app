import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
  origin = 'http://localhost:3001';

  @Get('status/:userId')
  async getPasskeyStatus(@Param('userId') userId: string) {
    const count = await this.prisma.passkey.count({
      where: { userId },
    });

    return { hasPasskey: count > 0 };
  }

  @Post('register/options')
  async registerOptions(@Body() body: any) {
    console.log('BODY REGISTER OPTIONS:', body);

    const userId = body?.userId;

    if (!userId) {
      return {
        error: 'userId is required',
        bodyReceived: body,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });

    if (!user) {
      return { error: 'User not found' };
    }

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Buffer.from(user.id),
      userName: user.email,
      userDisplayName: user.name ?? user.email,
      attestationType: 'none',
      excludeCredentials: user.passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports
          ? (passkey.transports.split(',') as any)
          : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge },
    });

    return options;
  }

  @Post('register/verify')
  async registerVerify(
    @Body() body: { userId: string; response: any },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: body.userId },
    });

    if (!user || !user.currentChallenge) {
      return { verified: false, error: 'Challenge not found' };
    }

    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { verified: false };
    }

    const { credential } = verification.registrationInfo;

    await this.prisma.passkey.create({
      data: {
        userId: user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter,
        transports: body.response.response?.transports?.join(',') ?? null,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: null,
      },
    });

    return { verified: true };
  }

 @Post('auth/options')
  async authOptions(@Body() body: any) {
    console.log('BODY AUTH OPTIONS:', body);

    const userId = body?.userId;

    if (!userId) {
      return {
        error: 'userId is required',
        bodyReceived: body,
      };
    }

    const passkeys = await this.prisma.passkey.findMany({
      where: { userId },
    });

    if (passkeys.length === 0) {
      return { error: 'No passkey registered' };
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
      allowCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports
          ? (passkey.transports.split(',') as any)
          : undefined,
      })),
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentChallenge: options.challenge,
      },
    });

    return options;
  }

  @Post('auth/verify')
  async authVerify(@Body() body: any) {
    console.log('BODY AUTH VERIFY:', body);

    const userId = body?.userId;
    const response = body?.response;

    if (!userId || !response) {
      return {
        verified: false,
        error: 'userId and response are required',
        bodyReceived: body,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.currentChallenge) {
      return { verified: false, error: 'Challenge not found' };
    }

    const passkey = await this.prisma.passkey.findFirst({
      where: {
        userId: user.id,
        credentialId: response.id,
      },
    });

    if (!passkey) {
      return { verified: false, error: 'Passkey not found' };
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: Buffer.from(passkey.publicKey, 'base64'),
        counter: passkey.counter,
        transports: passkey.transports
          ? (passkey.transports.split(',') as any)
          : undefined,
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: null,
      },
    });

    return { verified: true };
  }
}