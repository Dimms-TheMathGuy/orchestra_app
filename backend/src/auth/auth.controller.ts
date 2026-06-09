import { BadRequestException, Controller, Post, Body, Get, Query, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import type { Response, Request } from 'express';
import axios from 'axios';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private prisma: PrismaService) {}
  
  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  async register(@Body() body: any) {
    console.log("Register Masuk:", body);

    return this.authService.register(
      body.email,
      body.password,
      body.name,
    );
  }

  @Get('github')
  redirectToGithub(@Query('userId') userId: string, @Res() res: Response) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const url =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${process.env.GITHUB_CLIENT_ID}` +
      `&scope=repo,admin:repo_hook,read:user` +
      `&state=${encodeURIComponent(userId)}`;

    return res.redirect(url);
  }

  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    if (!userId) {
      throw new BadRequestException('Missing GitHub OAuth state');
    }

    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } },
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get(
      'https://api.github.com/user',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const githubUser = userResponse.data;

    await this.prisma.user.update({
      where: { id: userId }, 
      data: {
        githubId: Number(githubUser.id),
        githubUsername: githubUser.login,
        githubToken: accessToken,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/dashboard/settings?github=connected`);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(
    @Body() body: { token: string; newPassword: string },
  ) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}
