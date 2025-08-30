// src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
} from '../../common/dto/auth.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, request?: any) {
    // Validate input data
    if (!loginDto || !loginDto.email || !loginDto.password) {
      throw new UnauthorizedException('Email and password are required');
    }

    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, client: true },
    });

    if (!user || !user.isActive) {
      if (user) {
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            actionType: 'LOGIN_FAILED',
            resourceType: 'AUTH',
            details: { reason: 'account_inactive' },
            ipAddress: request?.ip,
            userAgent: request?.headers?.['user-agent'],
          },
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          actionType: 'LOGIN_FAILED',
          resourceType: 'AUTH',
          details: { reason: 'invalid_password' },
          ipAddress: request?.ip,
          userAgent: request?.headers?.['user-agent'],
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        actionType: 'LOGIN_SUCCESS',
        resourceType: 'AUTH',
        details: {
          email: user.email,
          role: user.role.name,
        },
        ipAddress: request?.ip,
        userAgent: request?.headers?.['user-agent'],
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
        client: user.client
          ? {
              id: user.client.id,
              name: user.client.name,
              organizationName: user.client.organizationName,
            }
          : null,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Validate input data
    if (!registerDto || !registerDto.email || !registerDto.password || !registerDto.fullName) {
      throw new ConflictException('Email, password, and fullName are required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Use provided role or default to 'viewer'
    const roleName = registerDto.role || 'viewer';
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error(`Role '${roleName}' not found. Please run database seed.`);
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        fullName: registerDto.fullName,
        phone: registerDto.phone,
        clientId: registerDto.clientId,
        roleId: role.id,
      },
      include: { role: true },
    });

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); 

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    console.log(
      `Password reset link: ${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    );

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        actionType: 'PASSWORD_RESET_REQUEST',
        resourceType: 'AUTH',
        details: { email },
      },
    });

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: resetToken.userId,
        actionType: 'PASSWORD_RESET_COMPLETE',
        resourceType: 'AUTH',
        details: { tokenId: resetToken.id },
      },
    });

    return {
      message: 'Password has been reset successfully',
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(user: any) {
    const permissions = await this.prisma.rolePermission.findMany({
      where: { roleId: user.roleId },
      select: {
        resource: true,
        action: true,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      clientId: user.clientId,
      permissions: permissions.map((p) => `${p.resource}:${p.action}`),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '30d',
      }),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); 

    const existingTokens = await this.prisma.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: 4, 
    });

    if (existingTokens.length > 0) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          id: { in: existingTokens.map((t) => t.id) },
        },
      });
    }

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.sub,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: {
            include: { role: true, client: true },
          },
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = {
        sub: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role.name,
        clientId: storedToken.user.clientId,
      };

      const accessToken = await this.jwtService.signAsync(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out successfully' };
  }
}
