import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeviceMetadataContextService } from './device-metadata-context.service';

@ApiTags('metadata-context')
@ApiBearerAuth()
@Controller('metadata-context')
export class MetadataContextController {
  constructor(private readonly metadataContextService: DeviceMetadataContextService) {}

  @Get('devices/by-configuration')
  @ApiOperation({ summary: 'Get devices grouped by configuration hash' })
  getDevicesByConfiguration() {
    return this.metadataContextService.getDevicesByConfiguration();
  }

  @Post('telemetry/filter')
  @ApiOperation({ summary: 'Filter all telemetry by device configuration (cross-device)' })
  filterAllTelemetryByConfiguration(@Body() filters: {
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
    return this.metadataContextService.filterTelemetryByConfiguration(parsedFilters);
  }

  @Get('configuration/diff')
  @ApiOperation({ summary: 'Compare two device configurations' })
  getConfigurationDiff(
    @Query('hash1') hash1: string,
    @Query('hash2') hash2: string,
  ) {
    return this.metadataContextService.getConfigurationDiff(hash1, hash2);
  }

  @Get('unknown-fields')
  @ApiOperation({ summary: 'Get all unknown fields with device context' })
  async getUnknownFieldsWithContext() {
    // This method would be added to the service to retrieve unknown fields with their device contexts
    return { message: 'Unknown fields endpoint - implementation pending' };
  }

  @Get('analytics/configuration-impact')
  @ApiOperation({ summary: 'Analyze impact of different configurations on performance' })
  async analyzeConfigurationImpact(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // This would analyze performance metrics across different configuration groups
    return { 
      message: 'Configuration impact analysis - implementation pending',
      filters: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }
    };
  }
}