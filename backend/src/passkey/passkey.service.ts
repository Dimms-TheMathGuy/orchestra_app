import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PasskeyService {
  constructor(private readonly prisma: PrismaService) {}

  private rpName = 'Orchestra';
  private rpID = 'localhost';
  private origin = 'http://localhost:3000';

  async generateRegisterOptions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: user.email,
      userDisplayName: user.name,
      excludeCredentials: user.passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports
          ? (passkey.transports.split(',') as AuthenticatorTransportFuture[])
          : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentChallenge: options.challenge },
    });

    return options;
  }

  async verifyRegister(userId: string, body: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.currentChallenge) {
      throw new ForbiddenException('Challenge not found');
    }

    const verification = await verifyRegistrationResponse({
      response: body,
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
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: body.response?.transports?.join(',') ?? null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentChallenge: null },
    });

    return { verified: true };
  }

  async generateAuthOptions(userId: string) {
    const passkeys = await this.prisma.passkey.findMany({
      where: { userId },
    });

    if (passkeys.length === 0) {
      throw new ForbiddenException('No passkey registered');
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports
          ? (passkey.transports.split(',') as AuthenticatorTransportFuture[])
          : undefined,
      })),
      userVerification: 'preferred',
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { currentChallenge: options.challenge },
    });

    return options;
  }

  async verifyAuth(userId: string, body: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.currentChallenge) {
      throw new ForbiddenException('Challenge not found');
    }

    const passkey = await this.prisma.passkey.findUnique({
      where: { credentialId: body.id },
    });

    if (!passkey || passkey.userId !== userId) {
      throw new ForbiddenException('Invalid passkey');
    }

    const credentialPublicKey = Uint8Array.from(passkey.publicKey);

    const credentialTransports = passkey.transports
    ? (passkey.transports.split(',') as AuthenticatorTransportFuture[])
    : undefined;

    const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: user.currentChallenge,
    expectedOrigin: this.origin,
    expectedRPID: this.rpID,
    credential: {
        id: passkey.credentialId,
        publicKey: credentialPublicKey,
        counter: passkey.counter,
        transports: credentialTransports,
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
      where: { id: userId },
      data: { currentChallenge: null },
    });

    return { verified: true };
  }
}