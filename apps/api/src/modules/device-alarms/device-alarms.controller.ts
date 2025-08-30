import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeviceAlarmsService } from './device-alarms.service';
import {
  CreateDeviceAlarmDto,
  UpdateDeviceAlarmDto,
  DeviceAlarmQueryDto,
  DeviceAlarmResponseDto
} from '../../common/dto/device-alarm.dto';

@ApiTags('Device Alarms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('device-alarms')
export class DeviceAlarmsController {
  constructor(private readonly deviceAlarmsService: DeviceAlarmsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create device alarm from MQTT',
    description: 'Store device hardware alarm from MQTT message. Used by MQTT ingestion service.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Device alarm created successfully',
    type: DeviceAlarmResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device not found'
  })
  async create(@Body() createDto: CreateDeviceAlarmDto): Promise<DeviceAlarmResponseDto> {
    return this.deviceAlarmsService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get device alarms with filtering',
    description: 'Retrieve device alarms with role-based access control and filtering options'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device alarms retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/DeviceAlarmResponseDto' }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  async findAll(
    @Query() queryDto: DeviceAlarmQueryDto,
    @CurrentUser('sub') userId: string
  ) {
    return this.deviceAlarmsService.findAll(queryDto, userId);
  }

  @Get('statistics')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get device alarm statistics',
    description: 'Get aggregated statistics about device alarms with role-based filtering'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total alarms' },
        active: { type: 'number', description: 'Active (unresolved) alarms' },
        resolved: { type: 'number', description: 'Resolved alarms' },
        critical: { type: 'number', description: 'Critical severity alarms' },
        warning: { type: 'number', description: 'Warning severity alarms' },
        info: { type: 'number', description: 'Info severity alarms' },
        byType: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              count: { type: 'number' }
            }
          }
        },
        recent: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              title: { type: 'string' },
              severity: { type: 'number' },
              receivedAt: { type: 'string' },
              device: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  deviceName: { type: 'string' },
                  deviceCode: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  })
  async getStatistics(@CurrentUser('sub') userId: string) {
    return this.deviceAlarmsService.getStatistics(userId);
  }

  @Get(':id')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get device alarm by ID',
    description: 'Retrieve specific device alarm with role-based access control'
  })
  @ApiParam({ name: 'id', description: 'Device alarm ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device alarm retrieved successfully',
    type: DeviceAlarmResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device alarm not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this device alarm'
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string
  ): Promise<DeviceAlarmResponseDto> {
    return this.deviceAlarmsService.findOne(id, userId);
  }

  @Put(':id/resolve')
  @Roles('super_user', 'super_admin', 'admin')
  @ApiOperation({
    summary: 'Resolve device alarm',
    description: 'Mark device alarm as resolved. Only Super Users and Admins can resolve alarms.'
  })
  @ApiParam({ name: 'id', description: 'Device alarm ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device alarm resolved successfully',
    type: DeviceAlarmResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device alarm not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only Super Users and Admins can resolve device alarms'
  })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() updateDto: UpdateDeviceAlarmDto
  ): Promise<DeviceAlarmResponseDto> {
    return this.deviceAlarmsService.resolve(id, userId, updateDto);
  }

  @Get('device/:deviceId')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get alarms for specific device',
    description: 'Retrieve all alarms for a specific device with role-based access control'
  })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device alarms retrieved successfully'
  })
  async findByDevice(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query() queryDto: DeviceAlarmQueryDto,
    @CurrentUser('sub') userId: string
  ) {
    const deviceSpecificQuery = { ...queryDto, deviceId };
    return this.deviceAlarmsService.findAll(deviceSpecificQuery, userId);
  }
}