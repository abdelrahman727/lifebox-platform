import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { 
  CreateClientDto, 
  UpdateClientDto, 
  ClientQueryDto, 
  CreateSubscriptionDto,
  UpdateClientFawryDto 
} from '../../common/dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    const existing = await this.prisma.client.findFirst({
      where: { name: createClientDto.name },
    });

    if (existing) {
      throw new ConflictException('Client with this name already exists');
    }

    const client = await this.prisma.client.create({
      data: createClientDto,
      include: {
        _count: {
          select: {
            devices: true,
            subscriptions: true,
            payments: true,
          },
        },
      },
    });

    return client;
  }

  async findAll(query: ClientQueryDto) {
    const { search, subscriptionType, clientTier, paymentStatus, billingType, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { organizationName: { contains: search, mode: 'insensitive' } },
        { fawryPaymentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (subscriptionType) where.subscriptionType = subscriptionType;
    if (clientTier) where.clientTier = clientTier;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (billingType) where.billingType = billingType;

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              devices: true,
              subscriptions: true,
              payments: true,
            },
          },
          subscriptions: {
            where: { status: 'active' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        devices: {
          include: {
            locations: {
              where: { validTo: null },
              take: 1,
            },
          },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            devices: true,
            subscriptions: true,
            payments: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    await this.findOne(id);

    const updated = await this.prisma.client.update({
      where: { id },
      data: updateClientDto,
      include: {
        _count: {
          select: {
            devices: true,
            subscriptions: true,
            payments: true,
          },
        },
      },
    });

    return updated;
  }

  async remove(id: string) {
    const client = await this.findOne(id);

    if (client._count.devices > 0) {
      throw new ConflictException('Cannot delete client with active devices');
    }

    await this.prisma.client.delete({
      where: { id },
    });

    return { message: 'Client deleted successfully' };
  }

  async createSubscription(clientId: string, createSubscriptionDto: CreateSubscriptionDto) {
    await this.findOne(clientId);

    await this.prisma.subscription.updateMany({
      where: {
        clientId,
        status: 'active',
      },
      data: {
        status: 'cancelled',
        endDate: new Date(),
      },
    });

    const subscription = await this.prisma.subscription.create({
      data: {
        clientId,
        planName: createSubscriptionDto.planName,
        startDate: new Date(createSubscriptionDto.startDate),
        endDate: createSubscriptionDto.endDate ? new Date(createSubscriptionDto.endDate) : null,
        monthlyFee: createSubscriptionDto.monthlyFee,
        status: 'active',
      },
    });

    await this.prisma.client.update({
      where: { id: clientId },
      data: { paymentStatus: 'active' },
    });

    return subscription;
  }

  async getStatistics(id: string) {
    const client = await this.findOne(id);

    const deviceStats = await this.prisma.device.aggregate({
      where: { clientId: id },
      _count: {
        id: true,
      },
    });

    const activeDevices = await this.prisma.device.count({
      where: {
        clientId: id,
        isActive: true,
      },
    });

    const energyStats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        SUM(sm.total_energy_mwh) as total_energy,
        SUM(sm.money_saved_egp) as total_savings
      FROM sustainability_metrics sm
      JOIN devices d ON sm.device_id = d.id
      WHERE d.client_id = ${id}::uuid
    `;

    const activeAlarms = await this.prisma.alarmEvent.count({
      where: {
        device: {
          clientId: id,
        },
        resolvedAt: null,
      },
    });

    const latestSubscription = await this.prisma.subscription.findFirst({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalDevices: deviceStats._count.id,
      activeDevices,
      totalEnergy: energyStats[0]?.total_energy || 0,
      totalSavings: energyStats[0]?.total_savings || 0,
      activeAlarms,
      subscriptionStatus: latestSubscription?.status || 'none',
      paymentStatus: client.paymentStatus,
    };
  }

  async getDevices(id: string) {
    await this.findOne(id);

    const devices = await this.prisma.device.findMany({
      where: { clientId: id },
      include: {
        locations: {
          where: { validTo: null },
          take: 1,
        },
        telemetryEvents: {
          orderBy: { time: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            alarmEvents: {
              where: { resolvedAt: null },
            },
          },
        },
      },
    });

    return devices.map(device => ({
      ...device,
      currentLocation: device.locations[0] || null,
      lastTelemetry: device.telemetryEvents[0] || null,
      activeAlarms: device._count.alarmEvents,
    }));
  }

    /**
   * Update client credit balance
   */
  async updateCredit(id: string, newCreditAmount: number) {
    await this.findOne(id);

    const updated = await this.prisma.client.update({
      where: { id },
      data: { credit: newCreditAmount },
      select: {
        id: true,
        name: true,
        credit: true,
        billingType: true,
        fawryPaymentId: true,
        updatedAt: true
      }
    });

    return {
      message: 'Credit balance updated successfully',
      client: updated
    };
  }

  /**
   * Update client Fawry settings
   */
  async updateFawrySettings(id: string, updateFawryDto: UpdateClientFawryDto) {
    await this.findOne(id);

    // Check if fawryPaymentId is already taken by another client
    if (updateFawryDto.fawryPaymentId) {
      const existing = await this.prisma.client.findFirst({
        where: {
          fawryPaymentId: updateFawryDto.fawryPaymentId,
          NOT: { id }
        }
      });

      if (existing) {
        throw new ConflictException('Fawry Payment ID is already in use by another client');
      }
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: updateFawryDto,
      select: {
        id: true,
        name: true,
        fawryPaymentId: true,
        billingType: true,
        credit: true,
        electricityRateEgp: true,
        updatedAt: true
      }
    });

    return {
      message: 'Fawry settings updated successfully',
      client: updated
    };
  }

  /**
   * Get client credit balance
   */
  async getCreditBalance(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        credit: true,
        billingType: true,
        fawryPaymentId: true
      }
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return {
      clientId: client.id,
      clientName: client.name,
      creditBalance: Number(client.credit),
      billingType: client.billingType,
      fawryPaymentId: client.fawryPaymentId,
      currency: 'EGP'
    };
  }

  /**
   * Find client by Fawry payment ID
   */
  async findByFawryPaymentId(fawryPaymentId: string) {
    const client = await this.prisma.client.findUnique({
      where: { fawryPaymentId },
      include: {
        _count: {
          select: {
            devices: true,
            subscriptions: true
          }
        }
      }
    });

    return client;
  }

  /**
   * Get clients with low credit balance
   */
  async getLowCreditClients(threshold: number = 10) {
    const clients = await this.prisma.client.findMany({
      where: {
        billingType: 'prepaid',
        credit: { lt: threshold }
      },
      select: {
        id: true,
        name: true,
        organizationName: true,
        credit: true,
        fawryPaymentId: true,
        users: {
          select: {
            email: true,
            phone: true,
            fullName: true
          }
        }
      },
      orderBy: { credit: 'asc' }
    });

    return clients;
  }

  /**
   * Update client electricity rate (Admin function)
   */
  async updateElectricityRate(id: string, electricityRateEgp: number) {
    await this.findOne(id);

    if (electricityRateEgp <= 0) {
      throw new ConflictException('Electricity rate must be greater than 0');
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: { 
        electricityRateEgp,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        electricityRateEgp: true,
        replacingSource: true,
        updatedAt: true
      }
    });

    return {
      success: true,
      message: `Electricity rate updated to ${electricityRateEgp} EGP/kWh for client ${updated.name}`,
      data: {
        ...updated,
        electricityRateEgp: Number(updated.electricityRateEgp)
      }
    };
  }

  /**
   * Get client electricity rate
   */
  async getElectricityRate(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        electricityRateEgp: true,
        replacingSource: true,
        updatedAt: true
      }
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return {
      success: true,
      data: {
        clientId: client.id,
        clientName: client.name,
        electricityRateEgp: Number(client.electricityRateEgp),
        replacingSource: client.replacingSource || 'grid',
        lastUpdated: client.updatedAt
      }
    };
  }

  /**
   * Get electricity rates overview for all clients (Admin function)
   */
  async getElectricityRatesOverview() {
    const clients = await this.prisma.client.findMany({
      select: {
        id: true,
        name: true,
        organizationName: true,
        electricityRateEgp: true,
        replacingSource: true,
        updatedAt: true,
        _count: {
          select: {
            devices: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const summary = {
      totalClients: clients.length,
      defaultRate: 2.15, // System default
      averageRate: clients.length > 0 ? 
        clients.reduce((sum, c) => sum + Number(c.electricityRateEgp), 0) / clients.length : 2.15,
      rateRange: {
        min: clients.length > 0 ? Math.min(...clients.map(c => Number(c.electricityRateEgp))) : 2.15,
        max: clients.length > 0 ? Math.max(...clients.map(c => Number(c.electricityRateEgp))) : 2.15
      }
    };

    return {
      success: true,
      data: {
        summary,
        clients: clients.map(client => ({
          id: client.id,
          name: client.name,
          organizationName: client.organizationName,
          electricityRateEgp: Number(client.electricityRateEgp),
          replacingSource: client.replacingSource || 'grid',
          deviceCount: client._count.devices,
          lastUpdated: client.updatedAt
        }))
      }
    };
  }
  
}
