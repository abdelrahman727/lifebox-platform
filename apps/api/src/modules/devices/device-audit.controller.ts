import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { AuditLogService } from '../../common/services/audit-log.service';

@ApiTags('Device Audit Logs')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeviceAuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get(':deviceId/audit-logs')
  @ApiOperation({ summary: 'Get audit logs for a specific device' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device audit logs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        logs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              actionType: { type: 'string' },
              resourceType: { type: 'string' },
              resourceId: { type: 'string', nullable: true },
              endpoint: { type: 'string', nullable: true },
              method: { type: 'string', nullable: true },
              statusCode: { type: 'number', nullable: true },
              duration: { type: 'number', nullable: true },
              details: { type: 'object', nullable: true },
              changes: { type: 'object', nullable: true },
              metadata: { type: 'object', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              sessionId: { type: 'string', nullable: true },
              severity: { type: 'string' },
              category: { type: 'string' },
              isSuccessful: { type: 'boolean' },
              errorMessage: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  fullName: { type: 'string', nullable: true },
                  role: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        total: { type: 'number' },
        hasMore: { type: 'boolean' }
      }
    }
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of logs to return (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of logs to skip' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date filter (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date filter (ISO string)' })
  @ApiQuery({ name: 'actionTypes', required: false, type: [String], description: 'Filter by action types' })
  @ApiQuery({ name: 'categories', required: false, type: [String], description: 'Filter by categories' })
  @ApiQuery({ name: 'severities', required: false, type: [String], description: 'Filter by severity levels' })
  @ApiQuery({ name: 'userIds', required: false, type: [String], description: 'Filter by user IDs' })
  async getDeviceAuditLogs(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('actionTypes') actionTypes?: string | string[],
    @Query('categories') categories?: string | string[],
    @Query('severities') severities?: string | string[],
    @Query('userIds') userIds?: string | string[],
  ) {
    // Validate and parse parameters
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (parsedLimit > 100) {
      throw new BadRequestException('Limit cannot exceed 100');
    }

    if (parsedLimit < 1) {
      throw new BadRequestException('Limit must be at least 1');
    }

    if (parsedOffset < 0) {
      throw new BadRequestException('Offset cannot be negative');
    }

    // Parse date filters
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    if (parsedStartDate && isNaN(parsedStartDate.getTime())) {
      throw new BadRequestException('Invalid startDate format');
    }

    if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
      throw new BadRequestException('Invalid endDate format');
    }

    // Parse array filters
    const parsedActionTypes = Array.isArray(actionTypes) ? actionTypes : actionTypes ? [actionTypes] : undefined;
    const parsedCategories = Array.isArray(categories) ? categories : categories ? [categories] : undefined;
    const parsedSeverities = Array.isArray(severities) ? severities : severities ? [severities] : undefined;
    const parsedUserIds = Array.isArray(userIds) ? userIds : userIds ? [userIds] : undefined;

    // TODO: Add permission check to ensure user can access this device's audit logs
    // This should check if user has access to the device or is admin/super_user

    return await this.auditLogService.getDeviceAuditLogs(deviceId, {
      limit: parsedLimit,
      offset: parsedOffset,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      actionTypes: parsedActionTypes,
      categories: parsedCategories,
      severities: parsedSeverities,
      userIds: parsedUserIds,
    });
  }

  @Get(':deviceId/audit-stats')
  @ApiOperation({ summary: 'Get audit log statistics for a specific device' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device audit statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        actionTypes: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Count by action type'
        },
        categories: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Count by category'
        },
        severities: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Count by severity'
        },
        totalLogs: {
          type: 'number',
          description: 'Total number of logs'
        }
      }
    }
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to include in statistics (default: 30)' })
  async getDeviceAuditStats(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ) {
    const parsedDays = days ? parseInt(days, 10) : 30;

    if (parsedDays < 1 || parsedDays > 365) {
      throw new BadRequestException('Days must be between 1 and 365');
    }

    // TODO: Add permission check to ensure user can access this device's audit logs

    return await this.auditLogService.getDeviceAuditStats(deviceId, parsedDays);
  }

  @Get(':deviceId/audit-summary')
  @ApiOperation({ summary: 'Get a summary of recent activity for a device' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device audit summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        recentActivity: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              actionType: { type: 'string' },
              resourceType: { type: 'string' },
              severity: { type: 'string' },
              category: { type: 'string' },
              isSuccessful: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                nullable: true,
                properties: {
                  fullName: { type: 'string', nullable: true },
                  email: { type: 'string' }
                }
              }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            totalActions: { type: 'number' },
            successfulActions: { type: 'number' },
            failedActions: { type: 'number' },
            lastActivity: { type: 'string', format: 'date-time', nullable: true },
            mostCommonAction: { type: 'string', nullable: true }
          }
        }
      }
    }
  })
  async getDeviceAuditSummary(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
  ) {
    // Get recent activity (last 24 hours, limit to 20 entries)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentLogs = await this.auditLogService.getDeviceAuditLogs(deviceId, {
      limit: 20,
      offset: 0,
      startDate: yesterday,
    });

    // Get statistics for the summary
    const stats = await this.auditLogService.getDeviceAuditStats(deviceId, 7); // Last 7 days

    const totalActions = stats.totalLogs;
    const successfulActions = Object.entries(stats.severities).reduce((sum, [severity, count]) => {
      return severity === 'info' ? sum + (count as number) : sum;
    }, 0);
    const failedActions = totalActions - successfulActions;

    const mostCommonAction = Object.entries(stats.actionTypes).reduce((a, b) => 
      stats.actionTypes[a[0]] > stats.actionTypes[b[0]] ? a : b
    )?.[0] || null;

    const lastActivity = recentLogs.logs.length > 0 ? recentLogs.logs[0].createdAt : null;

    return {
      recentActivity: recentLogs.logs.map(log => ({
        id: log.id,
        actionType: log.actionType,
        resourceType: log.resourceType,
        severity: log.severity,
        category: log.category,
        isSuccessful: log.isSuccessful,
        createdAt: log.createdAt,
        user: log.user ? {
          fullName: log.user.fullName,
          email: log.user.email,
        } : null,
      })),
      summary: {
        totalActions,
        successfulActions,
        failedActions,
        lastActivity,
        mostCommonAction,
      },
    };
  }
}