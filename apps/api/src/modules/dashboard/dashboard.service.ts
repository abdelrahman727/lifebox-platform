import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Super User Dashboard - System-wide overview
   */
  async getSuperUserDashboard(userId: string) {
    // System-wide metrics accessible only to super_user
    const [
      totalUsers,
      totalClients,
      totalDevices,
      activeDevices,
      recentAlarms,
      systemHealth
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.client.count(),
      this.prisma.device.count(),
      this.prisma.device.count({ where: { isActive: true } }),
      this.prisma.alarmEvent.count({
        where: {
          triggeredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          resolvedAt: null
        }
      }),
      this.calculateSystemHealth()
    ]);

    return {
      success: true,
      data: {
        systemMetrics: {
          totalUsers,
          totalClients,
          totalDevices,
          activeDevices,
          systemHealth,
          platformVersion: '1.0.0'
        },
        userManagement: await this.getUserManagementData(),
        systemSettings: {
          configurationAccess: true,
          roleManagement: true,
          widgetConfiguration: true
        },
        globalAlerts: await this.getGlobalAlerts(),
        platformAnalytics: await this.getPlatformAnalytics()
      }
    };
  }

  /**
   * Admin Dashboard - Organizational unit management
   */
  async getAdminDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, client: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Admins see assigned clients or all if no specific assignment
    const clientFilter = user.clientId ? { id: user.clientId } : {};
    
    const [clients, devices, alarms] = await Promise.all([
      this.prisma.client.findMany({
        where: clientFilter,
        include: {
          devices: { where: { isActive: true } },
          _count: { select: { users: true, devices: true } }
        }
      }),
      this.prisma.device.findMany({
        where: user.clientId ? { clientId: user.clientId } : {},
        include: { client: { select: { name: true } } }
      }),
      this.getRecentAlarmsForClients(user.clientId ? [user.clientId] : undefined)
    ]);

    return {
      success: true,
      data: {
        organizationalUnits: clients,
        deviceManagement: {
          totalDevices: devices.length,
          activeDevices: devices.filter(d => d.isActive).length,
          devicesByClient: this.groupDevicesByClient(devices)
        },
        alarms,
        clientDetails: await this.getClientDetailsForAdmin(user.clientId),
        permissions: {
          canCreateUsers: true,
          canManageDevices: true,
          canGenerateReports: true,
          canConfigureAlarms: true
        }
      }
    };
  }

  /**
   * Organization Client Dashboard - Multi-device management
   */
  async getClientDashboard(userId: string, clientId?: string) {
    if (!clientId) {
      throw new ForbiddenException('Client ID is required for client dashboard');
    }

    const [client, devices, users, alarms, reports] = await Promise.all([
      this.prisma.client.findUnique({
        where: { id: clientId },
        include: {
          _count: { select: { devices: true, users: true } }
        }
      }),
      this.prisma.device.findMany({
        where: { clientId },
        include: {
          telemetryEvents: {
            take: 1,
            orderBy: { time: 'desc' }
          },
          alarmEvents: {
            where: { resolvedAt: null },
            take: 5
          }
        }
      }),
      this.prisma.user.findMany({
        where: { clientId },
        include: { role: { select: { name: true } } }
      }),
      this.getActiveAlarmsForClient(clientId),
      this.getRecentReportsForClient(clientId)
    ]);

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return {
      success: true,
      data: {
        organization: {
          name: client.name,
          organizationName: client.organizationName,
          deviceCount: client._count.devices,
          userCount: client._count.users,
          billingType: client.billingType,
          credit: client.credit
        },
        deviceManagement: {
          devices: devices.map(device => ({
            id: device.id,
            name: device.deviceName,
            code: device.deviceCode,
            isActive: device.isActive,
            latestTelemetry: device.telemetryEvents[0] || null,
            activeAlarms: device.alarmEvents.length
          })),
          totalDevices: devices.length,
          activeDevices: devices.filter(d => d.isActive).length
        },
        hierarchicalAccess: {
          operators: users.filter(u => u.role.name === 'operator'),
          viewers: users.filter(u => u.role.name === 'viewer'),
          canManageOperators: true
        },
        alarms,
        reports,
        permissions: {
          canCreateDevices: true,
          canManageUsers: true,
          canGenerateReports: true,
          canConfigureAlarms: true
        }
      }
    };
  }

  /**
   * Operator Dashboard - Device operation and monitoring
   */
  async getOperatorDashboard(userId: string, clientId?: string) {
    if (!clientId) {
      throw new ForbiddenException('Client access required for operator dashboard');
    }

    const devices = await this.prisma.device.findMany({
      where: { clientId, isActive: true },
      include: {
        telemetryEvents: {
          take: 10,
          orderBy: { time: 'desc' }
        },
        alarmEvents: {
          where: { resolvedAt: null }
        }
      }
    });

    const commands = await this.prisma.controlCommand.findMany({
      where: { 
        requestedBy: userId,
        requestedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      include: { device: { select: { deviceName: true } } },
      orderBy: { requestedAt: 'desc' },
      take: 20
    });

    return {
      success: true,
      data: {
        deviceOperations: {
          assignedDevices: devices.map(device => ({
            id: device.id,
            name: device.deviceName,
            code: device.deviceCode,
            status: device.isActive ? 'online' : 'offline',
            recentTelemetry: device.telemetryEvents.slice(0, 5),
            activeAlarms: device.alarmEvents
          }))
        },
        commandHistory: commands,
        monitoring: {
          canSendCommands: true,
          canAcknowledgeAlarms: true,
          canViewReports: true
        },
        permissions: {
          deviceControl: true,
          alarmAcknowledgment: true,
          reportViewing: true
        }
      }
    };
  }

  /**
   * Viewer Dashboard - Read-only access
   */
  async getViewerDashboard(userId: string, clientId?: string) {
    if (!clientId) {
      throw new ForbiddenException('Client access required for viewer dashboard');
    }

    const devices = await this.prisma.device.findMany({
      where: { clientId, isActive: true },
      include: {
        telemetryEvents: {
          take: 5,
          orderBy: { time: 'desc' }
        }
      }
    });

    const reports = await this.getRecentReportsForClient(clientId);

    return {
      success: true,
      data: {
        deviceStatus: devices.map(device => ({
          id: device.id,
          name: device.deviceName,
          code: device.deviceCode,
          status: device.isActive ? 'online' : 'offline',
          latestTelemetry: device.telemetryEvents[0] || null
        })),
        reports: reports.slice(0, 5),
        permissions: {
          readOnly: true,
          canViewDevices: true,
          canViewReports: true,
          canViewDashboard: true
        }
      }
    };
  }

  /**
   * Widget Management
   */
  async createWidget(createWidgetDto: any, userId: string) {
    return await this.prisma.widget.create({
      data: {
        ...createWidgetDto,
        createdBy: userId
      }
    });
  }

  async configureWidget(widgetId: string, configDto: any, userId: string) {
    return await this.prisma.widget.update({
      where: { id: widgetId },
      data: { config: configDto }
    });
  }

  /**
   * User Management
   */
  async getUserRolesManagement(userId: string) {
    const [roles, users, permissions] = await Promise.all([
      this.prisma.role.findMany({
        include: { _count: { select: { users: true } } }
      }),
      this.prisma.user.findMany({
        include: { role: true, client: { select: { name: true } } },
        take: 100
      }),
      this.prisma.rolePermission.findMany({
        include: { role: { select: { name: true } } }
      })
    ]);

    return {
      roles: roles.map(role => ({
        ...role,
        userCount: role._count.users
      })),
      users,
      permissions: this.groupPermissionsByRole(permissions)
    };
  }

  async getClientUsers(clientId: string, userId: string, userRole: string) {
    // Role-based access control for user viewing
    const whereClause = userRole === 'super_user' ? { clientId } : { clientId, isActive: true };
    
    return await this.prisma.user.findMany({
      where: whereClause,
      include: { role: { select: { name: true, description: true } } }
    });
  }

  /**
   * Dashboard Customization
   */
  async customizeDashboard(customizationDto: any, userId: string, userRole: string) {
    // Role-based customization limits
    const allowedCustomizations = this.getAllowedCustomizations(userRole);
    
    const filteredCustomization = Object.keys(customizationDto)
      .filter(key => allowedCustomizations.includes(key))
      .reduce((obj, key) => {
        obj[key] = customizationDto[key];
        return obj;
      }, {});

    // Find existing layout for user
    const existingLayout = await this.prisma.dashboardLayout.findFirst({
      where: { userId }
    });

    if (existingLayout) {
      return await this.prisma.dashboardLayout.update({
        where: { id: existingLayout.id },
        data: { layoutConfig: filteredCustomization }
      });
    } else {
      return await this.prisma.dashboardLayout.create({
        data: {
          name: `${userRole} Dashboard`,
          userId,
          layoutConfig: filteredCustomization,
          isDefault: true
        }
      });
    }
  }

  // Helper methods
  private async calculateSystemHealth(): Promise<number> {
    const totalDevices = await this.prisma.device.count();
    const activeDevices = await this.prisma.device.count({ where: { isActive: true } });
    return totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 100;
  }

  private async getUserManagementData() {
    return await this.prisma.user.groupBy({
      by: ['roleId'],
      _count: { roleId: true },
      orderBy: { _count: { roleId: 'desc' } },
      take: 10
    });
  }

  private async getGlobalAlerts() {
    return await this.prisma.alarmEvent.findMany({
      where: { resolvedAt: null, severity: 'critical' },
      include: { device: { select: { deviceName: true } } },
      take: 10
    });
  }

  private async getPlatformAnalytics() {
    return {
      dailyActiveUsers: 0, // Implement based on requirements
      systemUptime: '99.9%',
      dataProcessed: '1.2TB'
    };
  }

  private async getRecentAlarmsForClients(clientIds?: string[]) {
    const where = clientIds ? { device: { clientId: { in: clientIds } } } : {};
    
    return await this.prisma.alarmEvent.findMany({
      where: {
        ...where,
        triggeredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      include: { device: { select: { deviceName: true, client: { select: { name: true } } } } },
      orderBy: { triggeredAt: 'desc' },
      take: 20
    });
  }

  private groupDevicesByClient(devices: any[]) {
    return devices.reduce((acc, device) => {
      const clientName = device.client?.name || 'Unknown';
      if (!acc[clientName]) acc[clientName] = [];
      acc[clientName].push(device);
      return acc;
    }, {});
  }

  private async getClientDetailsForAdmin(clientId?: string) {
    if (!clientId) return null;
    
    return await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        devices: { take: 10 },
        users: { include: { role: { select: { name: true } } } }
      }
    });
  }

  private async getActiveAlarmsForClient(clientId: string) {
    return await this.prisma.alarmEvent.findMany({
      where: { 
        device: { clientId },
        resolvedAt: null
      },
      include: { device: { select: { deviceName: true } } },
      take: 10
    });
  }

  private async getRecentReportsForClient(clientId: string) {
    // Placeholder - implement based on your reports system
    return [];
  }

  private groupPermissionsByRole(permissions: any[]) {
    return permissions.reduce((acc, perm) => {
      const roleName = perm.role.name;
      if (!acc[roleName]) acc[roleName] = [];
      acc[roleName].push({ resource: perm.resource, action: perm.action });
      return acc;
    }, {});
  }

  private getAllowedCustomizations(userRole: string): string[] {
    const customizationLevels = {
      super_user: ['layout', 'widgets', 'themes', 'advanced_settings'],
      admin: ['layout', 'widgets', 'themes'],
      client: ['layout', 'widgets'],
      operator: ['layout'],
      viewer: ['layout']
    };
    
    return customizationLevels[userRole] || ['layout'];
  }

  private getModificationWarnings(template: any, assignmentCount: number, isSystemDefault: boolean): string[] {
    const warnings: string[] = [];
    
    if (isSystemDefault) {
      warnings.push('This is a system default template. Modifications will affect all users with this role.');
    }
    
    if (assignmentCount > 0) {
      warnings.push(`This template is assigned to ${assignmentCount} client(s). Editing the original will affect all assigned clients.`);
    }
    
    if (template.isPublic) {
      warnings.push('This is a public template. Changes will be visible to all users who can access it.');
    }
    
    return warnings;
  }

  /**
   * Template Permission Management (Super User only)
   */
  
  /**
   * Grant template permissions to a user or role
   */
  async grantTemplatePermission(templateId: string, permissionData: {
    userId?: string;
    roleId?: string;
    canEdit: boolean;
    canCopy: boolean;
    requiresCopy?: boolean;
    expiresAt?: Date;
  }, grantedBy: string) {
    // Validate that either userId or roleId is provided, not both
    if ((!permissionData.userId && !permissionData.roleId) || 
        (permissionData.userId && permissionData.roleId)) {
      throw new Error('Must specify either userId or roleId, not both');
    }

    // Check if template exists
    const template = await this.prisma.dashboardTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Create or update permission
    const uniqueWhere = permissionData.userId 
      ? { templateId_userId: { templateId, userId: permissionData.userId } }
      : { templateId_roleId: { templateId, roleId: permissionData.roleId! } };

    return await this.prisma.templatePermission.upsert({
      where: uniqueWhere,
      update: {
        canEdit: permissionData.canEdit,
        canCopy: permissionData.canCopy,
        requiresCopy: permissionData.requiresCopy || false,
        expiresAt: permissionData.expiresAt,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        templateId,
        userId: permissionData.userId,
        roleId: permissionData.roleId,
        canEdit: permissionData.canEdit,
        canCopy: permissionData.canCopy,
        requiresCopy: permissionData.requiresCopy || false,
        grantedBy,
        expiresAt: permissionData.expiresAt,
        isActive: true
      },
      include: {
        template: { select: { name: true } },
        user: { select: { fullName: true, email: true } },
        role: { select: { name: true } },
        grantor: { select: { fullName: true } }
      }
    });
  }

  /**
   * Revoke template permission
   */
  async revokeTemplatePermission(templateId: string, userId?: string, roleId?: string) {
    const whereClause = userId 
      ? { templateId_userId: { templateId, userId } }
      : { templateId_roleId: { templateId, roleId: roleId! } };

    return await this.prisma.templatePermission.update({
      where: whereClause,
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get all permissions for a template
   */
  async getTemplatePermissions(templateId: string) {
    return await this.prisma.templatePermission.findMany({
      where: { templateId, isActive: true },
      include: {
        template: { select: { name: true, description: true } },
        user: { select: { id: true, fullName: true, email: true } },
        role: { select: { id: true, name: true, description: true } },
        grantor: { select: { fullName: true, email: true } }
      },
      orderBy: { grantedAt: 'desc' }
    });
  }

  /**
   * Get user's effective permissions for a template
   */
  async getUserTemplatePermissions(templateId: string, userId: string, userRole: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for direct user permissions
    const userPermission = await this.prisma.templatePermission.findFirst({
      where: {
        templateId,
        userId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    // Check for role-based permissions
    const rolePermission = await this.prisma.templatePermission.findFirst({
      where: {
        templateId,
        roleId: user.roleId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    // User permissions override role permissions
    const effectivePermission = userPermission || rolePermission;

    return {
      hasPermission: !!effectivePermission,
      canEdit: effectivePermission?.canEdit || false,
      canCopy: effectivePermission?.canCopy || true, // Default to allow copy
      requiresCopy: effectivePermission?.requiresCopy || false,
      source: userPermission ? 'user' : rolePermission ? 'role' : 'none',
      expiresAt: effectivePermission?.expiresAt
    };
  }

  /**
   * Dashboard Templates Management (Super User & Admin only)
   */
  
  /**
   * Create a new dashboard template
   */
  async createDashboardTemplate(templateData: {
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
  }, createdBy: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Create the template
      const template = await tx.dashboardTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          targetRole: templateData.targetRole,
          layoutConfig: templateData.layoutConfig,
          isPublic: templateData.isPublic || false,
          createdBy,
        }
      });

      // Add widgets to the template
      if (templateData.widgets && templateData.widgets.length > 0) {
        await tx.dashboardTemplateWidget.createMany({
          data: templateData.widgets.map(widget => ({
            templateId: template.id,
            widgetId: widget.widgetId,
            position: widget.position,
            configOverrides: widget.configOverrides,
            isRequired: widget.isRequired || false
          }))
        });
      }

      return await tx.dashboardTemplate.findUnique({
        where: { id: template.id },
        include: {
          templateWidgets: {
            include: {
              widget: {
                select: { id: true, name: true, widgetType: true, config: true }
              }
            }
          }
        }
      });
    });
  }

  /**
   * Get template modification options (enhanced with permission system)
   */
  async getTemplateModificationOptions(templateId: string, userId: string) {
    const [template, user] = await Promise.all([
      this.prisma.dashboardTemplate.findUnique({
        where: { id: templateId },
        include: {
          creator: { select: { id: true, fullName: true } },
          clientAssignments: {
            where: { isActive: true },
            include: { client: { select: { name: true } } }
          },
          _count: {
            select: { clientAssignments: { where: { isActive: true } } }
          }
        }
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
      })
    ]);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCreator = template.createdBy === userId;
    const assignmentCount = template._count.clientAssignments;
    const isSystemDefault = template.isSystemDefault;
    const isSuperUser = user.role.name === 'super_user';

    // Get user's effective permissions for this template
    const userPermissions = await this.getUserTemplatePermissions(templateId, userId, user.role.name);

    // Determine modification permissions and recommendations
    let canEditOriginal = false;
    let canCopy = true;
    let recommendation: string;

    if (isSuperUser) {
      // Super users can always edit (unless system default requires special handling)
      canEditOriginal = !isSystemDefault || isCreator;
      canCopy = true;
      recommendation = isSystemDefault ? 'copy_recommended' : 'either';
    } else if (userPermissions.hasPermission) {
      // User has explicit permissions
      canEditOriginal = userPermissions.canEdit && !userPermissions.requiresCopy;
      canCopy = userPermissions.canCopy;
      
      if (userPermissions.requiresCopy) {
        recommendation = 'copy_required';
      } else if (userPermissions.canEdit && assignmentCount > 0) {
        recommendation = 'copy_recommended';
      } else if (userPermissions.canEdit) {
        recommendation = 'either';
      } else {
        recommendation = 'copy_only';
      }
    } else if (isCreator && !isSystemDefault) {
      // Original creator permissions (legacy behavior)
      canEditOriginal = true;
      canCopy = true;
      recommendation = assignmentCount > 0 ? 'copy_recommended' : 'either';
    } else {
      // No permissions - copy only
      canEditOriginal = false;
      canCopy = true;
      recommendation = 'copy_only';
    }

    const warnings = this.getModificationWarnings(template, assignmentCount, isSystemDefault);
    
    // Add permission-specific warnings
    if (userPermissions.hasPermission && userPermissions.expiresAt) {
      warnings.push(`Your editing permission expires on ${userPermissions.expiresAt.toLocaleDateString()}`);
    }

    return {
      templateInfo: {
        id: template.id,
        name: template.name,
        description: template.description,
        targetRole: template.targetRole,
        isSystemDefault: template.isSystemDefault,
        isPublic: template.isPublic,
        creator: template.creator
      },
      canEditOriginal,
      canCopy,
      recommendation,
      assignmentCount,
      assignedClients: template.clientAssignments.map(a => a.client.name),
      warnings,
      permissions: {
        source: userPermissions.source,
        hasExplicitPermission: userPermissions.hasPermission,
        expiresAt: userPermissions.expiresAt
      }
    };
  }

  /**
   * Copy dashboard template
   */
  async copyDashboardTemplate(templateId: string, copyData: {
    name: string;
    description?: string;
    targetRole?: string;
    isPublic?: boolean;
  }, userId: string) {
    const originalTemplate = await this.prisma.dashboardTemplate.findUnique({
      where: { id: templateId },
      include: {
        templateWidgets: {
          include: { widget: true }
        }
      }
    });

    if (!originalTemplate) {
      throw new NotFoundException('Template not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create new template as copy
      const newTemplate = await tx.dashboardTemplate.create({
        data: {
          name: copyData.name,
          description: copyData.description || `Copy of ${originalTemplate.name}`,
          targetRole: copyData.targetRole || originalTemplate.targetRole,
          layoutConfig: originalTemplate.layoutConfig,
          isPublic: copyData.isPublic || false,
          isSystemDefault: false,
          createdBy: userId
        }
      });

      // Copy widgets from original template
      if (originalTemplate.templateWidgets.length > 0) {
        await tx.dashboardTemplateWidget.createMany({
          data: originalTemplate.templateWidgets.map(tw => ({
            templateId: newTemplate.id,
            widgetId: tw.widgetId,
            position: tw.position,
            configOverrides: tw.configOverrides,
            isRequired: tw.isRequired
          }))
        });
      }

      return await tx.dashboardTemplate.findUnique({
        where: { id: newTemplate.id },
        include: {
          templateWidgets: {
            include: {
              widget: {
                select: { id: true, name: true, widgetType: true, config: true }
              }
            }
          }
        }
      });
    });
  }

  /**
   * Update dashboard template
   */
  async updateDashboardTemplate(templateId: string, updateData: {
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
  }, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Update template basic info
      const template = await tx.dashboardTemplate.update({
        where: { id: templateId },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.description && { description: updateData.description }),
          ...(updateData.layoutConfig && { layoutConfig: updateData.layoutConfig }),
          ...(updateData.isPublic !== undefined && { isPublic: updateData.isPublic }),
          updatedAt: new Date()
        }
      });

      // Update widgets if provided
      if (updateData.widgets) {
        // Remove existing widgets
        await tx.dashboardTemplateWidget.deleteMany({
          where: { templateId }
        });

        // Add new widgets
        if (updateData.widgets.length > 0) {
          await tx.dashboardTemplateWidget.createMany({
            data: updateData.widgets.map(widget => ({
              templateId: templateId,
              widgetId: widget.widgetId,
              position: widget.position,
              configOverrides: widget.configOverrides,
              isRequired: widget.isRequired || false
            }))
          });
        }
      }

      return await tx.dashboardTemplate.findUnique({
        where: { id: templateId },
        include: {
          templateWidgets: {
            include: {
              widget: {
                select: { id: true, name: true, widgetType: true, config: true }
              }
            }
          },
          clientAssignments: {
            include: {
              client: { select: { id: true, name: true } }
            }
          }
        }
      });
    });
  }

  /**
   * Assign template to client
   */
  async assignTemplateToClient(templateId: string, clientId: string, assignedBy: string, permissions: any = { canView: true, canEdit: false }) {
    const existingAssignment = await this.prisma.clientDashboardAssignment.findUnique({
      where: { templateId_clientId: { templateId, clientId } }
    });

    if (existingAssignment) {
      return await this.prisma.clientDashboardAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          isActive: true,
          permissions,
          assignedBy,
          updatedAt: new Date()
        },
        include: {
          template: { select: { id: true, name: true, targetRole: true } },
          client: { select: { id: true, name: true } }
        }
      });
    }

    return await this.prisma.clientDashboardAssignment.create({
      data: {
        templateId,
        clientId,
        assignedBy,
        permissions,
        isActive: true
      },
      include: {
        template: { select: { id: true, name: true, targetRole: true } },
        client: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Remove template assignment from client
   */
  async unassignTemplateFromClient(templateId: string, clientId: string) {
    return await this.prisma.clientDashboardAssignment.updateMany({
      where: { templateId, clientId },
      data: { isActive: false, updatedAt: new Date() }
    });
  }

  /**
   * Get templates available for a user
   */
  async getAvailableTemplates(userId: string, userRole: string, clientId?: string) {
    const where: any = {
      OR: [
        { targetRole: userRole, isPublic: true }, // Public templates for user's role
      ]
    };

    // If user has a client, include assigned templates
    if (clientId) {
      where.OR.push({
        clientAssignments: {
          some: {
            clientId,
            isActive: true
          }
        }
      });
    }

    return await this.prisma.dashboardTemplate.findMany({
      where,
      include: {
        templateWidgets: {
          include: {
            widget: {
              select: { id: true, name: true, widgetType: true, config: true }
            }
          },
          orderBy: { position: 'asc' }
        },
        creator: {
          select: { id: true, fullName: true, email: true }
        }
      },
      orderBy: [
        { isSystemDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  /**
   * Get all templates created by user (for admin/super_user)
   */
  async getMyTemplates(userId: string) {
    return await this.prisma.dashboardTemplate.findMany({
      where: { createdBy: userId },
      include: {
        templateWidgets: {
          include: {
            widget: {
              select: { id: true, name: true, widgetType: true }
            }
          }
        },
        clientAssignments: {
          where: { isActive: true },
          include: {
            client: { select: { id: true, name: true } }
          }
        },
        _count: {
          select: {
            clientAssignments: { where: { isActive: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Create system default templates for all roles
   */
  async createSystemDefaults(createdBy: string) {
    const defaultTemplates = [
      {
        name: 'Super User Default Dashboard',
        description: 'Default system-wide dashboard for super users',
        targetRole: 'super_user',
        layoutConfig: {
          type: 'grid',
          columns: 4,
          spacing: 16,
          autoHeight: true
        },
        widgets: [] // Will be populated with system widgets
      },
      {
        name: 'Admin Default Dashboard',
        description: 'Default dashboard for administrators',
        targetRole: 'admin',
        layoutConfig: {
          type: 'grid',
          columns: 3,
          spacing: 12,
          autoHeight: true
        },
        widgets: []
      },
      {
        name: 'Client Default Dashboard',
        description: 'Default dashboard for clients',
        targetRole: 'client',
        layoutConfig: {
          type: 'grid',
          columns: 3,
          spacing: 12,
          autoHeight: true
        },
        widgets: []
      },
      {
        name: 'Operator Default Dashboard',
        description: 'Default dashboard for operators',
        targetRole: 'operator',
        layoutConfig: {
          type: 'grid',
          columns: 2,
          spacing: 8,
          autoHeight: true
        },
        widgets: []
      },
      {
        name: 'Viewer Default Dashboard',
        description: 'Default read-only dashboard for viewers',
        targetRole: 'viewer',
        layoutConfig: {
          type: 'grid',
          columns: 2,
          spacing: 8,
          autoHeight: true
        },
        widgets: []
      }
    ];

    const createdTemplates = [];

    for (const templateData of defaultTemplates) {
      const template = await this.prisma.dashboardTemplate.create({
        data: {
          ...templateData,
          isSystemDefault: true,
          isPublic: true,
          createdBy
        }
      });
      createdTemplates.push(template);
    }

    return createdTemplates;
  }

  /**
   * Apply template to user's dashboard
   */
  async applyTemplateToUser(templateId: string, userId: string) {
    const template = await this.prisma.dashboardTemplate.findUnique({
      where: { id: templateId },
      include: {
        templateWidgets: {
          include: { widget: true }
        }
      }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Find or create user's dashboard layout
      let userLayout = await tx.dashboardLayout.findFirst({
        where: { userId, isDefault: true }
      });

      if (userLayout) {
        // Update existing layout
        userLayout = await tx.dashboardLayout.update({
          where: { id: userLayout.id },
          data: {
            name: template.name,
            layoutConfig: template.layoutConfig,
            updatedAt: new Date()
          }
        });

        // Remove existing widgets
        await tx.dashboardWidget.deleteMany({
          where: { dashboardId: userLayout.id }
        });
      } else {
        // Create new layout
        userLayout = await tx.dashboardLayout.create({
          data: {
            name: template.name,
            userId,
            layoutConfig: template.layoutConfig,
            isDefault: true
          }
        });
      }

      // Add widgets from template
      if (template.templateWidgets.length > 0) {
        await tx.dashboardWidget.createMany({
          data: template.templateWidgets.map(tw => ({
            dashboardId: userLayout.id,
            widgetId: tw.widgetId,
            position: tw.position,
            configOverrides: tw.configOverrides
          }))
        });
      }

      return userLayout;
    });
  }
}