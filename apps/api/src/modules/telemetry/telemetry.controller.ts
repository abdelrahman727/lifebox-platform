import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { DeviceMetadataContextService } from './device-metadata-context.service';
import { TelemetryQueryDto, CreateTelemetryDto, WaterVolumeQueryDto } from '../../common/dto/telemetry.dto';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@ApiTags('telemetry')
@ApiBearerAuth()
@Controller('devices/:deviceId/telemetry')
export class TelemetryController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly metadataContextService: DeviceMetadataContextService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create telemetry data for device from MQTT service' })
  create(
    @Param('deviceId') deviceId: string,
    @Body() createTelemetryDto: CreateTelemetryDto,
  ) {
    return this.telemetryService.create(deviceId, createTelemetryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get telemetry data' })
  findAll(
    @Param('deviceId') deviceId: string,
    @Query() query: TelemetryQueryDto,
  ) {
    return this.telemetryService.findAll(deviceId, query);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest telemetry data' })
  findLatest(@Param('deviceId') deviceId: string) {
    return this.telemetryService.findLatest(deviceId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get telemetry statistics' })
  getStatistics(
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.telemetryService.getStatistics(deviceId, startDate, endDate);
  }

  @Get('water-volume')
  @ApiOperation({ summary: 'Get water volume data' })
  getWaterVolume(
    @Param('deviceId') deviceId: string,
    @Query() query: WaterVolumeQueryDto,
  ) {
    return this.telemetryService.getWaterVolume(deviceId, query);
  }

  @Get('sustainability')
  @ApiOperation({ summary: 'Get sustainability metrics' })
  getSustainabilityMetrics(
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.telemetryService.getSustainabilityMetrics(deviceId, startDate, endDate);
  }

  // Device Metadata Context Endpoints

  @Get('metadata/current')
  @ApiOperation({ summary: 'Get current device metadata snapshot' })
  getCurrentMetadata(@Param('deviceId') deviceId: string) {
    return this.metadataContextService.getCurrentMetadataSnapshot(deviceId);
  }

  @Get('metadata/history')
  @ApiOperation({ summary: 'Get device metadata snapshot at specific time' })
  getMetadataAtTime(
    @Param('deviceId') deviceId: string,
    @Query('timestamp') timestamp: string,
  ) {
    return this.metadataContextService.getMetadataSnapshotAtTime(deviceId, new Date(timestamp));
  }

  @Get('metadata/change-impact')
  @ApiOperation({ summary: 'Get metadata change impact analysis' })
  getMetadataChangeImpact(
    @Param('deviceId') deviceId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.metadataContextService.getMetadataChangeImpact(
      deviceId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined
    );
  }

  @Post('filter/configuration')
  @ApiOperation({ summary: 'Filter telemetry by device configuration' })
  filterByConfiguration(@Body() filters: {
    configurationHash?: string;
    deviceType?: string;
    installationDateAfter?: string;
    installationDateBefore?: string;
    contractReference?: string;
    components?: Record<string, any>;
    startDate?: string;
    endDate?: string;
  }) {
    const parsedFilters = {
      ...filters,
      installationDateAfter: filters.installationDateAfter ? new Date(filters.installationDateAfter) : undefined,
      installationDateBefore: filters.installationDateBefore ? new Date(filters.installationDateBefore) : undefined,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };
    return this.telemetryService.filterByConfiguration(parsedFilters);
  }
}
