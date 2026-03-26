import { Controller, Post, Body, Get, Query, Res, Req } from '@nestjs/common';
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
    return this.authService.register(
      body.email,
      body.password,
      body.name,
    );
  }

  @Get('github')
  redirectToGithub(@Res() res: Response) {
    const url =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${process.env.GITHUB_CLIENT_ID}` +
      `&scope=repo,admin:repo_hook,read:user`;

    return res.redirect(url);
  }

  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
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
    const currentUserId = (req as any).user.id;

    await this.prisma.user.update({
      where: { id: currentUserId }, 
      data: {
        githubId: githubUser.id.toString(),
        githubUsername: githubUser.login,
        githubToken: accessToken,
      },
    });

    return res.send('GitHub connected successfully');
  }
}