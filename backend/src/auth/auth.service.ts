import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Wrong password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async register(email: string, password: string, name: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    return {
      message: 'User registered successfully',
      userId: user.id,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // biar aman, jangan kasih tahu email ada/tidak
    if (!user) {
      return {
        message: 'If the email exists, reset link has been generated',
      };
    }

    const token = randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const resetLink = `http://localhost:3001/reset-password?token=${token}`;

    console.log('RESET LINK:', resetLink);

    return {
      message: 'Reset link generated',
      resetLink, // nanti kalau sudah pakai email, ini jangan di-return
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid reset token');
    }

    if (resetToken.used) {
      throw new BadRequestException('Reset token already used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
      },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        used: true,
      },
    });

    return {
      message: 'Password reset successfully',
    };
  }
}