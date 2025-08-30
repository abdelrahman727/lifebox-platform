// src/modules/clients/clients.controller.ts 
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { 
  CreateClientDto, 
  UpdateClientDto, 
  ClientQueryDto, 
  CreateSubscriptionDto,
  UpdateClientCreditDto,
  UpdateClientFawryDto 
} from '../../common/dto/client.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Create new client' })
  @ApiResponse({ status: 201, description: 'Client created successfully' })
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients' })
  @ApiResponse({ status: 200, description: 'List of clients retrieved successfully' })
  findAll(@Query() query: ClientQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  @ApiResponse({ status: 200, description: 'Client retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get client statistics' })
  @ApiResponse({ status: 200, description: 'Client statistics retrieved successfully' })
  getStatistics(@Param('id') id: string) {
    return this.clientsService.getStatistics(id);
  }

  @Get(':id/devices')
  @ApiOperation({ summary: 'Get client devices' })
  @ApiResponse({ status: 200, description: 'Client devices retrieved successfully' })
  getDevices(@Param('id') id: string) {
    return this.clientsService.getDevices(id);
  }

  @Patch(':id')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Update client' })
  @ApiResponse({ status: 200, description: 'Client updated successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @Roles('super_user')
  @ApiOperation({ summary: 'Delete client' })
  @ApiResponse({ status: 200, description: 'Client deleted successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete client with active devices' })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  @Post(':id/subscriptions')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Create client subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  createSubscription(
    @Param('id') id: string,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    return this.clientsService.createSubscription(id, createSubscriptionDto);
  }

  // FAWRY ENDPOINTS
  @Patch(':id/credit')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Update client credit balance' })
  @ApiResponse({ status: 200, description: 'Credit balance updated successfully' })
  updateCredit(
    @Param('id') id: string,
    @Body() updateCreditDto: UpdateClientCreditDto
  ) {
    return this.clientsService.updateCredit(id, updateCreditDto.credit);
  }

  @Patch(':id/fawry-settings')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Update client Fawry settings' })
  @ApiResponse({ status: 200, description: 'Fawry settings updated successfully' })
  updateFawrySettings(
    @Param('id') id: string,
    @Body() updateFawryDto: UpdateClientFawryDto
  ) {
    return this.clientsService.updateFawrySettings(id, updateFawryDto);
  }

  @Get(':id/credit-balance')
  @ApiOperation({ summary: 'Get client credit balance' })
  @ApiResponse({ status: 200, description: 'Credit balance retrieved successfully' })
  getCreditBalance(@Param('id') id: string) {
    return this.clientsService.getCreditBalance(id);
  }

  @Patch(':id/electricity-rate')
  @Roles('super_user', 'admin')
  @ApiOperation({ 
    summary: 'Update client electricity rate (EGP/kWh)',
    description: 'Update the electricity rate used for money saved calculations. Default is 2.15 EGP/kWh.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Electricity rate updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            electricityRateEgp: { type: 'number', example: 2.15 },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  })
  updateElectricityRate(
    @Param('id') id: string,
    @Body() updateData: { electricityRateEgp: number }
  ) {
    return this.clientsService.updateElectricityRate(id, updateData.electricityRateEgp);
  }

  @Get(':id/electricity-rate')
  @ApiOperation({ 
    summary: 'Get client electricity rate',
    description: 'Get the current electricity rate used for money saved calculations'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Electricity rate retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            clientId: { type: 'string' },
            clientName: { type: 'string' },
            electricityRateEgp: { type: 'number', example: 2.15, description: 'Current electricity rate in EGP/kWh' },
            replacingSource: { type: 'string', example: 'grid', description: 'Energy source being replaced' },
            lastUpdated: { type: 'string' },
          },
        },
      },
    },
  })
  getElectricityRate(@Param('id') id: string) {
    return this.clientsService.getElectricityRate(id);
  }

  @Get('electricity-rates/overview')
  @Roles('super_user', 'admin') 
  @ApiOperation({
    summary: 'Get electricity rates overview for all clients',
    description: 'Admin endpoint to view electricity rates for all clients for bulk management'
  })
  @ApiResponse({
    status: 200,
    description: 'Electricity rates overview retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            defaultRate: { type: 'number', example: 2.15, description: 'System default rate' },
            clients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  electricityRateEgp: { type: 'number', example: 2.15 },
                  replacingSource: { type: 'string' },
                  deviceCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  getElectricityRatesOverview() {
    return this.clientsService.getElectricityRatesOverview();
  }
}