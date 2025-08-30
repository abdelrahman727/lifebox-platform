import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HierarchicalRolesGuard } from '../../common/guards/hierarchical-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserAssignmentsService } from './user-assignments.service';
import {
  CreateDeviceAssignmentDto,
  BulkCreateDeviceAssignmentDto,
  UpdateDeviceAssignmentDto,
  DeviceAssignmentQueryDto,
  DeviceAssignmentResponseDto,
} from './dto/user-assignment.dto';

@ApiTags('User Device Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HierarchicalRolesGuard)
@Controller('user-assignments')
export class UserAssignmentsController {
  constructor(private readonly userAssignmentsService: UserAssignmentsService) {}

  @Post('devices')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Create device assignment for user',
    description: 'Assign a user to a specific device for viewing access. Super Users can assign any user to any device. Admins and Clients can assign users within their scope.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Device assignment created successfully',
    type: DeviceAssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User is already assigned to this device or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to create this assignment',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or device not found',
  })
  async createDeviceAssignment(
    @Body() createDto: CreateDeviceAssignmentDto,
    @Request() req: any,
  ): Promise<DeviceAssignmentResponseDto> {
    return this.userAssignmentsService.createDeviceAssignment(createDto, req.user.id);
  }

  @Post('devices/bulk')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Create multiple device assignments (bulk)',
    description: 'Assign multiple users to multiple devices in a single operation. Useful for setting up team access to device groups.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk device assignments processed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Some assignments failed validation',
  })
  async createBulkDeviceAssignments(
    @Body() bulkCreateDto: BulkCreateDeviceAssignmentDto,
    @Request() req: any,
  ) {
    return this.userAssignmentsService.createBulkDeviceAssignments(bulkCreateDto, req.user.id);
  }

  @Get('devices')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get device assignments with filtering',
    description: 'Retrieve device assignments with optional filtering by user, device, client, or status.',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'deviceId', required: false, description: 'Filter by device ID' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filter by client ID' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by assignment status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip (default: 0)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device assignments retrieved successfully',
  })
  async getDeviceAssignments(
    @Query() query: DeviceAssignmentQueryDto,
    @Request() req: any,
  ) {
    return this.userAssignmentsService.getDeviceAssignments(query, req.user.id);
  }

  @Get('devices/:id')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator')
  @ApiOperation({
    summary: 'Get specific device assignment',
    description: 'Retrieve details of a specific device assignment by ID.',
  })
  @ApiParam({ name: 'id', description: 'Device assignment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device assignment details retrieved successfully',
    type: DeviceAssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device assignment not found',
  })
  async getDeviceAssignment(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<DeviceAssignmentResponseDto> {
    const result = await this.userAssignmentsService.getDeviceAssignments(
      { limit: 1, offset: 0 },
      req.user.id
    );
    
    const assignment = result.assignments.find(a => a.id === id);
    if (!assignment) {
      throw new NotFoundException('Device assignment not found');
    }
    
    return assignment;
  }

  @Patch('devices/:id')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Update device assignment',
    description: 'Update a device assignment (e.g., activate/deactivate).',
  })
  @ApiParam({ name: 'id', description: 'Device assignment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device assignment updated successfully',
    type: DeviceAssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device assignment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to update this assignment',
  })
  async updateDeviceAssignment(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeviceAssignmentDto,
    @Request() req: any,
  ): Promise<DeviceAssignmentResponseDto> {
    return this.userAssignmentsService.updateDeviceAssignment(id, updateDto, req.user.id);
  }

  @Delete('devices/:id')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Remove device assignment',
    description: 'Remove a device assignment (soft delete - sets isActive to false).',
  })
  @ApiParam({ name: 'id', description: 'Device assignment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device assignment removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device assignment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to remove this assignment',
  })
  async removeDeviceAssignment(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.userAssignmentsService.removeDeviceAssignment(id, req.user.id);
  }

  @Get('users/:userId/devices')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get devices assigned to a user',
    description: 'Retrieve all devices assigned to a specific user.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User devices retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to view this user\'s device assignments',
  })
  async getUserDevices(
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.userAssignmentsService.getUserDevices(userId, req.user.id);
  }

  @Get('devices/:deviceId/users')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator')
  @ApiOperation({
    summary: 'Get users assigned to a device',
    description: 'Retrieve all users assigned to a specific device.',
  })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device users retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to view this device\'s user assignments',
  })
  async getDeviceUsers(
    @Param('deviceId') deviceId: string,
    @Request() req: any,
  ) {
    return this.userAssignmentsService.getDeviceUsers(deviceId, req.user.id);
  }

  @Get('my-devices')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get current user\'s assigned devices',
    description: 'Retrieve all devices assigned to the currently authenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user devices retrieved successfully',
  })
  async getMyDevices(@Request() req: any) {
    return this.userAssignmentsService.getUserDevices(req.user.id, req.user.id);
  }
}