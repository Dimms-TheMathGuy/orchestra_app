import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {

  constructor(private prisma: PrismaService) {}

  async getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async updateUser(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl,
        email: data.email,
        company: data.company,
      },
    });
  }catch (error) {
    console.error("ERROR UPDATE USER:", error)
    throw error
  }

}