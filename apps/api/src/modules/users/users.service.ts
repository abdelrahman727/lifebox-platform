import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userData: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    roleId: string;
    clientId?: string;
  }) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    return this.prisma.user.create({
      data: {
        ...userData,
        passwordHash: hashedPassword,
        isActive: true,
      },
      include: {
        role: true,
        client: true,
      },
    });
  }

  async findAll(filter?: {
    roleId?: string;
    clientId?: string;
    isActive?: boolean;
  }) {
    return this.prisma.user.findMany({
      where: filter,
      include: {
        role: true,
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        client: true,
        deviceAssignments: {
          where: { isActive: true },
          include: {
            device: true,
          },
        },
        commandPermissions: {
          where: { isActive: true },
          include: {
            commandPermission: true,
            grantedByUser: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateData: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
      delete updateData.password;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        client: true,
      },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by setting isActive to false
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        client: true,
      },
    });
  }
}