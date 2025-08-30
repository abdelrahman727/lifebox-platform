import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { GenerateReportDto, ReportType, ReportFormat, ReportPeriod } from './dto/report-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Generate a new report
   */
  @Post('generate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate a new report',
    description: 'Generate a report in the specified format (PDF, CSV, JSON) for the given parameters',
  })
  @ApiResponse({
    status: 201,
    description: 'Report generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        reportPath: { type: 'string' },
        fileName: { type: 'string' },
        downloadUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to client data',
  })
  async generateReport(
    @Body() generateReportDto: GenerateReportDto,
    @CurrentUser() user: any,
  ) {
    try {
      const reportPath = await this.reportsService.generateReport(generateReportDto, user.id);
      const fileName = reportPath.split('/').pop() || 'report';
      
      return {
        success: true,
        message: 'Report generated successfully',
        reportPath,
        fileName,
        downloadUrl: `/api/reports/download/${fileName}`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Download a generated report
   */
  @Get('download/:fileName')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download a generated report',
    description: 'Download a previously generated report file',
  })
  @ApiParam({
    name: 'fileName',
    description: 'Name of the report file to download',
    example: 'device_performance_monthly_2024-01-15T10-30-00-000Z.pdf',
  })
  @ApiResponse({
    status: 200,
    description: 'Report file downloaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report file not found',
  })
  async downloadReport(
    @Param('fileName') fileName: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    try {
      const reportsDir = join(process.cwd(), 'reports');
      const filePath = join(reportsDir, fileName);

      if (!existsSync(filePath)) {
        throw new NotFoundException('Report file not found');
      }

      // Set appropriate headers based on file type
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (fileExtension) {
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'csv':
          contentType = 'text/csv';
          break;
        case 'json':
          contentType = 'application/json';
          break;
      }

      response.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      const file = createReadStream(filePath);
      return new StreamableFile(file);

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to download report: ${error.message}`);
    }
  }

  /**
   * Get list of available report types and their descriptions
   */
  @Get('types')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available report types',
    description: 'Retrieve list of available report types with descriptions and supported formats',
  })
  @ApiResponse({
    status: 200,
    description: 'Report types retrieved successfully',
  })
  async getReportTypes() {
    return {
      reportTypes: [
        {
          type: ReportType.DEVICE_PERFORMANCE,
          name: 'Device Performance Report',
          description: 'Detailed performance metrics for devices including telemetry data and alarm history',
          supportedFormats: [ReportFormat.PDF, ReportFormat.CSV, ReportFormat.JSON],
          supportedPeriods: [ReportPeriod.DAILY, ReportPeriod.WEEKLY, ReportPeriod.MONTHLY, ReportPeriod.QUARTERLY, ReportPeriod.YEARLY, ReportPeriod.CUSTOM],
        },
        {
          type: ReportType.TELEMETRY_SUMMARY,
          name: 'Telemetry Summary Report',
          description: 'Summary of telemetry data including energy, water, and system metrics',
          supportedFormats: [ReportFormat.PDF, ReportFormat.CSV, ReportFormat.JSON],
          supportedPeriods: [ReportPeriod.DAILY, ReportPeriod.WEEKLY, ReportPeriod.MONTHLY, ReportPeriod.QUARTERLY, ReportPeriod.YEARLY, ReportPeriod.CUSTOM],
        },
        {
          type: ReportType.CLIENT_OVERVIEW,
          name: 'Client Overview Report',
          description: 'Comprehensive overview of client systems, devices, and usage patterns',
          supportedFormats: [ReportFormat.PDF, ReportFormat.JSON],
          supportedPeriods: [ReportPeriod.MONTHLY, ReportPeriod.QUARTERLY, ReportPeriod.YEARLY, ReportPeriod.CUSTOM],
        },
        {
          type: ReportType.ALARM_HISTORY,
          name: 'Alarm History Report',
          description: 'Historical alarm data with details on severity, resolution, and trends',
          supportedFormats: [ReportFormat.PDF, ReportFormat.CSV, ReportFormat.JSON],
          supportedPeriods: [ReportPeriod.DAILY, ReportPeriod.WEEKLY, ReportPeriod.MONTHLY, ReportPeriod.QUARTERLY, ReportPeriod.YEARLY, ReportPeriod.CUSTOM],
        },
        {
          type: ReportType.ENERGY_USAGE,
          name: 'Energy Usage Report',
          description: 'Energy generation and consumption analysis with efficiency metrics',
          supportedFormats: [ReportFormat.PDF, ReportFormat.CSV, ReportFormat.JSON],
          supportedPeriods: [ReportPeriod.DAILY, ReportPeriod.WEEKLY, ReportPeriod.MONTHLY, ReportPeriod.QUARTERLY, ReportPeriod.YEARLY, ReportPeriod.CUSTOM],
        },
        {
          type: ReportType.WATER_PRODUCTION,
          name: 'Water Production Report',
          description: 'Water production metrics including flow rates, pressure, and system efficiency',
          supportedFormats: [ReportFormat.PDF, ReportFormat.CSV, ReportFormat.JSON],
          supportedPeriods: [ReportPeriod.DAILY, ReportPeriod.WEEKLY, ReportPeriod.MONTHLY, ReportPeriod.QUARTERLY, ReportPeriod.YEARLY, ReportPeriod.CUSTOM],
        },
        {
          type: ReportType.SYSTEM_HEALTH,
          name: 'System Health Report',
          description: 'Overall system health assessment including device uptime and alarm statistics',
          supportedFormats: [ReportFormat.PDF, ReportFormat.JSON],
          supportedPeriods: [ReportPeriod.WEEKLY, ReportPeriod.MONTHLY, ReportPeriod.QUARTERLY, ReportPeriod.CUSTOM],
        },
        {
          type: ReportType.BILLING_SUMMARY,
          name: 'Billing Summary Report',
          description: 'Credit usage, transactions, and billing overview for clients',
          supportedFormats: [ReportFormat.PDF, ReportFormat.CSV, ReportFormat.JSON],
          supportedPeriods: [ReportPeriod.MONTHLY, ReportPeriod.QUARTERLY, ReportPeriod.YEARLY, ReportPeriod.CUSTOM],
        },
      ],
      formats: [
        {
          format: ReportFormat.PDF,
          name: 'PDF Document',
          description: 'Formatted report suitable for printing and sharing',
          mimeType: 'application/pdf',
        },
        {
          format: ReportFormat.CSV,
          name: 'CSV Spreadsheet',
          description: 'Comma-separated values for data analysis and import',
          mimeType: 'text/csv',
        },
        {
          format: ReportFormat.JSON,
          name: 'JSON Data',
          description: 'Structured data format for programmatic access',
          mimeType: 'application/json',
        },
      ],
      periods: [
        { period: ReportPeriod.DAILY, name: 'Daily', description: 'Current day data' },
        { period: ReportPeriod.WEEKLY, name: 'Weekly', description: 'Current week data' },
        { period: ReportPeriod.MONTHLY, name: 'Monthly', description: 'Current month data' },
        { period: ReportPeriod.QUARTERLY, name: 'Quarterly', description: 'Current quarter data' },
        { period: ReportPeriod.YEARLY, name: 'Yearly', description: 'Current year data' },
        { period: ReportPeriod.CUSTOM, name: 'Custom Period', description: 'User-defined date range' },
      ],
    };
  }

  /**
   * Get report history (list of generated reports)
   */
  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get report history',
    description: 'Retrieve list of previously generated reports',
  })
  @ApiResponse({
    status: 200,
    description: 'Report history retrieved successfully',
  })
  async getReportHistory(@CurrentUser() user: any) {
    try {
      const reports = await this.reportsService.getReportHistory(user.id);
      
      return {
        success: true,
        reports: reports.map(fileName => ({
          fileName,
          downloadUrl: `/api/reports/download/${fileName}`,
          fileType: fileName.split('.').pop(),
          createdAt: this.extractDateFromFileName(fileName),
        })),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve report history: ${error.message}`);
    }
  }

  /**
   * Delete a generated report
   */
  @Delete(':fileName')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a generated report',
    description: 'Delete a previously generated report file (Admin only)',
  })
  @ApiParam({
    name: 'fileName',
    description: 'Name of the report file to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Report deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report file not found',
  })
  async deleteReport(
    @Param('fileName') fileName: string,
    @CurrentUser() user: any,
  ) {
    try {
      await this.reportsService.deleteReport(fileName, user.id);
      
      return {
        success: true,
        message: 'Report deleted successfully',
        fileName,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete report: ${error.message}`);
    }
  }

  /**
   * Generate quick device summary report
   */
  @Get('quick/:deviceId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate quick device summary',
    description: 'Generate a quick summary report for a specific device (last 24 hours)',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'ID of the device to generate report for',
  })
  @ApiQuery({
    name: 'format',
    enum: ReportFormat,
    description: 'Output format',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Quick report generated successfully',
  })
  async generateQuickDeviceReport(
    @Param('deviceId') deviceId: string,
    @Query('format') format: ReportFormat = ReportFormat.PDF,
    @CurrentUser() user: any,
  ) {
    try {
      const reportRequest: GenerateReportDto = {
        type: ReportType.DEVICE_PERFORMANCE,
        format,
        period: ReportPeriod.DAILY,
        deviceIds: [deviceId],
      };

      const reportPath = await this.reportsService.generateReport(reportRequest, user.id);
      const fileName = reportPath.split('/').pop() || 'quick-report';

      return {
        success: true,
        message: 'Quick device report generated successfully',
        fileName,
        downloadUrl: `/api/reports/download/${fileName}`,
        deviceId,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate quick device report: ${error.message}`);
    }
  }

  /**
   * Generate quick client overview report
   */
  @Get('quick/client/:clientId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate quick client overview',
    description: 'Generate a quick overview report for a specific client (current month)',
  })
  @ApiParam({
    name: 'clientId',
    description: 'ID of the client to generate report for',
  })
  @ApiQuery({
    name: 'format',
    enum: ReportFormat,
    description: 'Output format',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Quick client report generated successfully',
  })
  async generateQuickClientReport(
    @Param('clientId') clientId: string,
    @Query('format') format: ReportFormat = ReportFormat.PDF,
    @CurrentUser() user: any,
  ) {
    try {
      const reportRequest: GenerateReportDto = {
        type: ReportType.CLIENT_OVERVIEW,
        format,
        period: ReportPeriod.MONTHLY,
        clientId,
      };

      const reportPath = await this.reportsService.generateReport(reportRequest, user.id);
      const fileName = reportPath.split('/').pop() || 'quick-client-report';

      return {
        success: true,
        message: 'Quick client report generated successfully',
        fileName,
        downloadUrl: `/api/reports/download/${fileName}`,
        clientId,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate quick client report: ${error.message}`);
    }
  }

  /**
   * Get report generation status (placeholder for async generation)
   */
  @Get('status/:taskId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get report generation status',
    description: 'Check the status of an asynchronous report generation task',
  })
  @ApiParam({
    name: 'taskId',
    description: 'ID of the report generation task',
  })
  @ApiResponse({
    status: 200,
    description: 'Report generation status retrieved successfully',
  })
  async getReportStatus(
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    // Placeholder for async report generation status
    // This would integrate with an in-memory task queue system
    return {
      taskId,
      status: 'completed', // pending, processing, completed, failed
      progress: 100,
      message: 'Report generation completed successfully',
      downloadUrl: null, // Would be populated when completed
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  private extractDateFromFileName(fileName: string): string | null {
    // Extract timestamp from filename pattern: type_period_timestamp.extension
    const match = fileName.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
    if (match) {
      return match[1].replace(/-/g, ':').replace('T', 'T').slice(0, -1) + 'Z';
    }
    return null;
  }
}