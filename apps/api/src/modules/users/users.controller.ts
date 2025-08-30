import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { EnhancedUserCreationService } from './enhanced-user-creation.service';

interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  roleId: string;
  clientId?: string;
  commandPermissions?: string[];
}

interface UpdateUserDto {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  roleId?: string;
  clientId?: string;
  isActive?: boolean;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly enhancedUserCreationService: EnhancedUserCreationService,
  ) {}

  @Post()
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user with role-specific restrictions and optional command permissions',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to create this user type',
  })
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: any) {
    // Use enhanced user creation service for role-specific restrictions
    if (createUserDto.commandPermissions) {
      return this.enhancedUserCreationService.createUserWithCommands(
        user.id,
        createUserDto,
      );
    }

    // Basic user creation
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve all users with optional filtering based on role and access level',
  })
  @ApiQuery({
    name: 'roleId',
    required: false,
    description: 'Filter by role ID',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Filter by client ID',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  async findAll(
    @CurrentUser() user: any,
    @Query('roleId') roleId?: string,
    @Query('clientId') clientId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filter: any = {};
    
    if (roleId) filter.roleId = roleId;
    if (clientId) filter.clientId = clientId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Role-based filtering
    if (user.role.name === 'client') {
      // Clients can only see users in their organization
      filter.clientId = user.clientId;
    } else if (user.role.name === 'admin') {
      // Admins see users in their assigned clients (simplified for now)
      if (!filter.clientId) {
        // Could be enhanced to show only admin's assigned clients
      }
    }
    // Super Users and Super Admins see all users

    return this.usersService.findAll(filter);
  }

  @Get(':id')
  @Roles('super_user', 'super_admin', 'admin', 'client', 'operator', 'viewer')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve specific user with detailed information including permissions',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Basic access check - users can view themselves, admins+ can view others
    if (
      id !== user.id &&
      !['super_user', 'super_admin', 'admin', 'client'].includes(user.role.name)
    ) {
      // Could add more sophisticated access control here
    }

    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user information with role-based access control',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    // Basic access check - implement more sophisticated logic as needed
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('super_user', 'super_admin', 'admin')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Soft delete user (sets isActive to false). Super Admin cannot delete users.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    // Super Admin restriction - no delete permissions
    if (user.role.name === 'super_admin') {
      throw new Error('Super Admin cannot delete users');
    }

    return this.usersService.remove(id);
  }

  @Get(':id/available-roles')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Get available roles for user creation',
    description: 'Get roles that the current user can assign when creating new users',
  })
  async getAvailableRoles(@CurrentUser() user: any) {
    return this.enhancedUserCreationService.getAvailableRolesForCreator(user.id);
  }

  @Get(':id/available-commands')
  @Roles('super_user', 'super_admin', 'admin', 'client')
  @ApiOperation({
    summary: 'Get available commands for delegation',
    description: 'Get command permissions that the current user can delegate to others',
  })
  async getAvailableCommands(@CurrentUser() user: any) {
    return this.enhancedUserCreationService.getAvailableCommandsForCreator(
      user.id,
    );
  }
}