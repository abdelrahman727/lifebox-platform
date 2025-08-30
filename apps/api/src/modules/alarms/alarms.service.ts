import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAlarmRuleDto, UpdateAlarmRuleDto, AlarmEventQueryDto, AcknowledgeAlarmDto } from '../../common/dto/alarm.dto';

@Injectable()
export class AlarmsService {
  constructor(private prisma: PrismaService) {}

  async createRule(createAlarmRuleDto: CreateAlarmRuleDto, userId: string) {
    const { reactions, ...ruleData } = createAlarmRuleDto;

    const alarmRule = await this.prisma.alarmRule.create({
      data: {
        ...ruleData,
        createdBy: userId,
        reactions: reactions ? {
          create: reactions,
        } : undefined,
      },
      include: {
        reactions: true,
        device: true,
      },
    });

    return alarmRule;
  }

  async findAllRules(deviceId?: string) {
    const where: any = {};
    if (deviceId) where.deviceId = deviceId;

    const rules = await this.prisma.alarmRule.findMany({
      where,
      include: {
        reactions: true,
        device: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            alarmEvents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rules;
  }

  async findOneRule(id: string) {
    const rule = await this.prisma.alarmRule.findUnique({
      where: { id },
      include: {
        reactions: true,
        device: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        alarmEvents: {
          take: 10,
          orderBy: { triggeredAt: 'desc' },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Alarm rule not found');
    }

    return rule;
  }

  async updateRule(id: string, updateAlarmRuleDto: UpdateAlarmRuleDto) {
    await this.findOneRule(id);

    const { reactions, ...ruleData } = updateAlarmRuleDto;

    const updated = await this.prisma.alarmRule.update({
      where: { id },
      data: {
        ...ruleData,
        updatedAt: new Date(),
      },
      include: {
        reactions: true,
        device: true,
      },
    });

    if (reactions) {
      await this.prisma.alarmReaction.deleteMany({
        where: { alarmRuleId: id },
      });

      await this.prisma.alarmReaction.createMany({
        data: reactions.map(reaction => ({
          ...reaction,
          alarmRuleId: id,
        })),
      });
    }

    return this.findOneRule(id);
  }

  async removeRule(id: string) {
    await this.findOneRule(id);

    await this.prisma.alarmRule.delete({
      where: { id },
    });

    return { message: 'Alarm rule deleted successfully' };
  }

  async findAllEvents(query: AlarmEventQueryDto) {
    const { deviceId, severity, acknowledged, resolved, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (deviceId) where.deviceId = deviceId;
    if (severity) where.severity = severity;
    if (acknowledged !== undefined) where.acknowledged = acknowledged;
    if (resolved !== undefined) {
      where.resolvedAt = resolved ? { not: null } : null;
    }

    if (startDate || endDate) {
      where.triggeredAt = {};
      if (startDate) where.triggeredAt.gte = new Date(startDate);
      if (endDate) where.triggeredAt.lte = new Date(endDate);
    }

    const [events, total] = await Promise.all([
      this.prisma.alarmEvent.findMany({
        where,
        skip,
        take: limit,
        include: {
          alarmRule: true,
          device: {
            select: {
              id: true,
              deviceName: true,
              deviceCode: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { triggeredAt: 'desc' },
      }),
      this.prisma.alarmEvent.count({ where }),
    ]);

    return {
      data: events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async acknowledgeEvent(id: string, acknowledgeDto: AcknowledgeAlarmDto, userId: string) {
    const event = await this.prisma.alarmEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Alarm event not found');
    }

    if (event.acknowledged) {
      throw new BadRequestException('Alarm already acknowledged');
    }

    const updated = await this.prisma.alarmEvent.update({
      where: { id },
      data: {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        message: acknowledgeDto.message,
      },
      include: {
        alarmRule: true,
        device: true,
        user: true,
      },
    });

    return updated;
  }

  async resolveEvent(id: string) {
    const event = await this.prisma.alarmEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Alarm event not found');
    }

    if (event.resolvedAt) {
      throw new BadRequestException('Alarm already resolved');
    }

    const updated = await this.prisma.alarmEvent.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
      },
    });

    return updated;
  }

  async getAlarmStatistics(deviceId?: string) {
    const where: any = {};
    if (deviceId) where.deviceId = deviceId;

    const [totalAlarms, bySeverity, byCategory, recentAlarms] = await Promise.all([
      this.prisma.alarmEvent.count({ where }),
      this.prisma.alarmEvent.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      deviceId 
        ? this.prisma.$queryRaw`
          SELECT ar.alarm_category, COUNT(ae.id) as count
          FROM alarm_events ae
          JOIN alarm_rules ar ON ae.alarm_rule_id = ar.id
          WHERE ae.device_id = ${deviceId}::uuid
          GROUP BY ar.alarm_category
        `
        : this.prisma.$queryRaw`
          SELECT ar.alarm_category, COUNT(ae.id) as count
          FROM alarm_events ae
          JOIN alarm_rules ar ON ae.alarm_rule_id = ar.id
          GROUP BY ar.alarm_category
        `,
      this.prisma.alarmEvent.findMany({
        where: {
          ...where,
          resolvedAt: null,
        },
        take: 10,
        orderBy: { triggeredAt: 'desc' },
        include: {
          device: {
            select: {
              deviceName: true,
              deviceCode: true,
            },
          },
          alarmRule: {
            select: {
              name: true,
              severity: true,
            },
          },
        },
      }),
    ]);

    return {
      total: totalAlarms,
      bySeverity,
      byCategory,
      recentAlarms,
      activeAlarmsCount: recentAlarms.length,
    };
  }

  async testAlarmRule(id: string, testValue: number) {
    const rule = await this.findOneRule(id);

    const wouldTrigger = this.checkCondition(
      testValue,
      rule.condition,
      rule.thresholdValue
    );

    return {
      rule: {
        id: rule.id,
        name: rule.name,
        condition: rule.condition,
        threshold: rule.thresholdValue,
      },
      testValue,
      wouldTrigger,
      message: wouldTrigger 
        ? `Alarm would trigger: ${testValue} ${rule.condition} ${rule.thresholdValue}`
        : `Alarm would not trigger: ${testValue} NOT ${rule.condition} ${rule.thresholdValue}`,
    };
  }

  private checkCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      default: return false;
    }
  }
}
