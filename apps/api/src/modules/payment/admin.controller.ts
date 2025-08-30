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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SystemSettingsService } from './services/system-settings.service';
import { TemplateService } from './services/template.service';
import { EmailService } from '../notifications/email.service';
import { SmsService } from '../notifications/sms.service';
import {
  CreateSystemSettingDto,
  UpdateSystemSettingDto,
  CreditSettingsDto,
  BulkUpdateSettingsDto,
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
  TestMessageTemplateDto,
  MessageTemplateQueryDto,
} from '../../common/dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
    private readonly templateService: TemplateService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  // System Settings Endpoints

  @Get('settings')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'System settings retrieved successfully' })
  async getAllSettings() {
    return this.systemSettingsService.getAllSettings();
  }

  @Get('settings/category/:category')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Get settings by category' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettingsByCategory(@Param('category') category: string) {
    return this.systemSettingsService.getSettingsByCategory(category);
  }

  @Get('settings/credit')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Get credit monitoring settings' })
  @ApiResponse({ status: 200, description: 'Credit settings retrieved successfully' })
  async getCreditSettings() {
    return this.systemSettingsService.getCreditSettings();
  }

  @Put('settings/credit')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Update credit monitoring settings' })
  @ApiResponse({ status: 200, description: 'Credit settings updated successfully' })
  async updateCreditSettings(
    @Body() dto: CreditSettingsDto,
    @CurrentUser() user: any,
  ) {
    await this.systemSettingsService.updateCreditSettings(dto, user.id);
    return { message: 'Credit settings updated successfully' };
  }

  @Post('settings')
  @Roles('super_user')
  @ApiOperation({ summary: 'Create new system setting' })
  @ApiResponse({ status: 201, description: 'Setting created successfully' })
  async createSetting(
    @Body() dto: CreateSystemSettingDto,
    @CurrentUser() user: any,
  ) {
    return this.systemSettingsService.createSetting(dto, user.id);
  }

  @Put('settings/:id')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Update system setting' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  async updateSetting(
    @Param('id') id: string,
    @Body() dto: UpdateSystemSettingDto,
    @CurrentUser() user: any,
  ) {
    return this.systemSettingsService.updateSetting(id, dto, user.id);
  }

  @Delete('settings/:id')
  @Roles('super_user')
  @ApiOperation({ summary: 'Delete system setting' })
  @ApiResponse({ status: 200, description: 'Setting deleted successfully' })
  async deleteSetting(@Param('id') id: string) {
    return this.systemSettingsService.deleteSetting(id);
  }

  @Put('settings/bulk')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Bulk update settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async bulkUpdateSettings(
    @Body() dto: BulkUpdateSettingsDto,
    @CurrentUser() user: any,
  ) {
    return this.systemSettingsService.bulkUpdateSettings(dto.settings, user.id);
  }

  @Post('settings/clear-cache')
  @Roles('super_user')
  @ApiOperation({ summary: 'Clear settings cache' })
  @ApiResponse({ status: 200, description: 'Settings cache cleared' })
  async clearSettingsCache() {
    this.systemSettingsService.clearCache();
    return { message: 'Settings cache cleared successfully' };
  }

  // Message Templates Endpoints

  @Get('templates')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Get all message templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(@Query() query: MessageTemplateQueryDto) {
    return this.templateService.getTemplates(query);
  }

  @Get('templates/variables')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Get available template variables' })
  @ApiResponse({ status: 200, description: 'Variables retrieved successfully' })
  async getTemplateVariables() {
    return {
      variables: this.templateService.getAvailableVariables(),
      usage: {
        syntax: 'Use ${variable.property} syntax, e.g., ${client.credit}, ${user.fullName}',
        examples: [
          '${client.credit} - Current client credit balance',
          '${client.name} - Client name',
          '${user.fullName} - User full name',
          '${system.companyName} - Company name',
        ],
      },
    };
  }

  @Post('templates')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Create new message template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(
    @Body() dto: CreateMessageTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.createTemplate(dto, user.id);
  }

  @Put('templates/:id')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Update message template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateMessageTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.updateTemplate(id, dto, user.id);
  }

  @Delete('templates/:id')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Delete message template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async deleteTemplate(@Param('id') id: string) {
    return this.templateService.deleteTemplate(id);
  }

  @Post('templates/:id/test')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Test message template' })
  @ApiResponse({ status: 200, description: 'Template tested successfully' })
  async testTemplate(
    @Param('id') id: string,
    @Body() dto: TestMessageTemplateDto,
  ) {
    // Get template
    const template = await this.templateService.updateTemplate(id, {}, ''); // Just to check if exists
    
    // Process template for the test client
    const processedTemplate = await this.templateService.processTemplateForClient(
      template.category,
      template.type as 'email' | 'sms' | 'push',
      dto.clientId,
    );

    // Send test message
    if (template.type === 'email' && dto.testEmail) {
      await this.emailService.sendEmail({
        to: dto.testEmail,
        subject: `[TEST] ${processedTemplate.subject}`,
        html: processedTemplate.content,
      });
      return { message: `Test email sent to ${dto.testEmail}` };
    }

    if (template.type === 'sms' && dto.testPhone) {
      await this.smsService.sendSms({
        to: dto.testPhone,
        message: `[TEST] ${processedTemplate.content}`,
      });
      return { message: `Test SMS sent to ${dto.testPhone}` };
    }

    // Return processed template for preview
    return {
      message: 'Template processed successfully',
      preview: {
        subject: processedTemplate.subject,
        content: processedTemplate.content,
        variables: processedTemplate.variables,
      },
    };
  }

  @Get('templates/preview/:category/:type')
  @Roles('super_user', 'admin')
  @ApiOperation({ summary: 'Preview template with sample data' })
  @ApiResponse({ status: 200, description: 'Template preview generated' })
  async previewTemplate(
    @Param('category') category: string,
    @Param('type') type: 'email' | 'sms' | 'push',
    @Query('clientId') clientId?: string,
  ) {
    if (!clientId) {
      // Use sample data if no client provided
      const sampleVariables = {
        client: {
          id: 'sample-client-id',
          name: 'Sample Company',
          organizationName: 'Sample Organization',
          credit: 15.50,
          fawryPaymentId: 'SAMPLE123',
          billingType: 'prepaid',
          deviceCount: 3,
        },
        user: {
          id: 'sample-user-id',
          fullName: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+20-123-456-789',
        },
        system: {
          companyName: 'LifeBox',
          supportEmail: 'support@lifebox.com',
          supportPhone: '+20-xxx-xxx-xxxx',
        },
      };

      const template = await this.templateService.getTemplate(category, type);
      const processedContent = this.templateService.processTemplate(template.content, sampleVariables);
      const processedSubject = template.subject 
        ? this.templateService.processTemplate(template.subject, sampleVariables) 
        : null;

      return {
        template: {
          ...template,
          content: processedContent,
          subject: processedSubject,
        },
        variables: sampleVariables,
        note: 'This is a preview with sample data',
      };
    }

    // Use real client data
    return this.templateService.processTemplateForClient(category, type, clientId);
  }
}