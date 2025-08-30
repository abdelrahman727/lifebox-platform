import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateExchangeRateDto, UpdateExchangeRateDto, ExchangeRateFilterDto } from './dto/exchange-rate.dto';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createExchangeRate(createDto: CreateExchangeRateDto, userId: string) {
    this.logger.log(`Creating exchange rate: ${createDto.baseCurrency} to ${createDto.targetCurrency} at ${createDto.rate}`);

    // Deactivate existing active rate for same currency pair
    await this.deactivateCurrentRate(createDto.baseCurrency, createDto.targetCurrency);

    return await this.prisma.exchangeRate.create({
      data: {
        ...createDto,
        createdBy: userId,
        effectiveFrom: new Date(createDto.effectiveFrom),
        effectiveTo: createDto.effectiveTo ? new Date(createDto.effectiveTo) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findAll(filterDto?: ExchangeRateFilterDto) {
    const where: any = {};

    if (filterDto?.baseCurrency) {
      where.baseCurrency = filterDto.baseCurrency;
    }

    if (filterDto?.targetCurrency) {
      where.targetCurrency = filterDto.targetCurrency;
    }

    if (filterDto?.isActive !== undefined) {
      where.isActive = filterDto.isActive;
    }

    if (filterDto?.effectiveFrom) {
      where.effectiveFrom = {
        gte: new Date(filterDto.effectiveFrom),
      };
    }

    if (filterDto?.effectiveTo) {
      where.effectiveTo = {
        lte: new Date(filterDto.effectiveTo),
      };
    }

    return await this.prisma.exchangeRate.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: [
        { effectiveFrom: 'desc' },
        { createdAt: 'desc' }
      ],
      take: filterDto?.limit || 50,
      skip: filterDto?.offset || 0,
    });
  }

  async findOne(id: string) {
    const exchangeRate = await this.prisma.exchangeRate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!exchangeRate) {
      throw new NotFoundException(`Exchange rate with ID ${id} not found`);
    }

    return exchangeRate;
  }

  async updateExchangeRate(id: string, updateDto: UpdateExchangeRateDto) {
    const existingRate = await this.findOne(id);

    return await this.prisma.exchangeRate.update({
      where: { id },
      data: {
        ...updateDto,
        effectiveFrom: updateDto.effectiveFrom ? new Date(updateDto.effectiveFrom) : undefined,
        effectiveTo: updateDto.effectiveTo ? new Date(updateDto.effectiveTo) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async deactivateExchangeRate(id: string) {
    const existingRate = await this.findOne(id);

    return await this.prisma.exchangeRate.update({
      where: { id },
      data: {
        isActive: false,
        effectiveTo: new Date(),
      },
    });
  }

  async getCurrentRate(baseCurrency = 'EGP', targetCurrency = 'USD') {
    const now = new Date();
    
    const currentRate = await this.prisma.exchangeRate.findFirst({
      where: {
        baseCurrency,
        targetCurrency,
        isActive: true,
        effectiveFrom: {
          lte: now,
        },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } }
        ]
      },
      orderBy: {
        effectiveFrom: 'desc'
      }
    });

    if (!currentRate) {
      throw new NotFoundException(`No active exchange rate found for ${baseCurrency} to ${targetCurrency}`);
    }

    return currentRate;
  }

  async getRateHistory(baseCurrency = 'EGP', targetCurrency = 'USD', days = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    return await this.prisma.exchangeRate.findMany({
      where: {
        baseCurrency,
        targetCurrency,
        effectiveFrom: {
          gte: fromDate,
        },
      },
      orderBy: {
        effectiveFrom: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async convertCurrency(amount: number, baseCurrency = 'EGP', targetCurrency = 'USD', rateDate?: Date) {
    let rate;
    
    if (rateDate) {
      // Get historical rate for specific date
      rate = await this.prisma.exchangeRate.findFirst({
        where: {
          baseCurrency,
          targetCurrency,
          effectiveFrom: {
            lte: rateDate,
          },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: rateDate } }
          ]
        },
        orderBy: {
          effectiveFrom: 'desc'
        }
      });
    } else {
      // Get current rate
      rate = await this.getCurrentRate(baseCurrency, targetCurrency);
    }

    if (!rate) {
      throw new NotFoundException(`Exchange rate not found for ${baseCurrency} to ${targetCurrency}${rateDate ? ` on ${rateDate.toISOString()}` : ''}`);
    }

    const convertedAmount = amount * parseFloat(rate.rate.toString());
    
    return {
      originalAmount: amount,
      originalCurrency: baseCurrency,
      convertedAmount,
      convertedCurrency: targetCurrency,
      exchangeRate: parseFloat(rate.rate.toString()),
      rateDate: rate.effectiveFrom,
      rateId: rate.id,
    };
  }

  private async deactivateCurrentRate(baseCurrency: string, targetCurrency: string) {
    const currentActiveRate = await this.prisma.exchangeRate.findFirst({
      where: {
        baseCurrency,
        targetCurrency,
        isActive: true,
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } }
        ]
      }
    });

    if (currentActiveRate) {
      await this.prisma.exchangeRate.update({
        where: { id: currentActiveRate.id },
        data: {
          effectiveTo: new Date(),
        }
      });
      
      this.logger.log(`Deactivated previous rate ${currentActiveRate.id} for ${baseCurrency} to ${targetCurrency}`);
    }
  }
}