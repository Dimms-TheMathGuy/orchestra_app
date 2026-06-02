import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {

  constructor(private prisma: PrismaService) {}

  async searchUsersByEmail(email?: string) {
    const query = email?.trim()

    if (!query || query.length < 2) {
      return []
    }

    return this.prisma.user.findMany({
      where: {
        email: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        company: true,
      },
      take: 10,
      orderBy: {
        email: 'asc',
      },
    });
  }

  async getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        company: true,
        githubUsername: true,
      },
    });
  }

  async updateUser(id: string, data: any) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: data.name,
          avatarUrl: data.avatarUrl,
          company: data.company,
        },
      });
    } catch (error) {
      console.error("ERROR UPDATE USER:", error)
      throw error
    }
  }

}
