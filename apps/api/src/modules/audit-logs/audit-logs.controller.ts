import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditLogsController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs (admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'All audit logs retrieved successfully',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of logs to return (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of logs to skip' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date filter (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date filter (ISO string)' })
  @ApiQuery({ name: 'actionTypes', required: false, type: [String], description: 'Filter by action types' })
  @ApiQuery({ name: 'categories', required: false, type: [String], description: 'Filter by categories' })
  @ApiQuery({ name: 'severities', required: false, type: [String], description: 'Filter by severity levels' })
  @ApiQuery({ name: 'userIds', required: false, type: [String], description: 'Filter by user IDs' })
  @ApiQuery({ name: 'deviceIds', required: false, type: [String], description: 'Filter by device IDs' })
  async getAllAuditLogs(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('actionTypes') actionTypes?: string | string[],
    @Query('categories') categories?: string | string[],
    @Query('severities') severities?: string | string[],
    @Query('userIds') userIds?: string | string[],
    @Query('deviceIds') deviceIds?: string | string[],
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
    const parsedDeviceIds = Array.isArray(deviceIds) ? deviceIds : deviceIds ? [deviceIds] : undefined;

    // Build where clause
    const whereClause: any = {};

    if (parsedStartDate || parsedEndDate) {
      whereClause.createdAt = {};
      if (parsedStartDate) whereClause.createdAt.gte = parsedStartDate;
      if (parsedEndDate) whereClause.createdAt.lte = parsedEndDate;
    }

    if (parsedActionTypes?.length) {
      whereClause.actionType = { in: parsedActionTypes };
    }

    if (parsedCategories?.length) {
      whereClause.category = { in: parsedCategories };
    }

    if (parsedSeverities?.length) {
      whereClause.severity = { in: parsedSeverities };
    }

    if (parsedUserIds?.length) {
      whereClause.userId = { in: parsedUserIds };
    }

    if (parsedDeviceIds?.length) {
      whereClause.deviceId = { in: parsedDeviceIds };
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
          device: {
            select: {
              id: true,
              deviceName: true,
              deviceCode: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: parsedLimit,
        skip: parsedOffset,
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      logs,
      total,
      hasMore: parsedOffset + parsedLimit < total,
    };
  }
}