import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HierarchicalRolesGuard } from '../../common/guards/hierarchical-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions, CommonPermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, HierarchicalRolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Super User Dashboard - Complete system overview
   * Only accessible by super_user role
   */
  @Get('super-user')
  @Roles('super_user')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE, CommonPermissions.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Get Super User Dashboard',
    description: 'Complete administrative control dashboard with system-wide metrics, user management, and platform configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Super User dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            systemMetrics: {
              type: 'object',
              properties: {
                totalUsers: { type: 'number' },
                totalClients: { type: 'number' },
                totalDevices: { type: 'number' },
                systemHealth: { type: 'number' },
                platformVersion: { type: 'string' },
              },
            },
            userManagement: {
              type: 'object',
              properties: {
                recentLogins: { type: 'array' },
                usersByRole: { type: 'object' },
                pendingApprovals: { type: 'array' },
              },
            },
            systemSettings: {
              type: 'object',
              properties: {
                configurationAccess: { type: 'boolean' },
                roleManagement: { type: 'boolean' },
                widgetConfiguration: { type: 'boolean' },
              },
            },
            globalAlerts: { type: 'array' },
            platformAnalytics: { type: 'object' },
          },
        },
      },
    },
  })
  async getSuperUserDashboard(@CurrentUser() user: any) {
    return await this.dashboardService.getSuperUserDashboard(user.id);
  }

  /**
   * Admin Dashboard - Organizational unit management
   * Accessible by super_user and admin roles
   */
  @Get('admin')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Get Admin Dashboard',
    description: 'Administrative interface with capabilities to manage specific organizational units and client details efficiently',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard data retrieved successfully',
  })
  async getAdminDashboard(@CurrentUser() user: any) {
    return await this.dashboardService.getAdminDashboard(user.id);
  }

  /**
   * Organization Client Dashboard - Multi-device management
   * Accessible by super_user, admin, and client roles
   */
  @Get('client')
  @Roles('super_user', 'admin', 'client')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW, CommonPermissions.CLIENT_READ)
  @ApiOperation({
    summary: 'Get Organization Client Dashboard',
    description: 'Specifically tailored for organizational clients, enabling management of multiple devices simultaneously with hierarchical access control',
  })
  @ApiResponse({
    status: 200,
    description: 'Client dashboard data retrieved successfully',
  })
  async getClientDashboard(@CurrentUser() user: any) {
    return await this.dashboardService.getClientDashboard(user.id, user.clientId);
  }

  /**
   * Operator Dashboard - Device monitoring and control
   * Accessible by super_user, admin, client, and operator roles
   */
  @Get('operator')
  @Roles('super_user', 'admin', 'client', 'operator')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW, CommonPermissions.DEVICE_READ)
  @ApiOperation({
    summary: 'Get Operator Dashboard',
    description: 'Device operation and control interface for operators with access to assigned devices',
  })
  @ApiResponse({
    status: 200,
    description: 'Operator dashboard data retrieved successfully',
  })
  async getOperatorDashboard(@CurrentUser() user: any) {
    return await this.dashboardService.getOperatorDashboard(user.id, user.clientId);
  }

  /**
   * Viewer Dashboard - Read-only monitoring
   * Accessible by all authenticated users
   */
  @Get('viewer')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Get Viewer Dashboard',
    description: 'Read-only dashboard with device status and telemetry for assigned client scope',
  })
  @ApiResponse({
    status: 200,
    description: 'Viewer dashboard data retrieved successfully',
  })
  async getViewerDashboard(@CurrentUser() user: any) {
    return await this.dashboardService.getViewerDashboard(user.id, user.clientId);
  }

  /**
   * Widget Management - Super User and Admin only
   */
  @Post('widgets')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.WIDGET_CREATE)
  @ApiOperation({
    summary: 'Create dashboard widget',
    description: 'Create a new dashboard widget with configuration (Super User and Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Widget created successfully',
  })
  async createWidget(
    @Body() createWidgetDto: any,
    @CurrentUser() user: any,
  ) {
    return await this.dashboardService.createWidget(createWidgetDto, user.id);
  }

  /**
   * Widget Configuration - Super User only
   */
  @Put('widgets/:widgetId/configure')
  @Roles('super_user')
  @RequirePermissions(CommonPermissions.WIDGET_CONFIGURE)
  @ApiOperation({
    summary: 'Configure widget settings',
    description: 'Advanced widget configuration and system customization (Super User only)',
  })
  @ApiParam({
    name: 'widgetId',
    description: 'Widget ID to configure',
  })
  @ApiResponse({
    status: 200,
    description: 'Widget configured successfully',
  })
  async configureWidget(
    @Param('widgetId') widgetId: string,
    @Body() configDto: any,
    @CurrentUser() user: any,
  ) {
    return await this.dashboardService.configureWidget(widgetId, configDto, user.id);
  }

  /**
   * User Role Management - Super User only
   */
  @Get('users/roles')
  @Roles('super_user')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE, CommonPermissions.USER_READ)
  @ApiOperation({
    summary: 'Get user roles management',
    description: 'User management interface with role creation and assignment capabilities (Super User only)',
  })
  @ApiResponse({
    status: 200,
    description: 'User roles data retrieved successfully',
  })
  async getUserRoles(@CurrentUser() user: any) {
    return await this.dashboardService.getUserRolesManagement(user.id);
  }

  /**
   * Client-specific user management - Admin and Client roles
   */
  @Get('client/:clientId/users')
  @Roles('super_user', 'admin', 'client')
  @RequirePermissions(CommonPermissions.USER_READ)
  @ApiOperation({
    summary: 'Get client users',
    description: 'Manage users within specific client organization (hierarchical access control)',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID to manage users for',
  })
  @ApiResponse({
    status: 200,
    description: 'Client users retrieved successfully',
  })
  async getClientUsers(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
  ) {
    return await this.dashboardService.getClientUsers(clientId, user.id, user.role.name);
  }

  /**
   * Dashboard customization - Available to all roles with appropriate permissions
   */
  @Put('customize')
  @RequirePermissions(CommonPermissions.DASHBOARD_CUSTOMIZE)
  @ApiOperation({
    summary: 'Customize dashboard layout',
    description: 'Customize dashboard layout and widget arrangement based on user role and permissions',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard customized successfully',
  })
  async customizeDashboard(
    @Body() customizationDto: any,
    @CurrentUser() user: any,
  ) {
    return await this.dashboardService.customizeDashboard(customizationDto, user.id, user.role.name);
  }

  /**
   * Dashboard Templates Management - Super User & Admin only
   */

  @Post('templates')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.WIDGET_CREATE)
  @ApiOperation({
    summary: 'Create dashboard template',
    description: 'Create a reusable dashboard template that can be shared with clients (Super User and Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Dashboard template created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Client Energy Dashboard' },
            description: { type: 'string', example: 'Comprehensive energy monitoring dashboard for clients' },
            targetRole: { type: 'string', example: 'client' },
            layoutConfig: { type: 'object' },
            isPublic: { type: 'boolean', example: false },
            templateWidgets: { type: 'array' }
          }
        }
      }
    }
  })
  async createDashboardTemplate(
    @Body() templateDto: {
      name: string;
      description?: string;
      targetRole: string;
      layoutConfig: any;
      widgets: Array<{
        widgetId: string;
        position: any;
        configOverrides?: any;
        isRequired?: boolean;
      }>;
      isPublic?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    const template = await this.dashboardService.createDashboardTemplate(templateDto, user.id);
    return {
      success: true,
      data: template
    };
  }

  @Get('templates/:templateId/modification-options')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.WIDGET_CONFIGURE)
  @ApiOperation({
    summary: 'Get template modification options',
    description: 'Check what modification options are available for a template (copy vs edit original)',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to check modification options for'
  })
  @ApiResponse({
    status: 200,
    description: 'Template modification options retrieved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            templateInfo: { type: 'object' },
            canEditOriginal: { type: 'boolean' },
            canCopy: { type: 'boolean' },
            recommendation: { type: 'string' },
            assignmentCount: { type: 'number' }
          }
        }
      }
    }
  })
  async getTemplateModificationOptions(
    @Param('templateId') templateId: string,
    @CurrentUser() user: any,
  ) {
    const options = await this.dashboardService.getTemplateModificationOptions(templateId, user.id);
    return {
      success: true,
      data: options
    };
  }

  @Post('templates/:templateId/copy')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.WIDGET_CREATE)
  @ApiOperation({
    summary: 'Copy dashboard template',
    description: 'Create a copy of an existing dashboard template (Super User and Admin only)',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to copy'
  })
  @ApiResponse({
    status: 201,
    description: 'Dashboard template copied successfully',
  })
  async copyDashboardTemplate(
    @Param('templateId') templateId: string,
    @Body() copyDto: {
      name: string;
      description?: string;
      targetRole?: string;
      isPublic?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    const template = await this.dashboardService.copyDashboardTemplate(templateId, copyDto, user.id);
    return {
      success: true,
      data: template
    };
  }

  @Put('templates/:templateId')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.WIDGET_CONFIGURE)
  @ApiOperation({
    summary: 'Update dashboard template',
    description: 'Update an existing dashboard template (Super User and Admin only)',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to update'
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard template updated successfully',
  })
  async updateDashboardTemplate(
    @Param('templateId') templateId: string,
    @Body() updateDto: {
      name?: string;
      description?: string;
      layoutConfig?: any;
      widgets?: Array<{
        widgetId: string;
        position: any;
        configOverrides?: any;
        isRequired?: boolean;
      }>;
      isPublic?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    const template = await this.dashboardService.updateDashboardTemplate(templateId, updateDto, user.id);
    return {
      success: true,
      data: template
    };
  }

  @Post('templates/:templateId/assign/:clientId')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.CLIENT_READ)
  @ApiOperation({
    summary: 'Assign template to client',
    description: 'Share a dashboard template with a specific client. Client will have read-only access.',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to assign'
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID to assign template to'
  })
  @ApiResponse({
    status: 201,
    description: 'Template assigned to client successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            template: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                targetRole: { type: 'string' }
              }
            },
            client: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            },
            permissions: {
              type: 'object',
              properties: {
                canView: { type: 'boolean', example: true },
                canEdit: { type: 'boolean', example: false }
              }
            }
          }
        }
      }
    }
  })
  async assignTemplateToClient(
    @Param('templateId') templateId: string,
    @Param('clientId') clientId: string,
    @Body() permissionsDto: { permissions?: any } = {},
    @CurrentUser() user: any,
  ) {
    const defaultPermissions = { canView: true, canEdit: false }; // Read-only by default
    const permissions = permissionsDto.permissions || defaultPermissions;
    
    const assignment = await this.dashboardService.assignTemplateToClient(
      templateId, 
      clientId, 
      user.id, 
      permissions
    );
    
    return {
      success: true,
      message: 'Dashboard template assigned to client successfully. Client has read-only access.',
      data: assignment
    };
  }

  @Delete('templates/:templateId/assign/:clientId')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.CLIENT_READ)
  @ApiOperation({
    summary: 'Remove template assignment from client',
    description: 'Remove dashboard template access from a specific client',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to unassign'
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID to remove template access from'
  })
  @ApiResponse({
    status: 200,
    description: 'Template assignment removed successfully',
  })
  async unassignTemplateFromClient(
    @Param('templateId') templateId: string,
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
  ) {
    await this.dashboardService.unassignTemplateFromClient(templateId, clientId);
    return {
      success: true,
      message: 'Dashboard template access removed from client'
    };
  }

  @Get('templates/my-templates')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.WIDGET_CREATE)
  @ApiOperation({
    summary: 'Get my created templates',
    description: 'Get all dashboard templates created by the current admin/super_user',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              targetRole: { type: 'string' },
              isPublic: { type: 'boolean' },
              templateWidgets: { type: 'array' },
              clientAssignments: { type: 'array' },
              _count: { type: 'object' }
            }
          }
        }
      }
    }
  })
  async getMyTemplates(@CurrentUser() user: any) {
    const templates = await this.dashboardService.getMyTemplates(user.id);
    return {
      success: true,
      data: templates
    };
  }

  @Get('templates/available')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Get available templates for current user',
    description: 'Get dashboard templates available to the current user based on role and client assignments',
  })
  @ApiResponse({
    status: 200,
    description: 'Available templates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              targetRole: { type: 'string' },
              isSystemDefault: { type: 'boolean' },
              templateWidgets: { type: 'array' },
              creator: { type: 'object' }
            }
          }
        }
      }
    }
  })
  async getAvailableTemplates(@CurrentUser() user: any) {
    const templates = await this.dashboardService.getAvailableTemplates(
      user.id, 
      user.role.name, 
      user.clientId
    );
    return {
      success: true,
      data: templates
    };
  }

  @Post('templates/:templateId/apply')
  @RequirePermissions(CommonPermissions.DASHBOARD_CUSTOMIZE)
  @ApiOperation({
    summary: 'Apply template to my dashboard',
    description: 'Apply a dashboard template to the current user\'s dashboard layout',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to apply'
  })
  @ApiResponse({
    status: 201,
    description: 'Template applied to user dashboard successfully',
  })
  async applyTemplateToMyDashboard(
    @Param('templateId') templateId: string,
    @CurrentUser() user: any,
  ) {
    const dashboard = await this.dashboardService.applyTemplateToUser(templateId, user.id);
    return {
      success: true,
      message: 'Dashboard template applied successfully',
      data: dashboard
    };
  }

  @Post('system/create-defaults')
  @Roles('super_user')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Create system default templates',
    description: 'Create default dashboard templates for all user roles (Super User only)',
  })
  @ApiResponse({
    status: 201,
    description: 'System default templates created successfully',
  })
  async createSystemDefaults(@CurrentUser() user: any) {
    const templates = await this.dashboardService.createSystemDefaults(user.id);
    return {
      success: true,
      message: `Created ${templates.length} system default templates`,
      data: templates
    };
  }

  /**
   * Template Permission Management Endpoints (Super User only)
   */

  @Post('templates/:templateId/permissions/grant')
  @Roles('super_user')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Grant template permissions',
    description: 'Grant editing permissions for a template to a specific user or role (Super User only)',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to grant permissions for'
  })
  @ApiResponse({
    status: 201,
    description: 'Template permissions granted successfully',
  })
  async grantTemplatePermission(
    @Param('templateId') templateId: string,
    @Body() permissionDto: {
      userId?: string;
      roleId?: string;
      canEdit: boolean;
      canCopy?: boolean;
      requiresCopy?: boolean;
      expiresAt?: string; // ISO date string
    },
    @CurrentUser() user: any,
  ) {
    const permission = await this.dashboardService.grantTemplatePermission(
      templateId,
      {
        ...permissionDto,
        canCopy: permissionDto.canCopy !== undefined ? permissionDto.canCopy : true,
        expiresAt: permissionDto.expiresAt ? new Date(permissionDto.expiresAt) : undefined
      },
      user.id
    );
    return {
      success: true,
      message: 'Template permission granted successfully',
      data: permission
    };
  }

  @Delete('templates/:templateId/permissions/revoke')
  @Roles('super_user')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Revoke template permissions',
    description: 'Revoke editing permissions for a template from a user or role (Super User only)',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to revoke permissions for'
  })
  @ApiResponse({
    status: 200,
    description: 'Template permissions revoked successfully',
  })
  async revokeTemplatePermission(
    @Param('templateId') templateId: string,
    @Body() revokeDto: {
      userId?: string;
      roleId?: string;
    },
    @CurrentUser() user: any,
  ) {
    await this.dashboardService.revokeTemplatePermission(templateId, revokeDto.userId, revokeDto.roleId);
    return {
      success: true,
      message: 'Template permission revoked successfully'
    };
  }

  @Get('templates/:templateId/permissions')
  @Roles('super_user', 'super_admin', 'admin')
  @RequirePermissions(CommonPermissions.WIDGET_CONFIGURE)
  @ApiOperation({
    summary: 'Get template permissions',
    description: 'List all permissions granted for a specific template',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to get permissions for'
  })
  @ApiResponse({
    status: 200,
    description: 'Template permissions retrieved successfully',
  })
  async getTemplatePermissions(
    @Param('templateId') templateId: string,
    @CurrentUser() user: any,
  ) {
    const permissions = await this.dashboardService.getTemplatePermissions(templateId);
    return {
      success: true,
      data: permissions
    };
  }

  @Get('templates/:templateId/permissions/check')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Check user template permissions',
    description: 'Check current user\'s effective permissions for a specific template',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID to check permissions for'
  })
  @ApiResponse({
    status: 200,
    description: 'User template permissions checked successfully',
  })
  async checkUserTemplatePermissions(
    @Param('templateId') templateId: string,
    @CurrentUser() user: any,
  ) {
    const permissions = await this.dashboardService.getUserTemplatePermissions(templateId, user.id, user.role.name);
    return {
      success: true,
      data: permissions
    };
  }
}