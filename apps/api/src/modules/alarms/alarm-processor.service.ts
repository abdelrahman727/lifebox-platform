import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationCategory, NotificationPriority } from '../notifications/dto/notification-request.dto';
import { DeviceControlService } from '../payment/services/device-control.service';

export interface TelemetryDataPoint {
  deviceId: string;
  timestamp: Date;
  data: Record<string, any>;
}

export interface AlarmTriggerResult {
  ruleId: string;
  ruleName: string;
  deviceId: string;
  metricName: string;
  triggeredValue: number;
  thresholdValue: number;
  condition: string;
  severity: string;
  eventId: string;
}

@Injectable()
export class AlarmProcessorService {
  private readonly logger = new Logger(AlarmProcessorService.name);
  private readonly debounceCache = new Map<string, { value: number; timestamp: Date }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly deviceControlService: DeviceControlService,
  ) {}

  /**
   * Process telemetry data and check for alarm conditions
   */
  async processTelemetryData(telemetryData: TelemetryDataPoint): Promise<AlarmTriggerResult[]> {
    try {
      const { deviceId, data, timestamp } = telemetryData;
      
      // Get all active alarm rules for this device or global rules
      const alarmRules = await this.getActiveAlarmRules(deviceId);
      
      if (alarmRules.length === 0) {
        return [];
      }

      const triggeredAlarms: AlarmTriggerResult[] = [];

      for (const rule of alarmRules) {
        try {
          const metricValue = this.extractMetricValue(data, rule.metricName);
          
          if (metricValue === null || metricValue === undefined) {
            continue; // Skip if metric not found in data
          }

          const shouldTrigger = await this.evaluateAlarmCondition(
            rule,
            metricValue,
            timestamp,
            deviceId
          );

          if (shouldTrigger) {
            const alarmEvent = await this.createAlarmEvent(rule, deviceId, metricValue, timestamp);
            
            // Trigger reactions (SMS, email, notifications)
            await this.executeAlarmReactions(rule, alarmEvent, deviceId);

            triggeredAlarms.push({
              ruleId: rule.id,
              ruleName: rule.name,
              deviceId,
              metricName: rule.metricName,
              triggeredValue: metricValue,
              thresholdValue: rule.thresholdValue,
              condition: rule.condition,
              severity: rule.severity,
              eventId: alarmEvent.id,
            });

            this.logger.warn(`Alarm triggered: ${rule.name} for device ${deviceId}. Value: ${metricValue}, Threshold: ${rule.thresholdValue}`);
          }
        } catch (error) {
          this.logger.error(`Error processing alarm rule ${rule.id}: ${error.message}`);
        }
      }

      return triggeredAlarms;
    } catch (error) {
      this.logger.error(`Error processing telemetry data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process batch telemetry data
   */
  async processTelemetryBatch(telemetryBatch: TelemetryDataPoint[]): Promise<AlarmTriggerResult[]> {
    const allTriggeredAlarms: AlarmTriggerResult[] = [];

    for (const telemetryData of telemetryBatch) {
      try {
        const triggeredAlarms = await this.processTelemetryData(telemetryData);
        allTriggeredAlarms.push(...triggeredAlarms);
      } catch (error) {
        this.logger.error(`Error processing telemetry batch item: ${error.message}`);
      }
    }

    return allTriggeredAlarms;
  }

  private async getActiveAlarmRules(deviceId: string) {
    return this.prisma.alarmRule.findMany({
      where: {
        enabled: true,
        OR: [
          { deviceId: deviceId },
          { deviceId: null }, // Global rules
        ],
      },
      include: {
        reactions: {
          where: { enabled: true },
        },
      },
    });
  }

  private extractMetricValue(data: Record<string, any>, metricName: string): number | null {
    // Support nested metric names like "inverter.temperature" or "battery.voltage"
    const keys = metricName.split('.');
    let value = data;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Try common alias mappings for backward compatibility
        value = this.tryAliasMapping(data, metricName);
        break;
      }
    }

    // Convert to number if possible
    const numValue = Number(value);
    return isNaN(numValue) ? null : numValue;
  }

  /**
   * Try to map common metric name aliases to actual telemetry field names
   */
  private tryAliasMapping(data: Record<string, any>, metricName: string): any {
    const aliasMap: Record<string, string[]> = {
      // Common aliases for new telemetry fields
      'temperature': ['inverterTemperatureValue', 'inverter_temperature_value'],
      'voltage': ['busVoltageValue', 'bus_voltage_value'],
      'power': ['pumpPowerValue', 'pump_power_value'],
      'current': ['pumpCurrentValue', 'pump_current_value'],
      'frequency': ['frequencyValue', 'frequency_value'],
      'energy': ['energyPerDayValue', 'energy_per_day_value', 'totalEnergyValue', 'total_energy_value'],
      'pressure': ['pressureSensorValue', 'pressure_sensor_value'],
      'water': ['totalWaterVolumeM3Value', 'total_water_volume_m3_value'],
      'motorSpeed': ['motorSpeedValue', 'motor_speed_value'],
      'tds': ['tdsValue', 'tds_sensor_value'],
      'level': ['levelSensorValue', 'level_sensor_value'],
      
      // Nested field aliases
      'inverter.temperature': ['inverterTemperatureValue', 'inverter_temperature_value'],
      'inverter.tempC': ['inverterTemperatureValue', 'inverter_temperature_value'],
      'pump.power': ['pumpPowerValue', 'pump_power_value'],
      'pump.current': ['pumpCurrentValue', 'pump_current_value'],
      'bus.voltage': ['busVoltageValue', 'bus_voltage_value'],
      'motor.speed': ['motorSpeedValue', 'motor_speed_value'],
      'water.volume': ['totalWaterVolumeM3Value', 'total_water_volume_m3_value'],
      'water.flow': ['waterPumpedFlowRatePerHourValue', 'water_pumped_flow_rate_per_hour_value'],
    };

    // Check if we have aliases for this metric name
    const aliases = aliasMap[metricName] || [];
    
    for (const alias of aliases) {
      if (alias in data && data[alias] !== null && data[alias] !== undefined) {
        return data[alias];
      }
    }

    // Direct lookup as fallback
    return data[metricName] || null;
  }

  private async evaluateAlarmCondition(
    rule: any,
    currentValue: number,
    timestamp: Date,
    deviceId: string
  ): Promise<boolean> {
    // Check basic condition
    const conditionMet = this.checkCondition(currentValue, rule.condition, rule.thresholdValue);
    
    if (!conditionMet) {
      return false;
    }

    // Check threshold duration (debouncing)
    if (rule.thresholdDurationSeconds > 0) {
      const cacheKey = `${rule.id}_${deviceId}`;
      const cached = this.debounceCache.get(cacheKey);
      
      if (cached) {
        const durationMs = timestamp.getTime() - cached.timestamp.getTime();
        const requiredDurationMs = rule.thresholdDurationSeconds * 1000;
        
        if (durationMs >= requiredDurationMs) {
          // Condition has been met for required duration
          this.debounceCache.delete(cacheKey); // Clear cache after triggering
          return true;
        } else {
          // Update cache with current value
          this.debounceCache.set(cacheKey, { value: currentValue, timestamp });
          return false;
        }
      } else {
        // First time condition is met, start debounce timer
        this.debounceCache.set(cacheKey, { value: currentValue, timestamp });
        return false;
      }
    }

    // Check for duplicate alarms (prevent spam)
    const recentAlarm = await this.prisma.alarmEvent.findFirst({
      where: {
        alarmRuleId: rule.id,
        deviceId: deviceId,
        resolvedAt: null,
        triggeredAt: {
          gte: new Date(timestamp.getTime() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    return !recentAlarm; // Only trigger if no recent unresolved alarm
  }

  private checkCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      case 'spike': 
        // For spike detection, we'd need historical data comparison
        // This is a simplified implementation
        return value > threshold;
      case 'drop': 
        // For drop detection, we'd need historical data comparison
        // This is a simplified implementation
        return value < threshold;
      default: return false;
    }
  }

  private async createAlarmEvent(rule: any, deviceId: string, triggeredValue: number, timestamp: Date) {
    const defaultMessage = `${rule.name}: ${rule.metricName} = ${triggeredValue} (threshold: ${rule.thresholdValue})`;
    
    // We'll create a temporary alarm event object to use for message generation
    const tempAlarmEvent = {
      alarmRule: rule,
      severity: rule.severity,
      triggeredAt: timestamp,
      triggeredValue: triggeredValue,
    };
    
    // Get device info for message generation
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        client: {
          select: {
            name: true,
          },
        },
      },
    });
    
    // Generate custom dashboard message if template exists
    const message = this.generateCustomMessage(
      rule.customDashboardMessage, 
      tempAlarmEvent, 
      device, 
      triggeredValue, 
      defaultMessage
    );
    
    return this.prisma.alarmEvent.create({
      data: {
        alarmRuleId: rule.id,
        deviceId: deviceId,
        severity: rule.severity,
        triggeredValue: triggeredValue,
        message: message,
        triggeredAt: timestamp,
      },
      include: {
        alarmRule: true,
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceCode: true,
            client: {
              select: {
                id: true,
                name: true,
                phoneNumber1: true,
                phoneNumber2: true,
                phoneNumber3: true,
                users: {
                  take: 1,
                  select: {
                    id: true,
                    email: true,
                    phone: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private async executeAlarmReactions(rule: any, alarmEvent: any, deviceId: string) {
    if (!rule.reactions || rule.reactions.length === 0) {
      return;
    }

    const device = alarmEvent.device;
    const client = device?.client;

    for (const reaction of rule.reactions) {
      try {
        await this.executeReaction(reaction, alarmEvent, device, client);
      } catch (error) {
        this.logger.error(`Failed to execute reaction ${reaction.id}: ${error.message}`);
      }
    }
  }

  private async executeReaction(reaction: any, alarmEvent: any, device: any, client: any) {
    const { reactionType, reactionConfig } = reaction;

    switch (reactionType) {
      case 'dashboard':
        // Dashboard notifications are handled by creating the alarm event
        // The frontend will show these in real-time
        break;

      case 'sms':
        await this.sendSmsNotification(alarmEvent, device, client, reactionConfig);
        break;

      case 'email':
        await this.sendEmailNotification(alarmEvent, device, client, reactionConfig);
        break;

      case 'shutdown':
        await this.executeShutdownReaction(alarmEvent, device, reactionConfig);
        break;

      case 'command':
        await this.executeCommandReaction(alarmEvent, device, reactionConfig);
        break;

      default:
        this.logger.warn(`Unknown reaction type: ${reactionType}`);
    }
  }

  private async sendSmsNotification(alarmEvent: any, device: any, client: any, config: any) {
    try {
      // Generate custom SMS message if template exists
      const defaultMessage = `LIFEBOX ALERT: ${alarmEvent.message} on ${device?.deviceName || device?.deviceCode}`;
      const customTemplate = alarmEvent.alarmRule?.customSmsMessage;
      const message = this.generateCustomMessage(
        customTemplate, 
        alarmEvent, 
        device, 
        alarmEvent.triggeredValue || 0, 
        defaultMessage
      );
      
      // Send to client's phone numbers
      if (client) {
        await this.notificationsService.sendSmsToClient(client.id, message);
      }

      // Send to configured phone numbers in reaction config
      if (config?.phoneNumbers && Array.isArray(config.phoneNumbers)) {
        for (const phone of config.phoneNumbers) {
          try {
            await this.notificationsService.sendNotification({
              type: NotificationType.SMS,
              priority: this.getSeverityPriority(alarmEvent.severity) as NotificationPriority,
              category: NotificationCategory.ALARM,
              recipientId: client?.users?.[0]?.id || 'system',
              title: 'Alarm Alert',
              message: message,
            }, 'system');
          } catch (error) {
            this.logger.error(`Failed to send SMS to ${phone}: ${error.message}`);
          }
        }
      }

      this.logger.log(`SMS alarm notification sent for event ${alarmEvent.id}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS notification: ${error.message}`);
      throw error;
    }
  }

  private async sendEmailNotification(alarmEvent: any, device: any, client: any, config: any) {
    try {
      const subject = `🚨 LifeBox Alert: ${alarmEvent.alarmRule.name}`;
      
      // Generate custom email message if template exists
      const defaultHtmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #d32f2f;">🚨 Alarm Alert</h2>
          <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #d32f2f;">
            <p><strong>Device:</strong> ${device?.deviceName || device?.deviceCode}</p>
            <p><strong>Alarm:</strong> ${alarmEvent.alarmRule.name}</p>
            <p><strong>Message:</strong> ${alarmEvent.message}</p>
            <p><strong>Severity:</strong> <span style="color: ${this.getSeverityColor(alarmEvent.severity)}; text-transform: uppercase;">${alarmEvent.severity}</span></p>
            <p><strong>Time:</strong> ${alarmEvent.triggeredAt.toLocaleString()}</p>
          </div>
          <p style="margin-top: 20px; color: #666;">
            Please check your LifeBox dashboard for more details and to acknowledge this alarm.
          </p>
        </div>
      `;
      
      const customTemplate = alarmEvent.alarmRule?.customEmailMessage;
      const htmlMessage = this.generateCustomMessage(
        customTemplate, 
        alarmEvent, 
        device, 
        alarmEvent.triggeredValue || 0, 
        defaultHtmlMessage
      );

      // Send to client's primary user
      if (client?.users?.[0]?.email) {
        await this.notificationsService.sendNotification({
          type: NotificationType.EMAIL,
          priority: this.getSeverityPriority(alarmEvent.severity) as NotificationPriority,
          category: NotificationCategory.ALARM,
          recipientId: client.users[0].id,
          title: subject,
          message: htmlMessage,
        }, 'system');
      }

      // Send to configured emails in reaction config
      if (config?.emails && Array.isArray(config.emails)) {
        for (const email of config.emails) {
          try {
            await this.notificationsService.sendNotification({
              type: NotificationType.EMAIL,
              priority: this.getSeverityPriority(alarmEvent.severity) as NotificationPriority,
              category: NotificationCategory.ALARM,
              recipientId: client?.users?.[0]?.id || 'system',
              title: subject,
              message: htmlMessage,
            }, 'system');
          } catch (error) {
            this.logger.error(`Failed to send email to ${email}: ${error.message}`);
          }
        }
      }

      this.logger.log(`Email alarm notification sent for event ${alarmEvent.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
      throw error;
    }
  }

  private async executeShutdownReaction(alarmEvent: any, device: any, config: any) {
    try {
      // For shutdown reactions, we could:
      // 1. Send MQTT command to stop the device
      // 2. Update device status in database
      // 3. Log the shutdown action
      
      this.logger.warn(`Shutdown reaction triggered for device ${device?.deviceCode} due to alarm: ${alarmEvent.message}`);
      
      // Here you would integrate with your device control system
      // For now, we'll just log it
      
      // Example: Send MQTT command to shutdown device
      // await this.mqttService.publish(`devices/${device.deviceCode}/control`, { command: 'shutdown', reason: 'alarm' });
      
    } catch (error) {
      this.logger.error(`Failed to execute shutdown reaction: ${error.message}`);
      throw error;
    }
  }

  private async executeCommandReaction(alarmEvent: any, device: any, config: any) {
    try {
      if (!config?.commandType) {
        this.logger.warn(`Command reaction missing commandType in config for alarm ${alarmEvent.id}`);
        return;
      }

      const commandType = config.commandType;
      const reason = config.reason || `Automatic command triggered by alarm: ${alarmEvent.alarmRule.name}`;
      
      this.logger.warn(`Command reaction triggered for device ${device?.deviceCode}: ${commandType} - ${reason}`);

      // Send command via DeviceControlService
      const commandId = await this.deviceControlService.sendDeviceCommand(
        device.id,
        commandType,
        reason,
        config.payload || {},
        'system' // system user for automated commands
      );

      // Log the command execution in alarm event notes or create audit log
      await this.prisma.alarmEvent.update({
        where: { id: alarmEvent.id },
        data: {
          message: `${alarmEvent.message} | Command sent: ${commandType} (${commandId})`
        }
      });

      this.logger.log(`Command reaction executed successfully for alarm ${alarmEvent.id}: ${commandType} (command ID: ${commandId})`);
      
    } catch (error) {
      this.logger.error(`Failed to execute command reaction for alarm ${alarmEvent.id}: ${error.message}`);
      
      // Update alarm event with error information
      try {
        await this.prisma.alarmEvent.update({
          where: { id: alarmEvent.id },
          data: {
            message: `${alarmEvent.message} | Command failed: ${error.message}`
          }
        });
      } catch (updateError) {
        this.logger.error(`Failed to update alarm event with command error: ${updateError.message}`);
      }
      
      throw error;
    }
  }

  private getSeverityPriority(severity: string): string {
    const priorityMap = {
      'info': 'normal',
      'warning': 'normal',
      'critical': 'high',
      'emergency': 'critical',
    };
    return priorityMap[severity] || 'normal';
  }

  private getSeverityColor(severity: string): string {
    const colorMap = {
      'info': '#2196f3',
      'warning': '#ff9800',
      'critical': '#f44336',
      'emergency': '#d32f2f',
    };
    return colorMap[severity] || '#666';
  }

  /**
   * Generate custom message using template with variable substitution
   */
  private generateCustomMessage(
    template: string | null, 
    alarmEvent: any, 
    device: any, 
    triggeredValue: number,
    fallbackMessage: string
  ): string {
    if (!template) {
      return fallbackMessage;
    }

    // Available template variables
    const variables = {
      deviceName: device?.deviceName || device?.deviceCode || 'Unknown Device',
      deviceId: device?.id || 'N/A',
      ruleName: alarmEvent.alarmRule?.name || 'Alarm Rule',
      metricName: alarmEvent.alarmRule?.metricName || 'metric',
      value: triggeredValue,
      threshold: alarmEvent.alarmRule?.thresholdValue || 0,
      condition: this.getConditionText(alarmEvent.alarmRule?.condition),
      severity: alarmEvent.severity?.toUpperCase() || 'UNKNOWN',
      time: alarmEvent.triggeredAt?.toLocaleString() || new Date().toLocaleString(),
      clientName: device?.client?.name || 'Unknown Client',
    };

    // Replace template variables
    let message = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      message = message.replace(regex, String(value));
    });

    return message;
  }

  /**
   * Convert condition enum to human readable text
   */
  private getConditionText(condition: string): string {
    const conditionMap = {
      'gt': 'greater than',
      'lt': 'less than', 
      'gte': 'greater than or equal to',
      'lte': 'less than or equal to',
      'eq': 'equal to',
      'neq': 'not equal to',
      'spike': 'spiked above',
      'drop': 'dropped below',
    };
    return conditionMap[condition] || condition;
  }

  /**
   * Clean up debounce cache periodically
   */
  cleanupDebounceCache() {
    const now = new Date();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, cached] of this.debounceCache.entries()) {
      if (now.getTime() - cached.timestamp.getTime() > maxAge) {
        this.debounceCache.delete(key);
      }
    }
  }

  /**
   * Manually trigger alarm for testing
   */
  async triggerTestAlarm(ruleId: string, testValue: number): Promise<AlarmTriggerResult | null> {
    try {
      const rule = await this.prisma.alarmRule.findUnique({
        where: { id: ruleId },
        include: { reactions: true },
      });

      if (!rule) {
        throw new Error('Alarm rule not found');
      }

      const mockTelemetryData: TelemetryDataPoint = {
        deviceId: rule.deviceId || 'test-device',
        timestamp: new Date(),
        data: { [rule.metricName]: testValue },
      };

      const triggeredAlarms = await this.processTelemetryData(mockTelemetryData);
      return triggeredAlarms[0] || null;
    } catch (error) {
      this.logger.error(`Failed to trigger test alarm: ${error.message}`);
      throw error;
    }
  }
}