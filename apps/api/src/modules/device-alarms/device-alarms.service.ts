import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { 
  CreateDeviceAlarmDto, 
  UpdateDeviceAlarmDto, 
  DeviceAlarmQueryDto, 
  DeviceAlarmResponseDto 
} from '../../common/dto/device-alarm.dto';

@Injectable()
export class DeviceAlarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateDeviceAlarmDto): Promise<DeviceAlarmResponseDto> {
    // Verify device exists
    const device = await this.prisma.device.findUnique({
      where: { id: createDto.deviceId }
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const deviceAlarm = await this.prisma.deviceAlarm.create({
      data: {
        deviceId: createDto.deviceId,
        type: createDto.type,
        title: createDto.title,
        status: createDto.status,
        severity: createDto.severity,
        propagate: createDto.propagate ?? true,
        rawData: createDto.rawData
      },
      include: this.getFullInclude()
    });

    return this.transformToResponseDto(deviceAlarm);
  }

  async findAll(queryDto: DeviceAlarmQueryDto, userId: string) {
    const { 
      deviceId, 
      type, 
      severity, 
      resolved, 
      fromDate, 
      toDate, 
      page = 1, 
      limit = 20 
    } = queryDto;

    const skip = (page - 1) * limit;
    
    // Get user role to determine access
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    const where: any = {};

    // Role-based access control
    if (user.role.name !== 'super_user' && user.role.name !== 'admin') {
      // Regular users can only see alarms for their devices
      if (user.clientId) {
        where.device = {
          clientId: user.clientId
        };
      } else {
        // Users without client can't see any alarms
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        };
      }
    }

    // Apply filters
    if (deviceId) {
      where.deviceId = deviceId;
    }
    if (type) {
      where.type = {
        contains: type,
        mode: 'insensitive'
      };
    }
    if (severity) {
      where.severity = severity;
    }
    if (resolved !== undefined) {
      where.resolved = resolved;
    }
    if (fromDate || toDate) {
      where.receivedAt = {};
      if (fromDate) {
        where.receivedAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.receivedAt.lte = new Date(toDate);
      }
    }

    const [alarms, total] = await Promise.all([
      this.prisma.deviceAlarm.findMany({
        where,
        include: this.getFullInclude(),
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.deviceAlarm.count({ where })
    ]);

    return {
      data: alarms.map(alarm => this.transformToResponseDto(alarm)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string, userId: string): Promise<DeviceAlarmResponseDto> {
    const alarm = await this.prisma.deviceAlarm.findUnique({
      where: { id },
      include: this.getFullInclude()
    });

    if (!alarm) {
      throw new NotFoundException('Device alarm not found');
    }

    // Check access permissions
    await this.checkAlarmAccess(alarm, userId);

    return this.transformToResponseDto(alarm);
  }

  async resolve(id: string, userId: string, updateDto: UpdateDeviceAlarmDto): Promise<DeviceAlarmResponseDto> {
    const alarm = await this.prisma.deviceAlarm.findUnique({
      where: { id },
      include: this.getFullInclude()
    });

    if (!alarm) {
      throw new NotFoundException('Device alarm not found');
    }

    // Check access permissions - only Super Users and Admins can resolve alarms
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (user.role.name !== 'super_user' && user.role.name !== 'admin') {
      throw new ForbiddenException('Only Super Users and Admins can resolve device alarms');
    }

    const updatedAlarm = await this.prisma.deviceAlarm.update({
      where: { id },
      data: {
        resolved: updateDto.resolved ?? true,
        resolvedAt: updateDto.resolved !== false ? new Date() : null,
        resolvedBy: updateDto.resolved !== false ? userId : null,
        notes: updateDto.notes
      },
      include: this.getFullInclude()
    });

    return this.transformToResponseDto(updatedAlarm);
  }

  async getStatistics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    const where: any = {};

    // Apply role-based filtering
    if (user.role.name !== 'super_user' && user.role.name !== 'admin') {
      if (user.clientId) {
        where.device = {
          clientId: user.clientId
        };
      } else {
        return {
          total: 0,
          active: 0,
          resolved: 0,
          critical: 0,
          warning: 0,
          info: 0,
          byType: [],
          recent: []
        };
      }
    }

    const [
      total,
      active,
      resolved,
      critical,
      warning,
      info,
      byType,
      recent
    ] = await Promise.all([
      this.prisma.deviceAlarm.count({ where }),
      this.prisma.deviceAlarm.count({ where: { ...where, resolved: false } }),
      this.prisma.deviceAlarm.count({ where: { ...where, resolved: true } }),
      this.prisma.deviceAlarm.count({ where: { ...where, severity: 3 } }),
      this.prisma.deviceAlarm.count({ where: { ...where, severity: 2 } }),
      this.prisma.deviceAlarm.count({ where: { ...where, severity: 1 } }),
      this.prisma.deviceAlarm.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } },
        take: 10
      }),
      this.prisma.deviceAlarm.findMany({
        where,
        include: {
          device: {
            select: {
              id: true,
              deviceName: true,
              deviceCode: true
            }
          }
        },
        orderBy: { receivedAt: 'desc' },
        take: 10
      })
    ]);

    return {
      total,
      active,
      resolved,
      critical,
      warning,
      info,
      byType: byType.map(item => ({
        type: item.type,
        count: item._count.type
      })),
      recent: recent.map(alarm => ({
        id: alarm.id,
        type: alarm.type,
        title: alarm.title,
        severity: alarm.severity,
        receivedAt: alarm.receivedAt,
        device: alarm.device
      }))
    };
  }

  private async checkAlarmAccess(alarm: any, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    // Super Users and Admins have access to all alarms
    if (user.role.name === 'super_user' || user.role.name === 'admin') {
      return;
    }

    // Regular users can only access alarms for their client's devices
    if (!user.clientId || alarm.device.clientId !== user.clientId) {
      throw new ForbiddenException('You do not have access to this device alarm');
    }
  }

  private getFullInclude() {
    return {
      device: {
        select: {
          id: true,
          deviceName: true,
          deviceCode: true,
          client: {
            select: {
              id: true,
              companyName: true
            }
          }
        }
      },
      resolver: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    };
  }

  private transformToResponseDto(alarm: any): DeviceAlarmResponseDto {
    return {
      id: alarm.id,
      deviceId: alarm.deviceId,
      type: alarm.type,
      title: alarm.title,
      status: alarm.status,
      severity: alarm.severity,
      propagate: alarm.propagate,
      rawData: alarm.rawData,
      receivedAt: alarm.receivedAt,
      resolved: alarm.resolved,
      resolvedAt: alarm.resolvedAt,
      notes: alarm.notes,
      device: alarm.device,
      resolver: alarm.resolver
    };
  }
}