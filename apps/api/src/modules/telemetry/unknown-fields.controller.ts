import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('telemetry')
@ApiBearerAuth()
@Controller('telemetry/unknown-fields')
export class UnknownFieldsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('catalog')
  @ApiOperation({ summary: 'Add unknown field to catalog from MQTT ingestion service' })
  async addToUnknownFieldCatalog(@Body() body: {
    fieldName: string;
    sampleValues: any[];
    deviceId: string;
    occurrenceCount?: number;
    firstSeen?: string;
    lastSeen?: string;
    deviceContext?: any[]; // ENHANCED: Device metadata context array
  }) {
    try {
      // Check if the unknown field already exists
      const existingField = await this.prisma.unknownFieldCatalog.findUnique({
        where: { fieldName: body.fieldName }
      });

      if (existingField) {
        // Update existing field
        const updatedSampleValues = Array.from(new Set([
          ...(existingField.sampleValues as any[]),
          ...body.sampleValues
        ])).slice(0, 50); // Keep only first 50 unique sample values

        const updatedAffectedDevices = Array.from(new Set([
          ...(existingField.affectedDevices || []),
          body.deviceId
        ]));

        // ENHANCED: Merge device contexts
        const existingDeviceContexts = (existingField.deviceContexts as any[]) || [];
        const newDeviceContexts = body.deviceContext || [];
        const mergedDeviceContexts = [...existingDeviceContexts, ...newDeviceContexts];

        const updatedField = await this.prisma.unknownFieldCatalog.update({
          where: { fieldName: body.fieldName },
          data: {
            sampleValues: updatedSampleValues,
            affectedDevices: updatedAffectedDevices,
            deviceContexts: mergedDeviceContexts, // ENHANCED: Store device metadata context
            occurrenceCount: { increment: body.occurrenceCount || 1 },
            lastSeen: new Date(body.lastSeen || new Date()),
          }
        });

        return {
          success: true,
          action: 'updated',
          field: updatedField
        };
      } else {
        // Create new field  
        const newField = await this.prisma.unknownFieldCatalog.create({
          data: {
            fieldName: body.fieldName,
            sampleValues: body.sampleValues,
            affectedDevices: [body.deviceId],
            deviceContexts: body.deviceContext || [], // ENHANCED: Store initial device metadata context
            occurrenceCount: body.occurrenceCount || 1,
            firstSeen: new Date(body.firstSeen || new Date()),
            lastSeen: new Date(body.lastSeen || new Date()),
          }
        });

        return {
          success: true,
          action: 'created',
          field: newField
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fieldName: body.fieldName
      };
    }
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Get all unknown fields from catalog' })
  async getUnknownFieldsCatalog(
    @Query('promoted') promoted?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const whereClause: any = {};
    
    if (promoted !== undefined) {
      whereClause.promoted = promoted === 'true';
    }

    return await this.prisma.unknownFieldCatalog.findMany({
      where: whereClause,
      orderBy: [
        { promoted: 'desc' },
        { occurrenceCount: 'desc' },
        { lastSeen: 'desc' }
      ],
      take: limit ? parseInt(limit) : 50,
      skip: offset ? parseInt(offset) : 0
    });
  }

  @Post('catalog/:fieldName/promote')
  @ApiOperation({ summary: 'Promote unknown field to first-class schema' })
  async promoteUnknownField(@Body() body: { fieldName: string }) {
    const updatedField = await this.prisma.unknownFieldCatalog.update({
      where: { fieldName: body.fieldName },
      data: {
        promoted: true,
        promotedAt: new Date()
      }
    });

    return {
      success: true,
      message: `Field ${body.fieldName} promoted to first-class schema`,
      field: updatedField
    };
  }
}