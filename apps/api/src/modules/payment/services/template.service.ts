import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMessageTemplateDto, UpdateMessageTemplateDto } from '../../../common/dto/admin.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process template with variables
   * Supports variables like ${client.credit}, ${client.name}, ${user.fullName}, etc.
   */
  processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    // Replace all ${variable.property} patterns
    const regex = /\$\{([^}]+)\}/g;
    
    processed = processed.replace(regex, (match, variablePath) => {
      try {
        // Split the path (e.g., "client.credit" becomes ["client", "credit"])
        const path = variablePath.split('.');
        let value = variables;
        
        // Navigate through the object path
        for (const key of path) {
          value = value?.[key];
        }
        
        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        }
        
        if (typeof value === 'number') {
          // Format numbers with 2 decimal places for currency
          return Number(value).toFixed(2);
        }
        
        return String(value);
      } catch (error) {
        this.logger.warn(`Failed to process template variable: ${variablePath}`, error);
        return match; // Return original if processing fails
      }
    });
    
    return processed;
  }

  /**
   * Get template by category and type
   */
  async getTemplate(category: string, type: 'email' | 'sms' | 'push'): Promise<any> {
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        category,
        type,
        isActive: true,
      },
    });

    if (!template) {
      // Return default templates if none found
      return this.getDefaultTemplate(category, type);
    }

    return template;
  }

  /**
   * Get all templates with filtering
   */
  async getTemplates(options: {
    type?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { type, category, isActive, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const [templates, total] = await Promise.all([
      this.prisma.messageTemplate.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          updater: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.messageTemplate.count({ where }),
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
  }

  /**
   * Create new template
   */
  async createTemplate(dto: CreateMessageTemplateDto, userId: string) {
    return this.prisma.messageTemplate.create({
      data: {
        ...dto,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, dto: UpdateMessageTemplateDto, userId: string) {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.prisma.messageTemplate.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string) {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.prisma.messageTemplate.delete({
      where: { id },
    });
  }

  /**
   * Process template with client and user data
   */
  async processTemplateForClient(
    category: string,
    type: 'email' | 'sms' | 'push',
    clientId: string,
    userId?: string,
    additionalVariables?: Record<string, any>
  ) {
    // Get template
    const template = await this.getTemplate(category, type);
    
    // Get client data
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        users: userId ? { where: { id: userId } } : true,
        devices: {
          where: { isActive: true },
          select: {
            id: true,
            deviceName: true,
            deviceCode: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Prepare variables for template processing
    const variables = {
      client: {
        id: client.id,
        name: client.name,
        organizationName: client.organizationName,
        credit: Number(client.credit),
        fawryPaymentId: client.fawryPaymentId,
        billingType: client.billingType,
        deviceCount: client.devices.length,
      },
      user: userId && client.users.length > 0 ? {
        id: client.users[0].id,
        fullName: client.users[0].fullName,
        email: client.users[0].email,
        phone: client.users[0].phone,
      } : null,
      system: {
        companyName: 'LifeBox',
        supportEmail: 'support@lifebox.com',
        supportPhone: '+20-xxx-xxx-xxxx',
      },
      ...additionalVariables,
    };

    // Process template content
    const processedContent = this.processTemplate(template.content, variables);
    const processedSubject = template.subject 
      ? this.processTemplate(template.subject, variables) 
      : null;

    return {
      ...template,
      content: processedContent,
      subject: processedSubject,
      variables,
    };
  }

  /**
   * Default templates if none are configured
   */
  private getDefaultTemplate(category: string, type: 'email' | 'sms' | 'push') {
    const defaults = {
      credit_warning: {
        email: {
          subject: 'Low Credit Warning - LifeBox',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Dear \${user.fullName},</h2>
              <p>Your credit balance is running low.</p>
              <p><strong>Current Balance:</strong> \${client.credit} EGP</p>
              <p>Please top up soon to avoid service interruption.</p>
              <p>Use Fawry payment with code: <strong>\${client.fawryPaymentId}</strong></p>
            </div>
          `,
        },
        sms: {
          content: 'LifeBox: Low credit warning! Balance: ${client.credit} EGP. Top up via Fawry (${client.fawryPaymentId}) to avoid service interruption.',
        },
      },
      credit_critical: {
        email: {
          subject: '🚨 URGENT: Devices Shut Down - No Credit',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
                <h1>⚠️ Service Suspended</h1>
              </div>
              <div style="padding: 20px; background-color: #f8f9fa;">
                <h2>Dear \${user.fullName},</h2>
                <p style="color: #dc3545; font-size: 18px;"><strong>Your devices have been automatically shut down due to insufficient credit.</strong></p>
                <p><strong>Current Balance:</strong> \${client.credit} EGP</p>
                <p>Top up your account via Fawry using code: <strong>\${client.fawryPaymentId}</strong></p>
              </div>
            </div>
          `,
        },
        sms: {
          content: 'URGENT: Your LifeBox devices have been shut down due to insufficient credit (${client.credit} EGP). Top up via Fawry using code ${client.fawryPaymentId} to restore service.',
        },
      },
      device_reactivated: {
        email: {
          subject: '✅ Service Restored - LifeBox',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
                <h1>✅ Service Restored!</h1>
              </div>
              <div style="padding: 20px; background-color: #f8f9fa;">
                <h2>Dear \${user.fullName},</h2>
                <p>Good news! Your payment has been received and your devices have been reactivated.</p>
                <p><strong>New Balance:</strong> \${client.credit} EGP</p>
                <p><strong>Status:</strong> All devices are now operational</p>
              </div>
            </div>
          `,
        },
        sms: {
          content: 'LifeBox: Service restored! Your devices have been reactivated. Balance: ${client.credit} EGP',
        },
      },
    };

    return defaults[category]?.[type] || {
      content: `Default ${type} message for ${category}. Current balance: \${client.credit} EGP`,
      subject: type === 'email' ? `LifeBox Notification - ${category}` : undefined,
    };
  }

  /**
   * Get available template variables for UI
   */
  getAvailableVariables() {
    return {
      client: {
        id: 'Client ID',
        name: 'Client name',
        organizationName: 'Organization name',
        credit: 'Current credit balance',
        fawryPaymentId: 'Fawry payment ID',
        billingType: 'Billing type (prepaid/postpaid)',
        deviceCount: 'Number of devices',
      },
      user: {
        id: 'User ID',
        fullName: 'User full name',
        email: 'User email',
        phone: 'User phone number',
      },
      system: {
        companyName: 'Company name (LifeBox)',
        supportEmail: 'Support email',
        supportPhone: 'Support phone',
      },
    };
  }
}