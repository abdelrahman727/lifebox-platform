import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CalculationEngine, CalculationContext } from './calculation.engine';
import { 
  CreateQuickViewPageDto,
  UpdateQuickViewPageDto,
  ShareQuickViewPageDto,
  UpdateQuickViewShareDto,
  QuickViewPageResponseDto,
  QuickViewPageSummaryDto,
  ExecuteQuickViewCommandDto,
  QuickViewQueryDto,
  CreateQuickViewCalculationDto,
  UpdateQuickViewCalculationDto,
  CreateQuickViewFilterDto,
  UpdateQuickViewFilterDto,
  QuickViewCalculationDto,
  QuickViewFilterDto,
  CalculationResultDto
} from './dto/quick-view-pages.dto';

@Injectable()
export class QuickViewPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculationEngine: CalculationEngine
  ) {}

  async createPage(userId: string, createDto: CreateQuickViewPageDto): Promise<QuickViewPageResponseDto> {
    // Check if slug is unique
    const existingPage = await this.prisma.quickViewPage.findUnique({
      where: { slug: createDto.slug }
    });

    if (existingPage) {
      throw new ConflictException('Page slug must be unique');
    }

    // Validate that all devices exist and user has access
    const devices = await this.prisma.device.findMany({
      where: {
        id: { in: createDto.deviceIds },
        isActive: true
      },
      include: {
        client: true
      }
    });

    if (devices.length !== createDto.deviceIds.length) {
      throw new NotFoundException('Some devices were not found or are inactive');
    }

    // Validate that all command templates exist
    const commandTemplates = await this.prisma.commandTemplate.findMany({
      where: {
        id: { in: createDto.commandTemplateIds },
        isActive: true
      }
    });

    if (commandTemplates.length !== createDto.commandTemplateIds.length) {
      throw new NotFoundException('Some command templates were not found or are inactive');
    }

    // Create the page with devices and commands
    const page = await this.prisma.quickViewPage.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        slug: createDto.slug,
        createdBy: userId,
        devices: {
          create: createDto.deviceIds.map((deviceId, index) => ({
            deviceId,
            displayOrder: index + 1
          }))
        },
        commands: {
          create: createDto.commandTemplateIds.map((commandTemplateId, index) => ({
            commandTemplateId,
            displayOrder: index + 1
          }))
        }
      },
      include: this.getFullPageInclude()
    });

    return this.transformToResponseDto(page);
  }

  async getPageById(pageId: string, userId: string): Promise<QuickViewPageResponseDto> {
    const page = await this.prisma.quickViewPage.findUnique({
      where: { id: pageId },
      include: this.getFullPageInclude()
    });

    if (!page) {
      throw new NotFoundException('Quick view page not found');
    }

    // Check if user has access (creator or shared with)
    if (page.createdBy !== userId) {
      const share = await this.prisma.quickViewPageShare.findFirst({
        where: {
          quickViewPageId: pageId,
          userId: userId,
          isActive: true
        }
      });

      if (!share) {
        throw new ForbiddenException('You do not have access to this page');
      }
    }

    return this.transformToResponseDto(page);
  }

  async getPageBySlug(slug: string, userId: string): Promise<QuickViewPageResponseDto> {
    const page = await this.prisma.quickViewPage.findUnique({
      where: { slug },
      include: this.getFullPageInclude()
    });

    if (!page) {
      throw new NotFoundException('Quick view page not found');
    }

    if (!page.isActive) {
      throw new ForbiddenException('Page is not active');
    }

    // Check if user has access
    if (page.createdBy !== userId) {
      const share = await this.prisma.quickViewPageShare.findFirst({
        where: {
          quickViewPageId: page.id,
          userId: userId,
          isActive: true
        }
      });

      if (!share) {
        throw new ForbiddenException('You do not have access to this page');
      }
    }

    return this.transformToResponseDto(page);
  }

  async getUserPages(userId: string, queryDto: QuickViewQueryDto) {
    const { search, isActive, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { createdBy: userId },
        {
          shares: {
            some: {
              userId: userId,
              isActive: true
            }
          }
        }
      ]
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [pages, total] = await Promise.all([
      this.prisma.quickViewPage.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          _count: {
            select: {
              devices: true,
              commands: true,
              shares: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.quickViewPage.count({ where })
    ]);

    const summaries: QuickViewPageSummaryDto[] = pages.map(page => ({
      id: page.id,
      name: page.name,
      description: page.description,
      slug: page.slug,
      isActive: page.isActive,
      deviceCount: page._count.devices,
      commandCount: page._count.commands,
      shareCount: page._count.shares,
      createdAt: page.createdAt,
      creator: page.creator
    }));

    return {
      data: summaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updatePage(pageId: string, userId: string, updateDto: UpdateQuickViewPageDto): Promise<QuickViewPageResponseDto> {
    const page = await this.prisma.quickViewPage.findUnique({
      where: { id: pageId }
    });

    if (!page) {
      throw new NotFoundException('Quick view page not found');
    }

    if (page.createdBy !== userId) {
      throw new ForbiddenException('You can only update pages you created');
    }

    // Check slug uniqueness if updating
    if (updateDto.slug && updateDto.slug !== page.slug) {
      const existingPage = await this.prisma.quickViewPage.findUnique({
        where: { slug: updateDto.slug }
      });

      if (existingPage) {
        throw new ConflictException('Page slug must be unique');
      }
    }

    // Handle device updates
    if (updateDto.deviceIds) {
      const devices = await this.prisma.device.findMany({
        where: {
          id: { in: updateDto.deviceIds },
          isActive: true
        }
      });

      if (devices.length !== updateDto.deviceIds.length) {
        throw new NotFoundException('Some devices were not found or are inactive');
      }

      // Delete existing device associations and create new ones
      await this.prisma.quickViewDevice.deleteMany({
        where: { quickViewPageId: pageId }
      });

      await this.prisma.quickViewDevice.createMany({
        data: updateDto.deviceIds.map((deviceId, index) => ({
          quickViewPageId: pageId,
          deviceId,
          displayOrder: index + 1
        }))
      });
    }

    // Handle command updates
    if (updateDto.commandTemplateIds) {
      const commandTemplates = await this.prisma.commandTemplate.findMany({
        where: {
          id: { in: updateDto.commandTemplateIds },
          isActive: true
        }
      });

      if (commandTemplates.length !== updateDto.commandTemplateIds.length) {
        throw new NotFoundException('Some command templates were not found or are inactive');
      }

      // Delete existing command associations and create new ones
      await this.prisma.quickViewCommand.deleteMany({
        where: { quickViewPageId: pageId }
      });

      await this.prisma.quickViewCommand.createMany({
        data: updateDto.commandTemplateIds.map((commandTemplateId, index) => ({
          quickViewPageId: pageId,
          commandTemplateId,
          displayOrder: index + 1
        }))
      });
    }

    // Update page properties
    const updatedPage = await this.prisma.quickViewPage.update({
      where: { id: pageId },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        slug: updateDto.slug,
        isActive: updateDto.isActive
      },
      include: this.getFullPageInclude()
    });

    return this.transformToResponseDto(updatedPage);
  }

  async deletePage(pageId: string, userId: string): Promise<void> {
    const page = await this.prisma.quickViewPage.findUnique({
      where: { id: pageId }
    });

    if (!page) {
      throw new NotFoundException('Quick view page not found');
    }

    if (page.createdBy !== userId) {
      throw new ForbiddenException('You can only delete pages you created');
    }

    // Delete all related records (cascade should handle this, but being explicit)
    await this.prisma.$transaction([
      this.prisma.quickViewDevice.deleteMany({ where: { quickViewPageId: pageId } }),
      this.prisma.quickViewCommand.deleteMany({ where: { quickViewPageId: pageId } }),
      this.prisma.quickViewPageShare.deleteMany({ where: { quickViewPageId: pageId } }),
      this.prisma.quickViewPage.delete({ where: { id: pageId } })
    ]);
  }

  async sharePage(pageId: string, creatorId: string, shareDto: ShareQuickViewPageDto) {
    const page = await this.prisma.quickViewPage.findUnique({
      where: { id: pageId }
    });

    if (!page) {
      throw new NotFoundException('Quick view page not found');
    }

    if (page.createdBy !== creatorId) {
      throw new ForbiddenException('You can only share pages you created');
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: shareDto.userId }
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if already shared
    const existingShare = await this.prisma.quickViewPageShare.findFirst({
      where: {
        quickViewPageId: pageId,
        userId: shareDto.userId
      }
    });

    if (existingShare) {
      // Update existing share
      return this.prisma.quickViewPageShare.update({
        where: { id: existingShare.id },
        data: {
          canUseCommands: shareDto.canUseCommands,
          isActive: true,
          sharedBy: creatorId
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: {
                select: { name: true }
              }
            }
          },
          sharedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });
    }

    // Create new share
    return this.prisma.quickViewPageShare.create({
      data: {
        quickViewPageId: pageId,
        userId: shareDto.userId,
        canUseCommands: shareDto.canUseCommands,
        sharedBy: creatorId
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: {
              select: { name: true }
            }
          }
        },
        sharedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
  }

  async updateShare(shareId: string, creatorId: string, updateDto: UpdateQuickViewShareDto) {
    const share = await this.prisma.quickViewPageShare.findUnique({
      where: { id: shareId },
      include: {
        quickViewPage: true
      }
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    if (share.quickViewPage.createdBy !== creatorId) {
      throw new ForbiddenException('You can only update shares for pages you created');
    }

    return this.prisma.quickViewPageShare.update({
      where: { id: shareId },
      data: updateDto,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: {
              select: { name: true }
            }
          }
        },
        sharedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
  }

  async removeShare(shareId: string, creatorId: string): Promise<void> {
    const share = await this.prisma.quickViewPageShare.findUnique({
      where: { id: shareId },
      include: {
        quickViewPage: true
      }
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    if (share.quickViewPage.createdBy !== creatorId) {
      throw new ForbiddenException('You can only remove shares for pages you created');
    }

    await this.prisma.quickViewPageShare.delete({
      where: { id: shareId }
    });
  }

  async executeCommand(pageId: string, userId: string, executeDto: ExecuteQuickViewCommandDto) {
    // Get page and verify access
    const page = await this.prisma.quickViewPage.findUnique({
      where: { id: pageId },
      include: {
        devices: {
          where: { deviceId: executeDto.deviceId }
        },
        commands: {
          where: { commandTemplateId: executeDto.commandTemplateId },
          include: {
            commandTemplate: true
          }
        },
        shares: {
          where: {
            userId: userId,
            isActive: true
          }
        }
      }
    });

    if (!page) {
      throw new NotFoundException('Quick view page not found');
    }

    // Check access and command permissions
    let canUseCommands = false;
    if (page.createdBy === userId) {
      canUseCommands = true;
    } else {
      const share = page.shares[0];
      if (!share) {
        throw new ForbiddenException('You do not have access to this page');
      }
      canUseCommands = share.canUseCommands;
    }

    if (!canUseCommands) {
      throw new ForbiddenException('You do not have permission to execute commands on this page');
    }

    // Verify device is in page
    if (page.devices.length === 0) {
      throw new NotFoundException('Device not found in this page');
    }

    // Verify command is in page
    if (page.commands.length === 0) {
      throw new NotFoundException('Command not found in this page');
    }

    const commandTemplate = page.commands[0].commandTemplate;

    // Get user permissions for role-based command validation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    // Check if user's role can execute this command
    const hasPermission = user.role.permissions.some(
      permission => permission.resource === 'devices' && permission.action === 'command'
    );

    if (!hasPermission) {
      throw new ForbiddenException('Your role does not have permission to execute device commands');
    }

    // Create and send the command
    const command = await this.prisma.controlCommand.create({
      data: {
        deviceId: executeDto.deviceId,
        commandType: commandTemplate.name,
        payload: {
          templateId: executeDto.commandTemplateId,
          parameters: executeDto.parameters || {}
        },
        status: 'pending',
        requestedBy: userId
      }
    });

    // TODO: Send command via MQTT (when MQTT service is implemented)
    // For now, just return the created command
    return {
      commandId: command.id,
      status: command.status,
      message: 'Command queued for execution'
    };
  }

  private getFullPageInclude() {
    return {
      creator: true,
      devices: {
        include: {
          device: true
        }
      },
      commands: {
        include: {
          commandTemplate: true
        }
      },
      shares: {
        include: {
          user: true,
          sharedByUser: true
        }
      }
    };
  }

  private transformToResponseDto(page: any): QuickViewPageResponseDto {
    return {
      id: page.id,
      name: page.name,
      description: page.description,
      slug: page.slug,
      isActive: page.isActive,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      creator: {
        id: page.creator.id,
        fullName: page.creator.fullName,
        email: page.creator.email
      },
      devices: (page.devices || []).map(d => ({
        id: d.id,
        displayOrder: d.displayOrder,
        device: {
          id: d.device.id,
          deviceName: d.device.deviceName,
          deviceCode: d.device.deviceCode,
          isActive: d.device.isActive,
          client: {
            id: d.device.client?.id || '',
            companyName: d.device.client?.companyName || ''
          }
        }
      })),
      commands: (page.commands || []).map(c => ({
        id: c.id,
        displayOrder: c.displayOrder,
        customLabel: c.customLabel,
        commandTemplate: {
          id: c.commandTemplate.id,
          name: c.commandTemplate.name,
          displayName: c.commandTemplate.displayName,
          description: c.commandTemplate.description,
          category: c.commandTemplate.category,
          requiredRole: c.commandTemplate.requiredRole
        }
      })),
      shares: (page.shares || []).map(s => ({
        id: s.id,
        canUseCommands: s.canUseCommands,
        isActive: s.isActive,
        createdAt: s.createdAt,
        user: {
          id: s.user.id,
          fullName: s.user.fullName,
          email: s.user.email,
          role: {
            name: s.user.role?.name || ''
          }
        },
        sharedByUser: {
          id: s.sharedByUser.id,
          fullName: s.sharedByUser.fullName,
          email: s.sharedByUser.email
        }
      }))
    };
  }

  // CUSTOM CALCULATIONS METHODS

  async createCalculation(
    pageId: string, 
    userId: string, 
    createDto: CreateQuickViewCalculationDto
  ): Promise<QuickViewCalculationDto> {
    // Verify user owns the page
    const page = await this.verifyPageOwnership(pageId, userId);

    // Validate that all devices exist and are in the page
    const pageDeviceIds = page.devices.map(d => d.deviceId);
    const calculationDeviceIds = createDto.variables.map(v => v.deviceId);
    const invalidDevices = calculationDeviceIds.filter(id => !pageDeviceIds.includes(id));
    
    if (invalidDevices.length > 0) {
      throw new BadRequestException(`Devices not found in page: ${invalidDevices.join(', ')}`);
    }

    // Validate formula
    try {
      // Cast DTO variables to calculation engine format
      const engineVariables = createDto.variables.map(v => ({
        variableName: v.variableName,
        deviceId: v.deviceId,
        fieldName: v.fieldName,
        aggregation: v.aggregation as 'latest' | 'avg' | 'sum' | 'min' | 'max' | 'count',
        timeWindow: v.timeWindow
      }));
      this.calculationEngine.validateFormula(createDto.formula, engineVariables);
    } catch (error) {
      throw new BadRequestException(`Invalid formula: ${error.message}`);
    }

    // Create calculation
    const calculation = await this.prisma.quickViewCalculation.create({
      data: {
        quickViewPageId: pageId,
        name: createDto.name,
        description: createDto.description,
        formula: createDto.formula,
        displayOrder: createDto.displayOrder || 0,
        resultUnit: createDto.resultUnit,
        displayFormat: createDto.displayFormat || 'number',
        decimalPlaces: createDto.decimalPlaces || 2,
        variables: {
          create: createDto.variables.map(v => ({
            variableName: v.variableName,
            deviceId: v.deviceId,
            fieldName: v.fieldName,
            aggregation: v.aggregation || 'latest',
            timeWindow: v.timeWindow
          }))
        }
      },
      include: {
        variables: {
          include: {
            device: {
              select: {
                id: true,
                deviceName: true,
                deviceCode: true
              }
            }
          }
        }
      }
    });

    return this.transformCalculationToDto(calculation);
  }

  async getPageCalculations(pageId: string, userId: string): Promise<QuickViewCalculationDto[]> {
    // Verify user has access to the page
    await this.verifyPageAccess(pageId, userId);

    const calculations = await this.prisma.quickViewCalculation.findMany({
      where: {
        quickViewPageId: pageId,
        isActive: true
      },
      include: {
        variables: {
          include: {
            device: {
              select: {
                id: true,
                deviceName: true,
                deviceCode: true
              }
            }
          }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    return calculations.map(c => this.transformCalculationToDto(c));
  }

  async updateCalculation(
    calculationId: string,
    userId: string,
    updateDto: UpdateQuickViewCalculationDto
  ): Promise<QuickViewCalculationDto> {
    const calculation = await this.prisma.quickViewCalculation.findUnique({
      where: { id: calculationId },
      include: {
        quickViewPage: {
          include: {
            devices: true
          }
        }
      }
    });

    if (!calculation) {
      throw new NotFoundException('Calculation not found');
    }

    // Verify ownership
    if (calculation.quickViewPage.createdBy !== userId) {
      throw new ForbiddenException('You can only update calculations for pages you created');
    }

    // Validate formula if provided
    if (updateDto.formula && updateDto.variables) {
      try {
        // Cast DTO variables to calculation engine format
        const engineVariables = updateDto.variables.map(v => ({
          variableName: v.variableName,
          deviceId: v.deviceId,
          fieldName: v.fieldName,
          aggregation: v.aggregation as 'latest' | 'avg' | 'sum' | 'min' | 'max' | 'count',
          timeWindow: v.timeWindow
        }));
        this.calculationEngine.validateFormula(updateDto.formula, engineVariables);
      } catch (error) {
        throw new BadRequestException(`Invalid formula: ${error.message}`);
      }

      // Validate devices are in page
      const pageDeviceIds = calculation.quickViewPage.devices.map(d => d.deviceId);
      const calculationDeviceIds = updateDto.variables.map(v => v.deviceId);
      const invalidDevices = calculationDeviceIds.filter(id => !pageDeviceIds.includes(id));
      
      if (invalidDevices.length > 0) {
        throw new BadRequestException(`Devices not found in page: ${invalidDevices.join(', ')}`);
      }
    }

    // Update calculation
    const updated = await this.prisma.quickViewCalculation.update({
      where: { id: calculationId },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        formula: updateDto.formula,
        isActive: updateDto.isActive,
        displayOrder: updateDto.displayOrder,
        resultUnit: updateDto.resultUnit,
        displayFormat: updateDto.displayFormat,
        decimalPlaces: updateDto.decimalPlaces,
        ...(updateDto.variables && {
          variables: {
            deleteMany: {},
            create: updateDto.variables.map(v => ({
              variableName: v.variableName,
              deviceId: v.deviceId,
              fieldName: v.fieldName,
              aggregation: v.aggregation || 'latest',
              timeWindow: v.timeWindow
            }))
          }
        })
      },
      include: {
        variables: {
          include: {
            device: {
              select: {
                id: true,
                deviceName: true,
                deviceCode: true
              }
            }
          }
        }
      }
    });

    return this.transformCalculationToDto(updated);
  }

  async deleteCalculation(calculationId: string, userId: string): Promise<void> {
    const calculation = await this.prisma.quickViewCalculation.findUnique({
      where: { id: calculationId },
      include: {
        quickViewPage: true
      }
    });

    if (!calculation) {
      throw new NotFoundException('Calculation not found');
    }

    if (calculation.quickViewPage.createdBy !== userId) {
      throw new ForbiddenException('You can only delete calculations for pages you created');
    }

    await this.prisma.quickViewCalculation.delete({
      where: { id: calculationId }
    });
  }

  async getCalculationResults(
    pageId: string,
    userId: string,
    filterId?: string
  ): Promise<CalculationResultDto[]> {
    // Verify access
    await this.verifyPageAccess(pageId, userId);

    // Get calculations
    const calculations = await this.prisma.quickViewCalculation.findMany({
      where: {
        quickViewPageId: pageId,
        isActive: true
      },
      include: {
        variables: {
          include: {
            device: true
          }
        }
      }
    });

    // Get device data (latest telemetry for each device)
    const deviceIds = [...new Set(calculations.flatMap(c => c.variables.map((v: any) => v.deviceId as string)))];
    const deviceData = await this.getLatestDeviceData(deviceIds);

    // Apply filtering if requested
    let filteredData: Record<string, any[]> | undefined;
    if (filterId) {
      filteredData = await this.applyFilter(deviceIds, filterId);
    }

    // Execute calculations
    const results: CalculationResultDto[] = [];
    
    for (const calculation of calculations) {
      const context: CalculationContext = {
        variables: {},
        deviceData,
        filteredData
      };

      // Cast database variables to calculation engine format
      const engineVariables = calculation.variables.map((v: any) => ({
        variableName: v.variableName,
        deviceId: v.deviceId,
        fieldName: v.fieldName,
        aggregation: v.aggregation as 'latest' | 'avg' | 'sum' | 'min' | 'max' | 'count',
        timeWindow: v.timeWindow
      }));

      const result = await this.calculationEngine.executeCalculation(
        calculation.formula,
        engineVariables,
        context
      );

      const formattedValue = this.calculationEngine.formatResult(
        result.value,
        calculation.displayFormat as any,
        calculation.decimalPlaces,
        calculation.resultUnit
      );

      results.push({
        calculationId: calculation.id,
        name: calculation.name,
        value: result.value,
        formattedValue,
        unit: calculation.resultUnit,
        error: result.error,
        lastUpdated: new Date()
      });
    }

    return results;
  }

  // FILTERING METHODS

  async createFilter(
    pageId: string,
    userId: string,
    createDto: CreateQuickViewFilterDto
  ): Promise<QuickViewFilterDto> {
    // Verify ownership
    await this.verifyPageOwnership(pageId, userId);

    // If setting as default, unset other defaults
    if (createDto.isDefault) {
      await this.prisma.quickViewFilter.updateMany({
        where: {
          quickViewPageId: pageId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const filter = await this.prisma.quickViewFilter.create({
      data: {
        quickViewPageId: pageId,
        name: createDto.name,
        description: createDto.description,
        isDefault: createDto.isDefault || false,
        conditions: {
          create: createDto.conditions.map(c => ({
            deviceId: c.deviceId,
            fieldName: c.fieldName,
            operator: c.operator,
            value: c.value,
            logicalOp: c.logicalOp || 'AND'
          }))
        }
      },
      include: {
        conditions: {
          include: {
            device: {
              select: {
                id: true,
                deviceName: true,
                deviceCode: true
              }
            }
          }
        }
      }
    });

    return this.transformFilterToDto(filter);
  }

  async getPageFilters(pageId: string, userId: string): Promise<QuickViewFilterDto[]> {
    // Verify access
    await this.verifyPageAccess(pageId, userId);

    const filters = await this.prisma.quickViewFilter.findMany({
      where: {
        quickViewPageId: pageId,
        isActive: true
      },
      include: {
        conditions: {
          include: {
            device: {
              select: {
                id: true,
                deviceName: true,
                deviceCode: true
              }
            }
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    return filters.map(f => this.transformFilterToDto(f));
  }

  async updateFilter(
    filterId: string,
    userId: string,
    updateDto: UpdateQuickViewFilterDto
  ): Promise<QuickViewFilterDto> {
    const filter = await this.prisma.quickViewFilter.findUnique({
      where: { id: filterId },
      include: {
        quickViewPage: true
      }
    });

    if (!filter) {
      throw new NotFoundException('Filter not found');
    }

    if (filter.quickViewPage.createdBy !== userId) {
      throw new ForbiddenException('You can only update filters for pages you created');
    }

    // Handle default filter logic
    if (updateDto.isDefault && !filter.isDefault) {
      await this.prisma.quickViewFilter.updateMany({
        where: {
          quickViewPageId: filter.quickViewPageId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const updated = await this.prisma.quickViewFilter.update({
      where: { id: filterId },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        isActive: updateDto.isActive,
        isDefault: updateDto.isDefault,
        ...(updateDto.conditions && {
          conditions: {
            deleteMany: {},
            create: updateDto.conditions.map(c => ({
              deviceId: c.deviceId,
              fieldName: c.fieldName,
              operator: c.operator,
              value: c.value,
              logicalOp: c.logicalOp || 'AND'
            }))
          }
        })
      },
      include: {
        conditions: {
          include: {
            device: {
              select: {
                id: true,
                deviceName: true,
                deviceCode: true
              }
            }
          }
        }
      }
    });

    return this.transformFilterToDto(updated);
  }

  async deleteFilter(filterId: string, userId: string): Promise<void> {
    const filter = await this.prisma.quickViewFilter.findUnique({
      where: { id: filterId },
      include: {
        quickViewPage: true
      }
    });

    if (!filter) {
      throw new NotFoundException('Filter not found');
    }

    if (filter.quickViewPage.createdBy !== userId) {
      throw new ForbiddenException('You can only delete filters for pages you created');
    }

    await this.prisma.quickViewFilter.delete({
      where: { id: filterId }
    });
  }

  async getFilteredData(
    pageId: string,
    userId: string,
    options: {
      filterId?: string;
      from?: Date;
      to?: Date;
    }
  ) {
    // Verify access
    const page = await this.verifyPageAccess(pageId, userId);
    const deviceIds = page.devices.map(d => d.deviceId);

    // Get base data
    let query: any = {
      where: {
        deviceId: { in: deviceIds },
        ...(options.from && options.to && {
          time: {
            gte: options.from,
            lte: options.to
          }
        })
      },
      include: {
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceCode: true
          }
        }
      },
      orderBy: {
        time: 'desc'
      }
    };

    let telemetryData = await this.prisma.telemetryEvent.findMany(query);

    // Apply filter if specified
    if (options.filterId) {
      const filter = await this.prisma.quickViewFilter.findUnique({
        where: { id: options.filterId },
        include: { conditions: true }
      });

      if (filter) {
        telemetryData = this.applyFilterConditions(telemetryData, filter.conditions);
      }
    }

    // Group by device
    const groupedData = telemetryData.reduce((acc, record) => {
      if (!acc[record.deviceId]) {
        acc[record.deviceId] = [];
      }
      acc[record.deviceId].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    return groupedData;
  }

  // HELPER METHODS

  private async verifyPageOwnership(pageId: string, userId: string) {
    const page = await this.prisma.quickViewPage.findUnique({
      where: { id: pageId },
      include: {
        devices: true
      }
    });

    if (!page) {
      throw new NotFoundException('Quick view page not found');
    }

    if (page.createdBy !== userId) {
      throw new ForbiddenException('You can only modify pages you created');
    }

    return page;
  }

  private async verifyPageAccess(pageId: string, userId: string) {
    const page = await this.prisma.quickViewPage.findUnique({
      where: { id: pageId },
      include: {
        devices: true,
        shares: {
          where: {
            userId,
            isActive: true
          }
        }
      }
    });

    if (!page) {
      throw new NotFoundException('Quick view page not found');
    }

    // Check if user owns the page or has been shared access
    if (page.createdBy !== userId && page.shares.length === 0) {
      throw new ForbiddenException('You do not have access to this page');
    }

    return page;
  }

  private async getLatestDeviceData(deviceIds: string[]): Promise<Record<string, any>> {
    const latestData: Record<string, any> = {};

    // Get latest telemetry for each device
    for (const deviceId of deviceIds) {
      const latest = await this.prisma.telemetryEvent.findFirst({
        where: { deviceId },
        orderBy: { time: 'desc' }
      });

      if (latest) {
        latestData[deviceId] = latest;
      }
    }

    return latestData;
  }

  private async applyFilter(deviceIds: string[], filterId: string): Promise<Record<string, any[]>> {
    const filter = await this.prisma.quickViewFilter.findUnique({
      where: { id: filterId },
      include: { conditions: true }
    });

    if (!filter) {
      throw new NotFoundException('Filter not found');
    }

    const filteredData: Record<string, any[]> = {};

    for (const deviceId of deviceIds) {
      // Get recent telemetry data for the device
      const telemetry = await this.prisma.telemetryEvent.findMany({
        where: { deviceId },
        orderBy: { time: 'desc' },
        take: 100 // Last 100 records for filtering
      });

      // Apply filter conditions
      const filtered = this.applyFilterConditions(telemetry, filter.conditions);
      filteredData[deviceId] = filtered;
    }

    return filteredData;
  }

  private applyFilterConditions(data: any[], conditions: any[]): any[] {
    return data.filter(record => {
      let result = true;
      let currentLogic = 'AND';

      for (const condition of conditions) {
        const fieldValue = this.getNestedField(record, condition.fieldName);
        const conditionResult = this.evaluateCondition(fieldValue, condition.operator, condition.value);

        if (currentLogic === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }

        currentLogic = condition.logicalOp || 'AND';
      }

      return result;
    });
  }

  private getNestedField(obj: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((current, field) => current?.[field], obj);
  }

  private evaluateCondition(fieldValue: any, operator: string, targetValue: string): boolean {
    const parsedTarget = this.parseValue(targetValue);

    switch (operator) {
      case 'eq':
        return fieldValue === parsedTarget;
      case 'ne':
        return fieldValue !== parsedTarget;
      case 'gt':
        return Number(fieldValue) > Number(parsedTarget);
      case 'gte':
        return Number(fieldValue) >= Number(parsedTarget);
      case 'lt':
        return Number(fieldValue) < Number(parsedTarget);
      case 'lte':
        return Number(fieldValue) <= Number(parsedTarget);
      case 'in':
        const inValues = JSON.parse(targetValue);
        return Array.isArray(inValues) && inValues.includes(fieldValue);
      case 'between':
        const [min, max] = JSON.parse(targetValue);
        return Number(fieldValue) >= Number(min) && Number(fieldValue) <= Number(max);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(parsedTarget).toLowerCase());
      default:
        return false;
    }
  }

  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private transformCalculationToDto(calculation: any): QuickViewCalculationDto {
    return {
      id: calculation.id,
      name: calculation.name,
      description: calculation.description,
      formula: calculation.formula,
      displayOrder: calculation.displayOrder,
      isActive: calculation.isActive,
      resultUnit: calculation.resultUnit,
      displayFormat: calculation.displayFormat,
      decimalPlaces: calculation.decimalPlaces,
      createdAt: calculation.createdAt,
      updatedAt: calculation.updatedAt,
      variables: calculation.variables.map((v: any) => ({
        id: v.id,
        variableName: v.variableName,
        fieldName: v.fieldName,
        aggregation: v.aggregation,
        timeWindow: v.timeWindow,
        device: {
          id: v.device.id,
          deviceName: v.device.deviceName,
          deviceCode: v.device.deviceCode
        }
      }))
    };
  }

  private transformFilterToDto(filter: any): QuickViewFilterDto {
    return {
      id: filter.id,
      name: filter.name,
      description: filter.description,
      isActive: filter.isActive,
      isDefault: filter.isDefault,
      createdAt: filter.createdAt,
      updatedAt: filter.updatedAt,
      conditions: filter.conditions.map((c: any) => ({
        id: c.id,
        fieldName: c.fieldName,
        operator: c.operator,
        value: c.value,
        logicalOp: c.logicalOp,
        device: c.device ? {
          id: c.device.id,
          deviceName: c.device.deviceName,
          deviceCode: c.device.deviceCode
        } : undefined
      }))
    };
  }
}