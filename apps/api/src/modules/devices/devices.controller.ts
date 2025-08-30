import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto, UpdateDeviceDto, CreateDeviceLocationDto, DeviceQueryDto, SendCommandDto } from '../../common/dto/device.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Create new device' })
  create(@Body() createDeviceDto: CreateDeviceDto, @CurrentUser() user: any) {
    return this.devicesService.create(createDeviceDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  findAll(@Query() query: DeviceQueryDto) {
    return this.devicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID' })
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get device statistics' })
  getStats(@Param('id') id: string) {
    return this.devicesService.getDeviceStats(id);
  }

  @Patch(':id')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Update device' })
  update(
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
    @CurrentUser() user: any,
  ) {
    return this.devicesService.update(id, updateDeviceDto, user.id);
  }

  @Delete(':id')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Delete device (soft delete)' })
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }

  @Post(':id/location')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Update device location' })
  updateLocation(
    @Param('id') id: string,
    @Body() locationDto: CreateDeviceLocationDto,
  ) {
    return this.devicesService.updateLocation(id, locationDto);
  }

  @Post(':id/commands')
  @Roles('super_user', 'super_user', 'admin', 'operator')
  @ApiOperation({ summary: 'Send command to device' })
  @ApiResponse({ status: 201, description: 'Command sent successfully' })
  sendCommand(
    @Param('id') id: string,
    @Body() commandDto: SendCommandDto,
    @CurrentUser() user: any,
  ) {
    return this.devicesService.sendCommand(id, commandDto, user.id);
  }

  @Get(':id/commands')
  @Roles('super_user', 'super_user', 'admin', 'operator', 'client')
  @ApiOperation({ summary: 'Get device command history' })
  @ApiResponse({ status: 200, description: 'Command history retrieved' })
  getCommandHistory(@Param('id') id: string, @Query() query: any) {
    return this.devicesService.getCommandHistory(id, query);
  }

  @Get(':id/commands/:commandId')
  @Roles('super_user', 'super_user', 'admin', 'operator', 'client') 
  @ApiOperation({ summary: 'Get specific command details' })
  @ApiResponse({ status: 200, description: 'Command details retrieved' })
  getCommandDetails(
    @Param('id') deviceId: string,
    @Param('commandId') commandId: string,
  ) {
    return this.devicesService.getCommandDetails(deviceId, commandId);
  }

  @Patch(':id/commands/:commandId/status')
  @Roles('super_user', 'super_user', 'admin') 
  @ApiOperation({ summary: 'Update command status (for MQTT service)' })
  @ApiResponse({ status: 200, description: 'Command status updated' })
  updateCommandStatus(
    @Param('id') deviceId: string,
    @Param('commandId') commandId: string,
    @Body() statusUpdate: any,
  ) {
    return this.devicesService.updateCommandStatus(deviceId, commandId, statusUpdate);
  }
}
