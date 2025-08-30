import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSystemSettingDto, UpdateSystemSettingDto, CreditSettingsDto } from '../../../common/dto/admin.dto';

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);
  private settingsCache = new Map<string, any>();

  constructor(private readonly prisma: PrismaService) {
    this.initializeDefaultSettings();
  }

  /**
   * Get setting value with caching
   */
  async getSetting<T = any>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    if (this.settingsCache.has(key)) {
      return this.settingsCache.get(key);
    }

    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key },
      });

      if (!setting) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new NotFoundException(`Setting '${key}' not found`);
      }

      // Parse value based on data type
      const parsedValue = this.parseSettingValue(setting.value, setting.dataType);
      
      // Cache the value
      this.settingsCache.set(key, parsedValue);
      
      return parsedValue;
    } catch (error) {
      this.logger.error(`Failed to get setting '${key}'`, error);
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }

  /**
   * Set setting value
   */
  async setSetting(key: string, value: any, userId?: string): Promise<void> {
    try {
      const stringValue = this.stringifySettingValue(value);
      const dataType = this.inferDataType(value);

      await this.prisma.systemSetting.upsert({
        where: { key },
        update: {
          value: stringValue,
          dataType,
          updatedBy: userId,
        },
        create: {
          key,
          value: stringValue,
          dataType,
          category: this.getCategoryForKey(key),
          description: this.getDescriptionForKey(key),
          updatedBy: userId,
        },
      });

      // Update cache
      this.settingsCache.set(key, value);
      
      this.logger.log(`Setting '${key}' updated to: ${stringValue}`);
    } catch (error) {
      this.logger.error(`Failed to set setting '${key}'`, error);
      throw error;
    }
  }

  /**
   * Get credit monitoring settings
   */
  async getCreditSettings(): Promise<CreditSettingsDto> {
    const [warningThreshold, criticalThreshold, monitoringInterval] = await Promise.all([
      this.getSetting('CREDIT_WARNING_THRESHOLD', 20),
      this.getSetting('CREDIT_CRITICAL_THRESHOLD', 5),
      this.getSetting('CREDIT_MONITORING_INTERVAL', 5),
    ]);

    return {
      creditWarningThreshold: warningThreshold,
      creditCriticalThreshold: criticalThreshold,
      creditMonitoringInterval: monitoringInterval,
    };
  }

  /**
   * Update credit monitoring settings
   */
  async updateCreditSettings(settings: CreditSettingsDto, userId: string): Promise<void> {
    // Validate settings
    if (settings.creditCriticalThreshold >= settings.creditWarningThreshold) {
      throw new BadRequestException('Critical threshold must be less than warning threshold');
    }

    if (settings.creditMonitoringInterval < 1 || settings.creditMonitoringInterval > 60) {
      throw new BadRequestException('Monitoring interval must be between 1 and 60 minutes');
    }

    // Update all settings
    await Promise.all([
      this.setSetting('CREDIT_WARNING_THRESHOLD', settings.creditWarningThreshold, userId),
      this.setSetting('CREDIT_CRITICAL_THRESHOLD', settings.creditCriticalThreshold, userId),
      this.setSetting('CREDIT_MONITORING_INTERVAL', settings.creditMonitoringInterval, userId),
    ]);

    this.logger.log(`Credit settings updated by user ${userId}`);
  }

  /**
   * Get all settings by category
   */
  async getSettingsByCategory(category: string) {
    const settings = await this.prisma.systemSetting.findMany({
      where: { category },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { key: 'asc' },
    });

    return settings.map(setting => ({
      ...setting,
      parsedValue: this.parseSettingValue(setting.value, setting.dataType),
    }));
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    const settings = await this.prisma.systemSetting.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });

    return settings.map(setting => ({
      ...setting,
      parsedValue: this.parseSettingValue(setting.value, setting.dataType),
    }));
  }

  /**
   * Create new setting
   */
  async createSetting(dto: CreateSystemSettingDto, userId: string) {
    // Validate value matches data type
    try {
      this.parseSettingValue(dto.value, dto.dataType);
    } catch (error) {
      throw new BadRequestException(`Invalid value for data type '${dto.dataType}': ${dto.value}`);
    }

    const setting = await this.prisma.systemSetting.create({
      data: {
        ...dto,
        updatedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Update cache
    const parsedValue = this.parseSettingValue(setting.value, setting.dataType);
    this.settingsCache.set(setting.key, parsedValue);

    return {
      ...setting,
      parsedValue,
    };
  }

  /**
   * Update setting
   */
  async updateSetting(id: string, dto: UpdateSystemSettingDto, userId: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    // Validate value matches data type
    try {
      this.parseSettingValue(dto.value, setting.dataType);
    } catch (error) {
      throw new BadRequestException(`Invalid value for data type '${setting.dataType}': ${dto.value}`);
    }

    const updated = await this.prisma.systemSetting.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Update cache
    const parsedValue = this.parseSettingValue(updated.value, updated.dataType);
    this.settingsCache.set(updated.key, parsedValue);

    return {
      ...updated,
      parsedValue,
    };
  }

  /**
   * Delete setting
   */
  async deleteSetting(id: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    await this.prisma.systemSetting.delete({
      where: { id },
    });

    // Remove from cache
    this.settingsCache.delete(setting.key);

    return { message: 'Setting deleted successfully' };
  }

  /**
   * Bulk update settings
   */
  async bulkUpdateSettings(settings: Record<string, any>, userId: string) {
    const updates = Object.entries(settings).map(async ([key, value]) => {
      await this.setSetting(key, value, userId);
    });

    await Promise.all(updates);

    return { message: `Updated ${Object.keys(settings).length} settings` };
  }

  /**
   * Clear settings cache
   */
  clearCache(): void {
    this.settingsCache.clear();
    this.logger.log('Settings cache cleared');
  }

  /**
   * Initialize default settings
   */
  private async initializeDefaultSettings(): Promise<void> {
    const defaults = [
      {
        key: 'CREDIT_WARNING_THRESHOLD',
        value: '20',
        dataType: 'number',
        category: 'credit',
        description: 'Credit balance threshold for sending warning notifications (EGP)',
      },
      {
        key: 'CREDIT_CRITICAL_THRESHOLD',
        value: '5',
        dataType: 'number',
        category: 'credit',
        description: 'Credit balance threshold for shutting down devices (EGP)',
      },
      {
        key: 'CREDIT_MONITORING_INTERVAL',
        value: '5',
        dataType: 'number',
        category: 'credit',
        description: 'How often to check credit levels (minutes)',
      },
      {
        key: 'NOTIFICATION_COOLDOWN_HOURS',
        value: '24',
        dataType: 'number',
        category: 'notifications',
        description: 'Hours to wait before sending duplicate notifications',
      },
      {
        key: 'COMPANY_NAME',
        value: 'LifeBox',
        dataType: 'string',
        category: 'general',
        description: 'Company name for notifications and branding',
      },
      {
        key: 'SUPPORT_EMAIL',
        value: 'support@lifebox.com',
        dataType: 'string',
        category: 'general',
        description: 'Support email address',
      },
      {
        key: 'SUPPORT_PHONE',
        value: '+20-xxx-xxx-xxxx',
        dataType: 'string',
        category: 'general',
        description: 'Support phone number',
      },
    ];

    try {
      for (const setting of defaults) {
        const existing = await this.prisma.systemSetting.findUnique({
          where: { key: setting.key },
        });

        if (!existing) {
          await this.prisma.systemSetting.create({
            data: setting,
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to initialize default settings', error);
    }
  }

  /**
   * Parse setting value based on data type
   */
  private parseSettingValue(value: string, dataType: string): any {
    switch (dataType) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Invalid number: ${value}`);
        }
        return num;
      case 'boolean':
        if (value === 'true') return true;
        if (value === 'false') return false;
        throw new Error(`Invalid boolean: ${value}`);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          throw new Error(`Invalid JSON: ${value}`);
        }
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Convert value to string for storage
   */
  private stringifySettingValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Infer data type from value
   */
  private inferDataType(value: any): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') return 'json';
    return 'string';
  }

  /**
   * Get category for setting key
   */
  private getCategoryForKey(key: string): string {
    if (key.startsWith('CREDIT_')) return 'credit';
    if (key.startsWith('NOTIFICATION_')) return 'notifications';
    return 'general';
  }

  /**
   * Get description for setting key
   */
  private getDescriptionForKey(key: string): string {
    const descriptions: Record<string, string> = {
      'CREDIT_WARNING_THRESHOLD': 'Credit balance threshold for sending warning notifications (EGP)',
      'CREDIT_CRITICAL_THRESHOLD': 'Credit balance threshold for shutting down devices (EGP)',
      'CREDIT_MONITORING_INTERVAL': 'How often to check credit levels (minutes)',
      'NOTIFICATION_COOLDOWN_HOURS': 'Hours to wait before sending duplicate notifications',
      'COMPANY_NAME': 'Company name for notifications and branding',
      'SUPPORT_EMAIL': 'Support email address',
      'SUPPORT_PHONE': 'Support phone number',
    };
    return descriptions[key] || 'Custom setting';
  }
}