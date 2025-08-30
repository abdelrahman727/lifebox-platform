import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { AlarmsService } from './alarms.service';
import { AlarmProcessorService } from './alarm-processor.service';
import { CreateAlarmRuleDto, UpdateAlarmRuleDto, AlarmEventQueryDto, AcknowledgeAlarmDto, TestAlarmDto, AlarmCategory, AlarmCondition, AlarmSeverity, ReactionType } from '../../common/dto/alarm.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsNumber, IsString } from 'class-validator';

class ProcessTelemetryDto {
  @ApiProperty({ example: 'device-123' })
  @IsString()
  deviceId: string;

  @ApiProperty({ 
    example: { 
      temperature: 75, 
      voltage: 12.5, 
      'inverter.tempC': 55 
    } 
  })
  data: Record<string, any>;
}

class TriggerTestAlarmDto {
  @ApiProperty({ example: 75 })
  @IsNumber()
  testValue: number;
}

@ApiTags('alarms')
@ApiBearerAuth()
@Controller('alarms')
export class AlarmsController {
  constructor(
    private readonly alarmsService: AlarmsService,
    private readonly alarmProcessor: AlarmProcessorService,
  ) {}

  // Alarm Rules
  @Post('rules')
  @Roles('super_user', 'super_admin', 'admin')
  @ApiOperation({ summary: 'Create alarm rule' })
  createRule(@Body() createAlarmRuleDto: CreateAlarmRuleDto, @CurrentUser() user: any) {
    return this.alarmsService.createRule(createAlarmRuleDto, user.id);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get all alarm rules' })
  findAllRules(@Query('deviceId') deviceId?: string) {
    return this.alarmsService.findAllRules(deviceId);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get alarm rule by ID' })
  findOneRule(@Param('id') id: string) {
    return this.alarmsService.findOneRule(id);
  }

  @Patch('rules/:id')
  @Roles('super_user', 'super_admin', 'admin')
  @ApiOperation({ summary: 'Update alarm rule' })
  updateRule(@Param('id') id: string, @Body() updateAlarmRuleDto: UpdateAlarmRuleDto) {
    return this.alarmsService.updateRule(id, updateAlarmRuleDto);
  }

  @Delete('rules/:id')
  @Roles('super_user', 'super_admin')
  @ApiOperation({ summary: 'Delete alarm rule' })
  removeRule(@Param('id') id: string) {
    return this.alarmsService.removeRule(id);
  }

  @Post('rules/:id/test')
  @ApiOperation({ summary: 'Test alarm rule' })
  testRule(@Param('id') id: string, @Body() testDto: TestAlarmDto) {
    return this.alarmsService.testAlarmRule(id, testDto.testValue);
  }

  // Alarm Events
  @Get('events')
  @ApiOperation({ summary: 'Get all alarm events' })
  findAllEvents(@Query() query: AlarmEventQueryDto) {
    return this.alarmsService.findAllEvents(query);
  }

  @Post('events/:id/acknowledge')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator')
  @ApiOperation({ summary: 'Acknowledge alarm event' })
  acknowledgeEvent(
    @Param('id') id: string,
    @Body() acknowledgeDto: AcknowledgeAlarmDto,
    @CurrentUser() user: any,
  ) {
    return this.alarmsService.acknowledgeEvent(id, acknowledgeDto, user.id);
  }

  @Post('events/:id/resolve')
  @Roles('super_user', 'super_admin', 'admin', 'operator')
  @ApiOperation({ summary: 'Resolve alarm event' })
  resolveEvent(@Param('id') id: string) {
    return this.alarmsService.resolveEvent(id);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get alarm statistics' })
  getStatistics(@Query('deviceId') deviceId?: string) {
    return this.alarmsService.getAlarmStatistics(deviceId);
  }

  // Alarm Processing Endpoints

  @Post('process-telemetry')
  @Roles('super_user', 'super_admin', 'admin', 'system')
  @ApiOperation({ 
    summary: 'Process telemetry data for alarm checking',
    description: 'Manually process telemetry data against alarm rules (used by MQTT ingestion service)',
  })
  @ApiResponse({
    status: 200,
    description: 'Telemetry processed, returns any triggered alarms',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        triggeredAlarms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ruleId: { type: 'string' },
              ruleName: { type: 'string' },
              deviceId: { type: 'string' },
              metricName: { type: 'string' },
              triggeredValue: { type: 'number' },
              thresholdValue: { type: 'number' },
              condition: { type: 'string' },
              severity: { type: 'string' },
              eventId: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async processTelemetryData(@Body() telemetryDto: ProcessTelemetryDto) {
    const triggeredAlarms = await this.alarmProcessor.processTelemetryData({
      deviceId: telemetryDto.deviceId,
      timestamp: new Date(),
      data: telemetryDto.data,
    });

    return {
      success: true,
      triggeredAlarms,
      message: `Processed telemetry for device ${telemetryDto.deviceId}, triggered ${triggeredAlarms.length} alarms`,
    };
  }

  @Post('rules/:id/trigger-test')
  @Roles('super_user', 'admin')
  @ApiOperation({ 
    summary: 'Trigger test alarm',
    description: 'Manually trigger an alarm rule with a test value to verify notifications work',
  })
  @ApiResponse({
    status: 200,
    description: 'Test alarm triggered successfully',
  })
  async triggerTestAlarm(
    @Param('id') ruleId: string,
    @Body() testDto: TriggerTestAlarmDto,
  ) {
    const result = await this.alarmProcessor.triggerTestAlarm(ruleId, testDto.testValue);
    
    return {
      success: !!result,
      triggeredAlarm: result,
      message: result 
        ? `Test alarm triggered successfully for rule ${ruleId}` 
        : `No alarm triggered - condition not met for rule ${ruleId}`,
    };
  }

  @Post('cleanup-cache')
  @Roles('super_user', 'admin')
  @ApiOperation({ 
    summary: 'Clean up alarm debounce cache',
    description: 'Manually clean up the alarm debounce cache (normally done automatically)',
  })
  cleanupCache() {
    this.alarmProcessor.cleanupDebounceCache();
    return {
      success: true,
      message: 'Alarm debounce cache cleaned up',
    };
  }

  @Post('demo/setup-temperature-alert')
  @Roles('super_user', 'admin')
  @ApiOperation({ 
    summary: 'Demo: Setup temperature alert system',
    description: 'Create a demo temperature alert rule that sends SMS/Email when temperature > 100°C',
  })
  async setupTemperatureDemo(@CurrentUser() user: any) {
    try {
      // Create a demo alarm rule for high temperature with custom messages
      const tempAlarmRule = await this.alarmsService.createRule({
        name: 'High Temperature Alert Demo',
        alarmCategory: AlarmCategory.CUSTOM,
        metricName: 'temperature', // Can also use 'inverterTempC' or 'inverter.temperature'
        condition: AlarmCondition.GT, // Greater than
        thresholdValue: 100,
        thresholdDurationSeconds: 10, // Wait 10 seconds before triggering
        severity: AlarmSeverity.CRITICAL,
        enabled: true,
        customSmsMessage: 'URGENT: {deviceName} temperature is {value}°C! This exceeds the safe threshold of {threshold}°C. Immediate attention required!',
        customEmailMessage: '<div style="background:#f44336;color:white;padding:20px;"><h2> Temperature Alert</h2><p>Device <strong>{deviceName}</strong> has reached a critical temperature of <strong>{value}°C</strong> which is {condition} the threshold of <strong>{threshold}°C</strong>.</p><p><strong>Time:</strong> {time}</p><p><strong>Severity:</strong> {severity}</p><p>Please check the device immediately to prevent damage.</p></div>',
        customDashboardMessage: '{severity} Alert: {deviceName} temperature {value}°C > {threshold}°C at {time}',
        reactions: [
          {
            reactionType: ReactionType.DASHBOARD,
            enabled: true,
          },
          {
            reactionType: ReactionType.SMS,
            enabled: true,
            reactionConfig: {
              phoneNumbers: ['+201234567890'], // Add demo phone numbers
            },
          },
          {
            reactionType: ReactionType.EMAIL,
            enabled: true,
            reactionConfig: {
              emails: ['admin@lifebox.com'], // Add demo emails
            },
          },
        ],
      }, user.id);

      // Create additional demo rules for other metrics
      const lowBatteryRule = await this.alarmsService.createRule({
        name: 'Low Battery Alert Demo',
        alarmCategory: AlarmCategory.CUSTOM,
        metricName: 'batteryCapacity',
        condition: AlarmCondition.LT, // Less than
        thresholdValue: 20, // 20% battery
        severity: AlarmSeverity.WARNING,
        enabled: true,
        customSmsMessage: 'LOW BATTERY WARNING: {deviceName} battery at {value}% (below {threshold}%). Please check solar charging system.',
        customDashboardMessage: 'Battery Warning: {deviceName} at {value}% capacity (threshold: {threshold}%)',
        reactions: [
          {
            reactionType: ReactionType.DASHBOARD,
            enabled: true,
          },
          {
            reactionType: ReactionType.SMS,
            enabled: true,
          },
        ],
      }, user.id);

      const highPowerRule = await this.alarmsService.createRule({
        name: 'High Power Consumption Alert Demo',
        alarmCategory: AlarmCategory.CUSTOM,
        metricName: 'power', // Maps to pumpPowerKw
        condition: AlarmCondition.GT,
        thresholdValue: 5, // 5kW
        severity: AlarmSeverity.WARNING,
        enabled: true,
        customEmailMessage: '<h3>⚡ Power Consumption Alert</h3><p>Device {deviceName} is consuming <strong>{value}kW</strong> power, which exceeds the threshold of <strong>{threshold}kW</strong>.</p><p>This may indicate higher than normal load or efficiency issues.</p><p><strong>Client:</strong> {clientName}</p><p><strong>Detected at:</strong> {time}</p>',
        customDashboardMessage: '⚡ High Power: {deviceName} consuming {value}kW (limit: {threshold}kW)',
        reactions: [
          {
            reactionType: ReactionType.DASHBOARD,
            enabled: true,
          },
          {
            reactionType: ReactionType.EMAIL,
            enabled: true,
          },
        ],
      }, user.id);

      return {
        success: true,
        message: 'Demo alarm rules created successfully',
        rules: [
          {
            id: tempAlarmRule.id,
            name: tempAlarmRule.name,
            condition: `temperature > 100°C`,
            reactions: ['dashboard', 'SMS', 'email'],
          },
          {
            id: lowBatteryRule.id,
            name: lowBatteryRule.name,
            condition: 'batteryCapacity < 20%',
            reactions: ['dashboard', 'SMS'],
          },
          {
            id: highPowerRule.id,
            name: highPowerRule.name,
            condition: 'power > 5kW',
            reactions: ['dashboard', 'email'],
          },
        ],
        testInstructions: {
          message: 'To test the alerts, send telemetry data with high values:',
          endpoints: [
            'POST /alarms/process-telemetry - Send test telemetry data',
            'POST /alarms/rules/{id}/trigger-test - Directly trigger specific rule',
          ],
          exampleTelemetryData: {
            deviceId: 'test-device-123',
            data: {
              temperature: 105, // Will trigger temperature alert
              batteryCapacity: 15, // Will trigger battery alert
              power: 6, // Will trigger power alert
            },
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to setup demo: ${error.message}`,
      };
    }
  }
}
