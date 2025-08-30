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
import { CommandPermissionsService } from './command-permissions.service';
import { CommandPermissionsSeederService } from './command-permissions-seeder.service';
import {
  CreateCommandPermissionDto,
  UpdateCommandPermissionDto,
  GrantCommandPermissionDto,
  BulkGrantCommandPermissionDto,
  UpdateUserCommandPermissionDto,
  CommandPermissionQueryDto,
  UserCommandPermissionQueryDto,
  CommandPermissionResponseDto,
  UserCommandPermissionResponseDto,
  CommandScope,
  CommandCategory,
} from './dto/command-permission.dto';

@ApiTags('Command Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HierarchicalRolesGuard)
@Controller('command-permissions')
export class CommandPermissionsController {
  constructor(
    private readonly commandPermissionsService: CommandPermissionsService,
    private readonly seederService: CommandPermissionsSeederService,
  ) {}

  // Command Permission Management (Super Users only)

  @Post()
  @Roles('super_user')
  @ApiOperation({
    summary: 'Create new command permission',
    description: 'Create a new command permission type. Only Super Users can create command permissions.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Command permission created successfully',
    type: CommandPermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Command type already exists or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only Super Users can create command permissions',
  })
  async createCommandPermission(
    @Body() createDto: CreateCommandPermissionDto,
    @Request() req: any,
  ): Promise<CommandPermissionResponseDto> {
    const result = await this.commandPermissionsService.createCommandPermission(createDto, req.user.id);
    return { ...result, category: result.category as CommandCategory };
  }

  @Get()
  @Roles('super_user', 'super_admin', 'admin')
  @ApiOperation({
    summary: 'Get all command permissions',
    description: 'Retrieve all command permissions with optional filtering. Super Users and Admins only.',
  })
  @ApiQuery({ name: 'commandType', required: false, description: 'Filter by command type' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'isSystemLevel', required: false, description: 'Filter by system level commands' })
  @ApiQuery({ name: 'isClientLevel', required: false, description: 'Filter by client level commands' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip (default: 0)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Command permissions retrieved successfully',
  })
  async getCommandPermissions(
    @Query() query: CommandPermissionQueryDto,
    @Request() req: any,
  ) {
    return this.commandPermissionsService.getCommandPermissions(query, req.user.id);
  }

  @Patch(':id')
  @Roles('super_user')
  @ApiOperation({
    summary: 'Update command permission',
    description: 'Update a command permission. Only Super Users can update command permissions.',
  })
  @ApiParam({ name: 'id', description: 'Command permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Command permission updated successfully',
    type: CommandPermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Command permission not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only Super Users can update command permissions',
  })
  async updateCommandPermission(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommandPermissionDto,
    @Request() req: any,
  ): Promise<CommandPermissionResponseDto> {
    const result = await this.commandPermissionsService.updateCommandPermission(id, updateDto, req.user.id);
    return { ...result, category: result.category as CommandCategory };
  }

  @Delete(':id')
  @Roles('super_user')
  @ApiOperation({
    summary: 'Delete command permission',
    description: 'Soft delete a command permission (sets isActive to false). Only Super Users can delete command permissions.',
  })
  @ApiParam({ name: 'id', description: 'Command permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Command permission deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Command permission not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only Super Users can delete command permissions',
  })
  async deleteCommandPermission(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.commandPermissionsService.deleteCommandPermission(id, req.user.id);
  }

  // User Command Permission Management (Hierarchical Delegation)

  @Post('grant')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Grant command permission to user',
    description: 'Grant a command permission to a user. Super Users can grant any command. Admins and Clients can only grant commands they have delegation rights for.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Command permission granted successfully',
    type: UserCommandPermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User already has this command permission or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to grant this command',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or command permission not found',
  })
  async grantCommandPermission(
    @Body() grantDto: GrantCommandPermissionDto,
    @Request() req: any,
  ): Promise<UserCommandPermissionResponseDto> {
    const result = await this.commandPermissionsService.grantCommandPermission(grantDto, req.user.id);
    return { 
      ...result, 
      scope: result.scope as CommandScope,
      commandPermission: { ...result.commandPermission, category: result.commandPermission.category as CommandCategory }
    };
  }

  @Post('grant/bulk')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Grant command permissions in bulk',
    description: 'Grant multiple command permissions to multiple users in a single operation.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk command permissions processed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Some permissions failed validation',
  })
  async grantBulkCommandPermissions(
    @Body() bulkGrantDto: BulkGrantCommandPermissionDto,
    @Request() req: any,
  ) {
    return this.commandPermissionsService.grantBulkCommandPermissions(bulkGrantDto, req.user.id);
  }

  @Get('user-permissions')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get user command permissions',
    description: 'Retrieve user command permissions with filtering. Access is scoped based on user role.',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'commandPermissionId', required: false, description: 'Filter by command permission ID' })
  @ApiQuery({ name: 'scope', required: false, enum: CommandScope, description: 'Filter by scope' })
  @ApiQuery({ name: 'scopeId', required: false, description: 'Filter by scope ID' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'canDelegate', required: false, description: 'Filter by delegation capability' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip (default: 0)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User command permissions retrieved successfully',
  })
  async getUserCommandPermissions(
    @Query() query: UserCommandPermissionQueryDto,
    @Request() req: any,
  ) {
    return this.commandPermissionsService.getUserCommandPermissions(query, req.user.id);
  }

  @Patch('user-permissions/:id')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Update user command permission',
    description: 'Update a user command permission (e.g., change delegation rights, expiration). Can only update permissions you granted.',
  })
  @ApiParam({ name: 'id', description: 'User command permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User command permission updated successfully',
    type: UserCommandPermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User command permission not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to update this permission',
  })
  async updateUserCommandPermission(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserCommandPermissionDto,
    @Request() req: any,
  ): Promise<UserCommandPermissionResponseDto> {
    const result = await this.commandPermissionsService.updateUserCommandPermission(id, updateDto, req.user.id);
    return { 
      ...result, 
      scope: result.scope as CommandScope,
      commandPermission: { ...result.commandPermission, category: result.commandPermission.category as CommandCategory }
    };
  }

  @Delete('user-permissions/:id')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Revoke user command permission',
    description: 'Revoke a user command permission (sets isActive to false). Can only revoke permissions you granted.',
  })
  @ApiParam({ name: 'id', description: 'User command permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User command permission revoked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User command permission not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to revoke this permission',
  })
  async revokeUserCommandPermission(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.commandPermissionsService.revokeUserCommandPermission(id, req.user.id);
  }

  // User Command Access Queries

  @Get('users/:userId/commands')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get commands available to a user',
    description: 'Retrieve all commands that a specific user has permission to execute.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User available commands retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to view this user\'s commands',
  })
  async getUserAvailableCommands(
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.commandPermissionsService.getUserAvailableCommands(userId, req.user.id);
  }

  @Get('users/:userId/delegatable-commands')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Get commands a user can delegate',
    description: 'Retrieve all commands that a specific user can delegate to other users.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User delegatable commands retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to view this user\'s delegatable commands',
  })
  async getUserDelegatableCommands(
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.commandPermissionsService.getUserDelegatableCommands(userId, req.user.id);
  }

  @Get('my-commands')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get current user\'s available commands',
    description: 'Retrieve all commands that the currently authenticated user has permission to execute.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user commands retrieved successfully',
  })
  async getMyCommands(@Request() req: any) {
    return this.commandPermissionsService.getUserAvailableCommands(req.user.id, req.user.id);
  }

  @Get('my-delegatable-commands')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator')
  @ApiOperation({
    summary: 'Get current user\'s delegatable commands',
    description: 'Retrieve all commands that the currently authenticated user can delegate to other users.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user delegatable commands retrieved successfully',
  })
  async getMyDelegatableCommands(@Request() req: any) {
    return this.commandPermissionsService.getUserDelegatableCommands(req.user.id, req.user.id);
  }

  // Command Permission Validation

  @Get('check/:userId/:commandType')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator')
  @ApiOperation({
    summary: 'Check if user has command permission',
    description: 'Check if a specific user has permission to execute a specific command type.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'commandType', description: 'Command type to check' })
  @ApiQuery({ name: 'scope', required: false, enum: CommandScope, description: 'Permission scope' })
  @ApiQuery({ name: 'scopeId', required: false, description: 'Scope ID (client or device ID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Command permission check completed',
    schema: {
      type: 'object',
      properties: {
        hasPermission: { type: 'boolean' },
        commandType: { type: 'string' },
        scope: { type: 'string' },
        scopeId: { type: 'string', nullable: true },
      },
    },
  })
  async checkUserCommandPermission(
    @Param('userId') userId: string,
    @Param('commandType') commandType: string,
    @Query('scope') scope?: CommandScope,
    @Query('scopeId') scopeId?: string,
  ) {
    const hasPermission = await this.commandPermissionsService.checkUserCommandPermission(
      userId,
      commandType,
      scope,
      scopeId
    );

    return {
      hasPermission,
      commandType,
      scope: scope || CommandScope.GLOBAL,
      scopeId: scopeId || null,
    };
  }

  // Demo and Setup Endpoints

  @Post('setup/demo')
  @Roles('super_user')
  @ApiOperation({
    summary: 'Setup hierarchical permissions demo',
    description: 'Seed the system with default commands and set up hierarchical permission delegation demo. Super Users only.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Demo setup completed successfully',
  })
  async setupDemo(@Request() req: any) {
    await this.seederService.runCompleteDemo();
    
    return {
      success: true,
      message: 'Hierarchical permissions demo setup completed successfully',
      details: {
        defaultCommandsSeeded: true,
        hierarchicalPermissionsSetup: true,
        deviceSpecificAssignmentsSetup: true,
      },
    };
  }

  @Post('setup/seed-commands')
  @Roles('super_user')
  @ApiOperation({
    summary: 'Seed default command permissions',
    description: 'Seed the system with default command permissions. Super Users only.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default commands seeded successfully',
  })
  async seedCommands(@Request() req: any) {
    await this.seederService.seedDefaultCommands();
    
    return {
      success: true,
      message: 'Default command permissions seeded successfully',
    };
  }
}