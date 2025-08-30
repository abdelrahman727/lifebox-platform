import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateCommandTemplateDto,
  UpdateCommandTemplateDto,
  CommandTemplateQueryDto,
  ExecuteCommandDto,
  ValidateCommandTemplateDto,
  CommandCategory,
  CommandVariable,
} from '../../common/dto/command-template.dto';

@Injectable()
export class CommandTemplateService {
  private readonly logger = new Logger(CommandTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize default command templates
   */
  async initializeDefaultTemplates(): Promise<void> {
    try {
      const defaultTemplates = this.getDefaultCommandTemplates();
      
      for (const template of defaultTemplates) {
        const existing = await this.prisma.commandTemplate.findUnique({
          where: { name: template.name },
        });

        if (!existing) {
          await this.prisma.commandTemplate.create({
            data: {
              ...template,
              variables: template.variables as any,
              isDefault: true,
              isActive: true,
            },
          });
          this.logger.log(`Created default template: ${template.name}`);
        } else if (!existing.isDefault) {
          // Update existing template to mark as default
          await this.prisma.commandTemplate.update({
            where: { name: template.name },
            data: { isDefault: true },
          });
        }
      }

      this.logger.log('Default command templates initialized');
    } catch (error) {
      this.logger.error('Failed to initialize default templates:', error.message);
      throw error;
    }
  }

  /**
   * Create a new command template
   */
  async create(createDto: CreateCommandTemplateDto, userId?: string): Promise<any> {
    try {
      // Check if template name already exists
      const existing = await this.prisma.commandTemplate.findUnique({
        where: { name: createDto.name },
      });

      if (existing) {
        throw new ConflictException(`Template with name '${createDto.name}' already exists`);
      }

      // Validate template syntax
      this.validateCommandTemplate(createDto.commandTemplate, createDto.variables);

      const template = await this.prisma.commandTemplate.create({
        data: {
          ...createDto,
          createdBy: userId,
          variables: createDto.variables as any,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Created command template: ${template.name}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to create command template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all command templates with filtering
   */
  async findAll(query: CommandTemplateQueryDto): Promise<{
    data: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const { category, isActive, isDefault, search, page = 1, limit = 10 } = query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (category) where.category = category;
      if (isActive !== undefined) where.isActive = isActive;
      if (isDefault !== undefined) where.isDefault = isDefault;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [templates, total] = await Promise.all([
        this.prisma.commandTemplate.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: [
            { isDefault: 'desc' },
            { category: 'asc' },
            { displayName: 'asc' },
          ],
        }),
        this.prisma.commandTemplate.count({ where }),
      ]);

      return {
        data: templates,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get command templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get command template by ID
   */
  async findOne(id: string): Promise<any> {
    try {
      const template = await this.prisma.commandTemplate.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      if (!template) {
        throw new NotFoundException(`Command template with ID ${id} not found`);
      }

      return template;
    } catch (error) {
      this.logger.error(`Failed to get command template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update command template
   */
  async update(id: string, updateDto: UpdateCommandTemplateDto, userId?: string): Promise<any> {
    try {
      const existing = await this.findOne(id);

      // Prevent updating default templates unless user is admin
      if (existing.isDefault && updateDto.isDefault === false) {
        throw new BadRequestException('Cannot disable default system templates');
      }

      // Check name uniqueness if name is being changed
      if (updateDto.name && updateDto.name !== existing.name) {
        const nameExists = await this.prisma.commandTemplate.findUnique({
          where: { name: updateDto.name },
        });
        if (nameExists) {
          throw new ConflictException(`Template with name '${updateDto.name}' already exists`);
        }
      }

      // Validate template if being updated
      if (updateDto.commandTemplate || updateDto.variables) {
        const template = updateDto.commandTemplate || existing.commandTemplate;
        const variables = updateDto.variables || existing.variables;
        this.validateCommandTemplate(template, variables as any);
      }

      const updated = await this.prisma.commandTemplate.update({
        where: { id },
        data: {
          ...updateDto,
          variables: updateDto.variables as any,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Updated command template: ${updated.name}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update command template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete command template
   */
  async remove(id: string): Promise<{ message: string }> {
    try {
      const existing = await this.findOne(id);

      // Prevent deleting default templates
      if (existing.isDefault) {
        throw new BadRequestException('Cannot delete default system templates');
      }

      await this.prisma.commandTemplate.delete({
        where: { id },
      });

      this.logger.log(`Deleted command template: ${existing.name}`);
      return { message: 'Command template deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete command template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(): Promise<Record<string, any[]>> {
    try {
      const templates = await this.prisma.commandTemplate.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { displayName: 'asc' },
      });

      const grouped = templates.reduce((acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      }, {} as Record<string, any[]>);

      return grouped;
    } catch (error) {
      this.logger.error(`Failed to get templates by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate command template
   */
  validateTemplate(validateDto: ValidateCommandTemplateDto): {
    isValid: boolean;
    errors: string[];
    renderedCommand?: string;
  } {
    try {
      const errors = this.validateCommandTemplate(
        validateDto.commandTemplate,
        validateDto.variables,
        validateDto.sampleValues
      );

      if (errors.length > 0) {
        return { isValid: false, errors };
      }

      // Render template with sample values
      const renderedCommand = this.renderCommandTemplate(
        validateDto.commandTemplate,
        validateDto.sampleValues
      );

      return {
        isValid: true,
        errors: [],
        renderedCommand,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Execute command template
   */
  async executeCommand(executeDto: ExecuteCommandDto, userId: string): Promise<any> {
    try {
      // Get template
      const template = await this.findOne(executeDto.templateId);

      // Validate variables
      const errors = this.validateVariableValues(template.variables as any, executeDto.variables);
      if (errors.length > 0) {
        throw new BadRequestException(`Variable validation failed: ${errors.join(', ')}`);
      }

      // Render command
      const renderedCommand = this.renderCommandTemplate(template.commandTemplate, executeDto.variables);

      // Create control command
      const command = await this.prisma.controlCommand.create({
        data: {
          deviceId: executeDto.deviceId,
          commandType: template.name,
          payload: {
            templateId: template.id,
            templateName: template.name,
            variables: executeDto.variables,
            renderedCommand,
            priority: executeDto.priority || 'normal',
            timeoutSeconds: executeDto.timeoutSeconds || 30,
          },
          status: 'pending',
          requestedBy: userId,
        },
        include: {
          device: {
            select: {
              id: true,
              deviceName: true,
              deviceCode: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Executed command template ${template.name} for device ${executeDto.deviceId}`);

      return {
        commandId: command.id,
        templateName: template.name,
        renderedCommand,
        status: command.status,
        createdAt: command.requestedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to execute command template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get execution history for a template
   */
  async getExecutionHistory(templateId: string, limit = 50): Promise<any[]> {
    try {
      const template = await this.findOne(templateId);

      const commands = await this.prisma.controlCommand.findMany({
        where: {
          commandType: template.name,
        },
        take: limit,
        include: {
          device: {
            select: {
              id: true,
              deviceName: true,
              deviceCode: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
      });

      return commands;
    } catch (error) {
      this.logger.error(`Failed to get execution history: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods

  private validateCommandTemplate(
    template: string,
    variables: Record<string, CommandVariable>,
    sampleValues?: Record<string, any>
  ): string[] {
    const errors: string[] = [];

    // Extract variable placeholders from template
    const placeholders = template.match(/\{\{\&(\w+)\}\}/g) || [];
    const variableNames = placeholders.map(p => p.replace(/\{\{\&(\w+)\}\}/, '$1'));

    // Check if all variables in template are defined
    for (const varName of variableNames) {
      if (!variables[varName]) {
        errors.push(`Variable '${varName}' used in template but not defined in variables`);
      }
    }

    // Check if all defined variables are used in template
    for (const varName of Object.keys(variables)) {
      if (!variableNames.includes(varName)) {
        errors.push(`Variable '${varName}' defined but not used in template`);
      }
    }

    // Validate sample values if provided
    if (sampleValues) {
      const valueErrors = this.validateVariableValues(variables, sampleValues);
      errors.push(...valueErrors);
    }

    return errors;
  }

  private validateVariableValues(
    variables: Record<string, CommandVariable>,
    values: Record<string, any>
  ): string[] {
    const errors: string[] = [];

    for (const [name, variable] of Object.entries(variables)) {
      const value = values[name];

      // Check required variables
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required variable '${name}' is missing`);
        continue;
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) continue;

      // Type validation
      switch (variable.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Variable '${name}' must be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`Variable '${name}' must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Variable '${name}' must be a boolean`);
          }
          break;
        case 'enum':
          if (variable.validation?.options && !variable.validation.options.includes(value)) {
            errors.push(`Variable '${name}' must be one of: ${variable.validation.options.join(', ')}`);
          }
          break;
      }

      // Additional validation rules
      if (variable.validation) {
        const validation = variable.validation;

        if (validation.min !== undefined && value < validation.min) {
          errors.push(`Variable '${name}' must be at least ${validation.min}`);
        }

        if (validation.max !== undefined && value > validation.max) {
          errors.push(`Variable '${name}' must be at most ${validation.max}`);
        }

        if (validation.pattern && typeof value === 'string') {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            errors.push(`Variable '${name}' does not match required pattern`);
          }
        }
      }
    }

    return errors;
  }

  private renderCommandTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    for (const [name, value] of Object.entries(variables)) {
      const placeholder = `{{&${name}}}`;
      rendered = rendered.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    }

    return rendered;
  }

  private getDefaultCommandTemplates(): CreateCommandTemplateDto[] {
    // UPDATED: Complete 28-command list based on user requirements
    return [
      // 1. TDS_RANGE - Range command
      {
        name: 'TDS_RANGE',
        displayName: 'TDS Sensor Range',
        description: 'TDS Sensor Range - If below or higher of this range it shall issue an alarm',
        commandTemplate: '{TDS_SensorL: {{&lower}},TDS_SensorH: {{&upper}}}',
        category: CommandCategory.MONITORING,
        variables: {
          lower: {
            name: 'lower',
            type: 'number',
            description: 'Lower TDS threshold (PPM)',
            required: true,
            validation: { min: 0, max: 10000 },
          },
          upper: {
            name: 'upper',
            type: 'number',
            description: 'Upper TDS threshold (PPM)',
            required: true,
            validation: { min: 0, max: 10000 },
          },
        },
        requiredRole: 'operator',
      },

      // 2. Level Sensor - Range command
      {
        name: 'Level_Sensor',
        displayName: 'Level Sensor',
        description: 'Water level sensor range configuration (meters)',
        commandTemplate: '{LowLimit2: {{&LowLimit}},HighLimit2: {{&HighLimit}}}',
        category: CommandCategory.MONITORING,
        variables: {
          LowLimit: {
            name: 'LowLimit',
            type: 'number',
            description: 'Low limit in meters (default: 0)',
            required: true,
            validation: { min: 0, max: 100 },
            defaultValue: 0,
          },
          HighLimit: {
            name: 'HighLimit',
            type: 'number',
            description: 'High limit in meters (default: 5)',
            required: true,
            validation: { min: 0, max: 100 },
            defaultValue: 5,
          },
        },
        requiredRole: 'operator',
      },

      // 3. Pressure Sensor - Range command
      {
        name: 'Pressure_Sensor',
        displayName: 'Pressure Sensor',
        description: 'Pressure sensor range configuration',
        commandTemplate: '{LowLimit1: {{&LowLimit}},HighLimit1: {{&HighLimit}}}',
        category: CommandCategory.MONITORING,
        variables: {
          LowLimit: {
            name: 'LowLimit',
            type: 'number',
            description: 'Low pressure limit (bar)',
            required: true,
            validation: { min: 0, max: 50 },
          },
          HighLimit: {
            name: 'HighLimit',
            type: 'number',
            description: 'High pressure limit (bar)',
            required: true,
            validation: { min: 0, max: 50 },
          },
        },
        requiredRole: 'operator',
      },

      // 4. Change phone number - Multiple numbers for SMS receivers
      {
        name: 'Change_phone_number',
        displayName: 'Change Phone Number',
        description: 'SMS numbers receivers - Multiple numbers for SMS receivers',
        commandTemplate: '{num1: {{&SMS_Sender_1}},num2: {{&SMS_Sender_2}},num3: {{&SMS_Receiver_1}},num4: {{&SMS_Receiver_2}}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          SMS_Sender_1: {
            name: 'SMS_Sender_1',
            type: 'string',
            description: 'SMS Sender 1 phone number',
            required: true,
            validation: { pattern: '^\\+?[1-9]\\d{1,14}$' },
          },
          SMS_Sender_2: {
            name: 'SMS_Sender_2',
            type: 'string',
            description: 'SMS Sender 2 phone number',
            required: false,
            validation: { pattern: '^\\+?[1-9]\\d{1,14}$' },
          },
          SMS_Receiver_1: {
            name: 'SMS_Receiver_1',
            type: 'string',
            description: 'SMS Receiver 1 phone number',
            required: true,
            validation: { pattern: '^\\+?[1-9]\\d{1,14}$' },
          },
          SMS_Receiver_2: {
            name: 'SMS_Receiver_2',
            type: 'string',
            description: 'SMS Receiver 2 phone number',
            required: false,
            validation: { pattern: '^\\+?[1-9]\\d{1,14}$' },
          },
        },
        requiredRole: 'admin',
      },

      // 5. Control Pump Forward1
      {
        name: 'Control_Pump_Forward1',
        displayName: 'Control Pump Forward1',
        description: 'Pump rotation direction - In this case "Forward Run"',
        commandTemplate: 'direction: {{&command}}',
        category: CommandCategory.CONTROL,
        variables: {
          command: {
            name: 'command',
            type: 'enum',
            description: 'Pump direction command',
            required: true,
            validation: { options: ['forward', 'backward', 'stop'] },
            defaultValue: 'forward',
          },
        },
        requiredRole: 'operator',
      },

      // 6. Select Start Command Mode
      {
        name: 'Select_Start_Command_Mode',
        displayName: 'Select Start Command Mode',
        description: 'Start button control mode selection',
        commandTemplate: 'SelectStartCommandMode: {{&controlMode}}',
        category: CommandCategory.CONTROL,
        variables: {
          controlMode: {
            name: 'controlMode',
            type: 'enum',
            description: 'Control mode selection',
            required: true,
            validation: { options: ['manual', 'automatic', 'remote', 'scheduled'] },
          },
        },
        requiredRole: 'operator',
      },

      // 7. Change Inverter Temperature SetPoint
      {
        name: 'Change_Inverter_Temperature_SetPoint',
        displayName: 'Change Inverter Temperature SetPoint',
        description: 'Change Inverter Temperature SetPoint (70 or 80)',
        commandTemplate: 'InvTempSetPoint: {{&SetPoint}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          SetPoint: {
            name: 'SetPoint',
            type: 'enum',
            description: 'Temperature setpoint (70 or 80)',
            required: true,
            validation: { options: ['70', '80'] },
          },
        },
        requiredRole: 'operator',
      },

      // 8. Pre-alarm Temperature Setpoint
      {
        name: 'Pre_alarm_Temperature_Setpoint',
        displayName: 'Pre-alarm Temperature Setpoint',
        description: 'Pre alarm for the temperature so that if the inverter reaches threshold it issues an alarm',
        commandTemplate: 'TempTH:{{&TempPreAlarm}}',
        category: CommandCategory.MONITORING,
        variables: {
          TempPreAlarm: {
            name: 'TempPreAlarm',
            type: 'enum',
            description: 'Pre-alarm temperature threshold (50 or 60)',
            required: true,
            validation: { options: ['50', '60'] },
          },
        },
        requiredRole: 'operator',
      },

      // 9. pre temp alarm test - Testing command
      {
        name: 'pre_temp_alarm_test',
        displayName: 'Pre Temp Alarm Test',
        description: 'Testing command for pre temperature alarm',
        commandTemplate: '50',
        category: CommandCategory.DIAGNOSTIC,
        variables: {},
        requiredRole: 'operator',
      },

      // 10. Inverter Cancel Pass
      {
        name: 'Inverter_Cancel_Pass',
        displayName: 'Inverter Cancel Pass',
        description: 'Cancel inverter password operation',
        commandTemplate: 'InvCancelPass: {{&p}}',
        category: CommandCategory.SECURITY,
        variables: {
          p: {
            name: 'p',
            type: 'string',
            description: 'Password confirmation',
            required: true,
          },
        },
        requiredRole: 'admin',
      },

      // 11. Inverter Change Password
      {
        name: 'Inverter_Change_Password',
        displayName: 'Inverter Change Password',
        description: 'Change inverter password',
        commandTemplate: 'InvPassWord: {{&Pass}}',
        category: CommandCategory.SECURITY,
        variables: {
          Pass: {
            name: 'Pass',
            type: 'string',
            description: 'New password',
            required: true,
            validation: { min: 4, max: 50 },
          },
        },
        requiredRole: 'admin',
      },

      // 12. control_master_on
      {
        name: 'control_master_on',
        displayName: 'Control Master ON',
        description: 'Master Command mode where the inverter is LOCKED when activated',
        commandTemplate: 'master: {{&master}}',
        category: CommandCategory.CONTROL,
        variables: {
          master: {
            name: 'master',
            type: 'enum',
            description: 'Master control state (True or False)',
            required: true,
            validation: { options: ['true', 'false'] },
            defaultValue: 'true',
          },
        },
        requiredRole: 'admin',
      },

      // 13. EdgeBox_Command
      {
        name: 'EdgeBox_Command',
        displayName: 'EdgeBox Command',
        description: 'EdgeBox commands for the edgebox itself',
        commandTemplate: '{{&EdgeBox_Command}}',
        category: CommandCategory.SYSTEM,
        variables: {
          EdgeBox_Command: {
            name: 'EdgeBox_Command',
            type: 'string',
            description: 'EdgeBox command string',
            required: true,
          },
        },
        requiredRole: 'admin',
      },

      // 14. Inverter_Reg_Addr
      {
        name: 'Inverter_Reg_Addr',
        displayName: 'Inverter Register Addresses',
        description: 'Inverter registers - each parameter has a register that shall be inputted here',
        commandTemplate: '{frequency_addr: {{&frequency_addr}},pump_voltage_addr: {{&pump_voltage_addr}},pump_current_addr: {{&pump_current_addr}},pump_power_addr: {{&pump_power_addr}},motor_speed_addr: {{&motor_speed_addr}},bus_volt_addr: {{&bus_volt_addr}}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          frequency_addr: { name: 'frequency_addr', type: 'number', description: 'Frequency register address', required: true },
          pump_voltage_addr: { name: 'pump_voltage_addr', type: 'number', description: 'Pump voltage register address', required: true },
          pump_current_addr: { name: 'pump_current_addr', type: 'number', description: 'Pump current register address', required: true },
          pump_power_addr: { name: 'pump_power_addr', type: 'number', description: 'Pump power register address', required: true },
          motor_speed_addr: { name: 'motor_speed_addr', type: 'number', description: 'Motor speed register address', required: true },
          bus_volt_addr: { name: 'bus_volt_addr', type: 'number', description: 'Bus voltage register address', required: true },
        },
        requiredRole: 'admin',
      },

      // 15. Inverter_Reg_Addr2
      {
        name: 'Inverter_Reg_Addr2',
        displayName: 'Inverter Register Addresses 2',
        description: 'Additional inverter registers - each parameter has a register that shall be inputted here',
        commandTemplate: '{inverter_temp_addr: {{&inverter_temp_addr}},pump_energy_consump:{{&pump_energy_consump_addr}},control_pump_addr:{{&control_pump_addr}}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          inverter_temp_addr: { name: 'inverter_temp_addr', type: 'number', description: 'Inverter temperature register address', required: true },
          pump_energy_consump_addr: { name: 'pump_energy_consump_addr', type: 'number', description: 'Pump energy consumption register address', required: true },
          control_pump_addr: { name: 'control_pump_addr', type: 'number', description: 'Control pump register address', required: true },
        },
        requiredRole: 'admin',
      },

      // 16. Inverter_Remote_direction
      {
        name: 'Inverter_Remote_direction',
        displayName: 'Inverter Remote Direction',
        description: 'Pump rotation direction either forward or reverse',
        commandTemplate: 'direction: {{&command}}',
        category: CommandCategory.CONTROL,
        variables: {
          command: {
            name: 'command',
            type: 'enum',
            description: 'Pump rotation direction',
            required: true,
            validation: { options: ['forward', 'reverse'] },
          },
        },
        requiredRole: 'operator',
      },

      // 17. Inverter_Remote_AlarmReset
      {
        name: 'Inverter_Remote_AlarmReset',
        displayName: 'Inverter Remote Alarm Reset',
        description: 'Alarm Reset command',
        commandTemplate: 'AlarmReset: {{&AlarmReset}}',
        category: CommandCategory.MAINTENANCE,
        variables: {
          AlarmReset: {
            name: 'AlarmReset',
            type: 'string',
            description: 'Alarm reset string command',
            required: true,
          },
        },
        requiredRole: 'operator',
      },

      // 18. Control Pump Stop
      {
        name: 'Control_Pump_Stop',
        displayName: 'Control Pump Stop',
        description: 'Control function for Stop button',
        commandTemplate: 'control: {{&command}}',
        category: CommandCategory.CONTROL,
        variables: {
          command: {
            name: 'command',
            type: 'string',
            description: 'Stop command string',
            required: true,
            defaultValue: 'stop',
          },
        },
        requiredRole: 'operator',
      },

      // 19. Control Pump Forward
      {
        name: 'Control_Pump_Forward',
        displayName: 'Control Pump Forward',
        description: 'Control function for pump to run forward (The start button run the pump forward)',
        commandTemplate: 'direction: {{&command}}',
        category: CommandCategory.CONTROL,
        variables: {
          command: {
            name: 'command',
            type: 'enum',
            description: 'Pump rotation direction either forward or reverse',
            required: true,
            validation: { options: ['forward', 'reverse'] },
            defaultValue: 'forward',
          },
        },
        requiredRole: 'operator',
      },

      // 20. Control Pump Backward
      {
        name: 'Control_Pump_Backward',
        displayName: 'Control Pump Backward',
        description: 'Control function for pump to run backward (The start button run the pump reverse)',
        commandTemplate: 'direction: {{&command}}',
        category: CommandCategory.CONTROL,
        variables: {
          command: {
            name: 'command',
            type: 'enum',
            description: 'Pump rotation direction either forward or reverse',
            required: true,
            validation: { options: ['forward', 'reverse'] },
            defaultValue: 'reverse',
          },
        },
        requiredRole: 'operator',
      },

      // 21. control_master_off
      {
        name: 'control_master_off',
        displayName: 'Control Master OFF',
        description: 'Master Command mode where the inverter is UNLOCKED when activated',
        commandTemplate: 'master: {{&master}}',
        category: CommandCategory.CONTROL,
        variables: {
          master: {
            name: 'master',
            type: 'enum',
            description: 'Master control state (True or False)',
            required: true,
            validation: { options: ['true', 'false'] },
            defaultValue: 'false',
          },
        },
        requiredRole: 'admin',
      },

      // 22. client_data_1
      {
        name: 'client_data_1',
        displayName: 'Client Data 1',
        description: 'Client data configuration part 1',
        commandTemplate: 'device_code:{{&device_code}}, subscription_type:{{&subscription_type}}, client_tier:{{&client_tier}}, location:{{&location}}, installation_date:{{&installation_date}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          device_code: { name: 'device_code', type: 'string', description: 'Device code', required: true },
          subscription_type: { name: 'subscription_type', type: 'string', description: 'Subscription type', required: true },
          client_tier: { name: 'client_tier', type: 'string', description: 'Client tier', required: true },
          location: { name: 'location', type: 'string', description: 'Device location', required: true },
          installation_date: { name: 'installation_date', type: 'string', description: 'Installation date', required: true },
        },
        requiredRole: 'admin',
      },

      // 23. client_data_2
      {
        name: 'client_data_2',
        displayName: 'Client Data 2',
        description: 'Client data configuration part 2',
        commandTemplate: 'commissioning_date:{{&commissioning_date}}, system_components:{{&system_components}}, device_id:{{&device_id}}, lifebox_code:{{&lifebox_code}}, contract_ref_number:{{&contract_ref_number}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          commissioning_date: { name: 'commissioning_date', type: 'string', description: 'Commissioning date', required: true },
          system_components: { name: 'system_components', type: 'string', description: 'System components', required: true },
          device_id: { name: 'device_id', type: 'string', description: 'Device ID', required: true },
          lifebox_code: { name: 'lifebox_code', type: 'string', description: 'LifeBox code', required: true },
          contract_ref_number: { name: 'contract_ref_number', type: 'string', description: 'Contract reference number', required: true },
        },
        requiredRole: 'admin',
      },

      // 24. Grid Price Rate
      {
        name: 'Grid_Price_Rate',
        displayName: 'Grid Price Rate',
        description: 'The price per kWh when replacing grid',
        commandTemplate: 'Alternative : Grid,{{&GridRate}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          GridRate: {
            name: 'GridRate',
            type: 'number',
            description: 'Grid price rate in EGP',
            required: true,
            validation: { min: 0 },
          },
        },
        requiredRole: 'admin',
      },

      // 25. Diesel Price Rate
      {
        name: 'Diesel_Price_Rate',
        displayName: 'Diesel Price Rate',
        description: 'The price per kWh when replacing diesel',
        commandTemplate: 'Alternative : Diesel,{{&DieselRate}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          DieselRate: {
            name: 'DieselRate',
            type: 'number',
            description: 'Diesel price rate in EGP',
            required: true,
            validation: { min: 0 },
          },
        },
        requiredRole: 'admin',
      },

      // 26. ChangeApn
      {
        name: 'ChangeApn',
        displayName: 'Change APN',
        description: 'Change cellular network APN settings',
        commandTemplate: 'APN: {{&apn}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          apn: {
            name: 'apn',
            type: 'string',
            description: 'APN string for cellular connection',
            required: true,
          },
        },
        requiredRole: 'admin',
      },

      // 27. Change Cloud Credential
      {
        name: 'Change_Cloud_Credential',
        displayName: 'Change Cloud Credential',
        description: 'Update cloud connection credentials',
        commandTemplate: '{ClientId: {{&ClientID}},UserName: {{&UserName}},Password: {{&Password}}}',
        category: CommandCategory.CONFIGURATION,
        variables: {
          ClientID: {
            name: 'ClientID',
            type: 'string',
            description: 'Client ID for cloud connection',
            required: true,
          },
          UserName: {
            name: 'UserName',
            type: 'string',
            description: 'Username for cloud connection',
            required: true,
          },
          Password: {
            name: 'Password',
            type: 'string',
            description: 'Password for cloud connection',
            required: true,
            validation: { min: 6, max: 100 },
          },
        },
        requiredRole: 'admin',
      },

      // 28. Reset Box
      {
        name: 'Reset_Box',
        displayName: 'Reset Box',
        description: 'Reset the device/box to default state',
        commandTemplate: 'RESET: {{&ResetType}}',
        category: CommandCategory.MAINTENANCE,
        variables: {
          ResetType: {
            name: 'ResetType',
            type: 'string',
            description: 'Type of reset to perform',
            required: true,
          },
        },
        requiredRole: 'admin',
      },
    ];
  }
}