import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/database/prisma.service';
import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuditLogData {
  userId?: string;
  deviceId?: string;
  clientId?: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  details?: any;
  changes?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category?: 'user_action' | 'system' | 'security' | 'device_control';
  isSuccessful?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log any action in the system
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          deviceId: data.deviceId || null,
          clientId: data.clientId || null,
          actionType: data.actionType,
          resourceType: data.resourceType,
          resourceId: data.resourceId || null,
          endpoint: data.endpoint || null,
          method: data.method || null,
          statusCode: data.statusCode || null,
          duration: data.duration || null,
          details: data.details || null,
          changes: data.changes || null,
          metadata: data.metadata || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          sessionId: data.sessionId || null,
          severity: data.severity || 'info',
          category: data.category || 'user_action',
          isSuccessful: data.isSuccessful !== false, // Default to true unless explicitly false
          errorMessage: data.errorMessage || null,
        },
      });
    } catch (error) {
      // Don't let audit logging failures break the main operation
      this.logger.error('Failed to create audit log', error);
    }
  }

  /**
   * Log user actions with request context
   */
  async logUserAction(
    user: User,
    actionType: string,
    resourceType: string,
    request: Request,
    options: Partial<AuditLogData> = {}
  ): Promise<void> {
    await this.log({
      userId: user.id,
      clientId: user.clientId,
      actionType,
      resourceType,
      endpoint: request.route?.path || request.url,
      method: request.method,
      ipAddress: this.extractIpAddress(request),
      userAgent: request.get('User-Agent'),
      sessionId: this.extractSessionId(request),
      category: 'user_action',
      ...options,
    });
  }

  /**
   * Log device-specific actions
   */
  async logDeviceAction(
    user: User | null,
    deviceId: string,
    actionType: string,
    request?: Request,
    options: Partial<AuditLogData> = {}
  ): Promise<void> {
    // Get device to determine clientId
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { clientId: true },
    });

    await this.log({
      userId: user?.id || null,
      deviceId,
      clientId: device?.clientId || user?.clientId || null,
      actionType,
      resourceType: 'DEVICE',
      resourceId: deviceId,
      endpoint: request?.route?.path || request?.url,
      method: request?.method,
      ipAddress: request ? this.extractIpAddress(request) : null,
      userAgent: request?.get('User-Agent'),
      sessionId: request ? this.extractSessionId(request) : null,
      category: 'device_control',
      ...options,
    });
  }

  /**
   * Log system actions (automated processes)
   */
  async logSystemAction(
    actionType: string,
    resourceType: string,
    options: Partial<AuditLogData> = {}
  ): Promise<void> {
    await this.log({
      actionType,
      resourceType,
      category: 'system',
      severity: 'info',
      ...options,
    });
  }

  /**
   * Log security-related events
   */
  async logSecurityEvent(
    actionType: string,
    resourceType: string,
    request?: Request,
    options: Partial<AuditLogData> = {}
  ): Promise<void> {
    await this.log({
      actionType,
      resourceType,
      endpoint: request?.route?.path || request?.url,
      method: request?.method,
      ipAddress: request ? this.extractIpAddress(request) : null,
      userAgent: request?.get('User-Agent'),
      sessionId: request ? this.extractSessionId(request) : null,
      category: 'security',
      severity: 'warn',
      ...options,
    });
  }

  /**
   * Log data changes with before/after values
   */
  async logDataChange(
    user: User,
    resourceType: string,
    resourceId: string,
    oldData: any,
    newData: any,
    request: Request,
    options: Partial<AuditLogData> = {}
  ): Promise<void> {
    const changes = this.calculateChanges(oldData, newData);
    
    await this.log({
      userId: user.id,
      clientId: user.clientId,
      actionType: 'UPDATE',
      resourceType,
      resourceId,
      endpoint: request.route?.path || request.url,
      method: request.method,
      ipAddress: this.extractIpAddress(request),
      userAgent: request.get('User-Agent'),
      sessionId: this.extractSessionId(request),
      changes,
      details: { before: oldData, after: newData },
      category: 'user_action',
      ...options,
    });
  }

  /**
   * Get audit logs for a specific device
   */
  async getDeviceAuditLogs(
    deviceId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      actionTypes?: string[];
      categories?: string[];
      severities?: string[];
      userIds?: string[];
    } = {}
  ) {
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      actionTypes,
      categories,
      severities,
      userIds,
    } = options;

    const whereClause: any = {
      deviceId,
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    if (actionTypes?.length) {
      whereClause.actionType = { in: actionTypes };
    }

    if (categories?.length) {
      whereClause.category = { in: categories };
    }

    if (severities?.length) {
      whereClause.severity = { in: severities };
    }

    if (userIds?.length) {
      whereClause.userId = { in: userIds };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      logs,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get audit log statistics for a device
   */
  async getDeviceAuditStats(deviceId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.auditLog.groupBy({
      by: ['actionType', 'category', 'severity'],
      where: {
        deviceId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: true,
    });

    const actionTypeStats = stats.reduce((acc, stat) => {
      acc[stat.actionType] = (acc[stat.actionType] || 0) + stat._count;
      return acc;
    }, {} as Record<string, number>);

    const categoryStats = stats.reduce((acc, stat) => {
      acc[stat.category] = (acc[stat.category] || 0) + stat._count;
      return acc;
    }, {} as Record<string, number>);

    const severityStats = stats.reduce((acc, stat) => {
      acc[stat.severity] = (acc[stat.severity] || 0) + stat._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      actionTypes: actionTypeStats,
      categories: categoryStats,
      severities: severityStats,
      totalLogs: stats.reduce((sum, stat) => sum + stat._count, 0),
    };
  }

  private extractIpAddress(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private extractSessionId(request: Request): string | null {
    // Extract from JWT token, session cookie, or generate from request
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      try {
        const token = authorization.substring(7);
        // You could decode JWT to get session info, but for now just use part of token
        return token.substring(0, 32);
      } catch {
        return null;
      }
    }
    return null;
  }

  private calculateChanges(oldData: any, newData: any): any {
    const changes: any = {};

    // Simple change detection
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

    for (const key of allKeys) {
      const oldValue = oldData?.[key];
      const newValue = newData?.[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    }

    return changes;
  }
}