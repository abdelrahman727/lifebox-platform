// src/modules/notifications/hybrid-sms-router.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VodafoneSmsService } from './vodafone-sms.service';
import { SmsService } from './sms.service';

export interface SmsRouterOptions {
  to: string;
  message: string;
  from?: string;
  forceProvider?: 'vodafone' | 'twilio' | 'auto';
}

export interface SmsRouterConfig {
  deploymentRegion: 'egypt' | 'international' | 'global';
  fallbackEnabled: boolean;
  domesticProvider: 'vodafone' | 'twilio';
  internationalProvider: 'vodafone' | 'twilio';
  egyptianPrefixes: string[];
  internationalPrefixes: string[];
}

export interface SmsDeliveryResult {
  success: boolean;
  provider: 'vodafone' | 'twilio' | 'failed';
  requestId?: string;
  error?: string;
  routingReason: string;
  phoneRegion: 'egypt' | 'international' | 'unknown';
  deliveryTime: number;
}

@Injectable()
export class HybridSmsRouterService {
  private readonly logger = new Logger(HybridSmsRouterService.name);
  private config: SmsRouterConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly vodafoneSmsService: VodafoneSmsService,
    private readonly twilioSmsService: SmsService,
  ) {
    this.initializeRouterConfig();
  }

  private initializeRouterConfig() {
    this.config = {
      deploymentRegion: this.configService.get<'egypt' | 'international' | 'global'>(
        'SMS_DEPLOYMENT_REGION',
        'egypt'
      ),
      fallbackEnabled: this.configService.get<boolean>('SMS_FALLBACK_ENABLED', true),
      domesticProvider: this.configService.get<'vodafone' | 'twilio'>(
        'SMS_DOMESTIC_PROVIDER',
        'vodafone'
      ),
      internationalProvider: this.configService.get<'vodafone' | 'twilio'>(
        'SMS_INTERNATIONAL_PROVIDER',
        'twilio'
      ),
      // Egyptian mobile prefixes (Vodafone, Orange, Etisalat, WE)
      egyptianPrefixes: [
        '+2010', '+2011', '+2012', '+2015', // Vodafone Egypt
        '+2016', '+2017', '+2018', '+2019', // Orange Egypt (formerly Mobinil)
        '+2014',                           // Etisalat Egypt
        '+2013',                           // WE (formerly TE Data)
      ],
      internationalPrefixes: [
        // Major international prefixes
        '+1',    // USA/Canada
        '+44',   // UK
        '+33',   // France
        '+49',   // Germany
        '+39',   // Italy
        '+34',   // Spain
        '+31',   // Netherlands
        '+32',   // Belgium
        '+41',   // Switzerland
        '+43',   // Austria
        '+45',   // Denmark
        '+46',   // Sweden
        '+47',   // Norway
        '+358',  // Finland
        '+86',   // China
        '+81',   // Japan
        '+82',   // South Korea
        '+91',   // India
        '+55',   // Brazil
        '+52',   // Mexico
        '+61',   // Australia
        '+64',   // New Zealand
        '+27',   // South Africa
        '+234',  // Nigeria
        '+254',  // Kenya
        '+971',  // UAE
        '+966',  // Saudi Arabia
        '+965',  // Kuwait
        '+974',  // Qatar
        '+973',  // Bahrain
        '+968',  // Oman
        '+962',  // Jordan
        '+961',  // Lebanon
      ],
    };

    this.logger.log(`SMS Router initialized: ${this.config.deploymentRegion} deployment`);
    this.logger.log(`Domestic provider: ${this.config.domesticProvider}, International provider: ${this.config.internationalProvider}`);
  }

  /**
   * Intelligently route SMS based on phone number and deployment configuration
   */
  async sendSms(options: SmsRouterOptions): Promise<SmsDeliveryResult> {
    const startTime = Date.now();
    
    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(options.to);
      
      // Detect phone region
      const phoneRegion = this.detectPhoneRegion(normalizedPhone);
      
      // Determine optimal provider
      const selectedProvider = this.selectProvider(phoneRegion, options.forceProvider);
      
      const routingReason = this.getRoutingReason(phoneRegion, selectedProvider, options.forceProvider);
      
      this.logger.debug(`Routing SMS to ${normalizedPhone}`, {
        region: phoneRegion,
        provider: selectedProvider,
        reason: routingReason,
        deployment: this.config.deploymentRegion,
      });

      // Attempt primary provider
      const primaryResult = await this.attemptSmsDelivery(
        selectedProvider,
        { ...options, to: normalizedPhone }
      );

      if (primaryResult.success) {
        const deliveryTime = Date.now() - startTime;
        
        this.logger.log(`SMS delivered successfully via ${selectedProvider}`, {
          to: this.maskPhoneNumber(normalizedPhone),
          region: phoneRegion,
          deliveryTime: `${deliveryTime}ms`,
        });

        return {
          success: true,
          provider: selectedProvider,
          requestId: primaryResult.requestId,
          routingReason,
          phoneRegion,
          deliveryTime,
        };
      }

      // Attempt fallback if enabled and primary failed
      if (this.config.fallbackEnabled && !options.forceProvider) {
        const fallbackProvider = selectedProvider === 'vodafone' ? 'twilio' : 'vodafone';
        
        this.logger.warn(`Primary provider ${selectedProvider} failed, attempting fallback to ${fallbackProvider}`, {
          primaryError: primaryResult.error,
        });

        const fallbackResult = await this.attemptSmsDelivery(
          fallbackProvider,
          { ...options, to: normalizedPhone }
        );

        if (fallbackResult.success) {
          const deliveryTime = Date.now() - startTime;
          
          this.logger.log(`SMS delivered successfully via fallback ${fallbackProvider}`, {
            to: this.maskPhoneNumber(normalizedPhone),
            region: phoneRegion,
            deliveryTime: `${deliveryTime}ms`,
          });

          return {
            success: true,
            provider: fallbackProvider,
            requestId: fallbackResult.requestId,
            routingReason: `${routingReason} (fallback after ${selectedProvider} failed)`,
            phoneRegion,
            deliveryTime,
          };
        }

        // Both providers failed
        const deliveryTime = Date.now() - startTime;
        
        this.logger.error(`Both SMS providers failed for ${this.maskPhoneNumber(normalizedPhone)}`, {
          primaryProvider: selectedProvider,
          primaryError: primaryResult.error,
          fallbackProvider,
          fallbackError: fallbackResult.error,
        });

        return {
          success: false,
          provider: 'failed',
          error: `Both providers failed: ${selectedProvider} (${primaryResult.error}), ${fallbackProvider} (${fallbackResult.error})`,
          routingReason,
          phoneRegion,
          deliveryTime,
        };
      }

      // Single provider failed, no fallback
      const deliveryTime = Date.now() - startTime;
      
      this.logger.error(`SMS delivery failed via ${selectedProvider}`, {
        to: this.maskPhoneNumber(normalizedPhone),
        error: primaryResult.error,
      });

      return {
        success: false,
        provider: 'failed',
        error: primaryResult.error,
        routingReason,
        phoneRegion,
        deliveryTime,
      };

    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      
      this.logger.error(`SMS router error: ${error.message}`);
      
      return {
        success: false,
        provider: 'failed',
        error: error.message,
        routingReason: 'Router error',
        phoneRegion: 'unknown',
        deliveryTime,
      };
    }
  }

  /**
   * Send bulk SMS with intelligent routing for each recipient
   */
  async sendBulkSms(
    recipients: Array<{ to: string; message: string; from?: string }>,
    options: {
      delayMs?: number;
      forceProvider?: 'vodafone' | 'twilio' | 'auto';
      continueOnError?: boolean;
    } = {}
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: SmsDeliveryResult[];
    providerStats: { vodafone: number; twilio: number; failed: number };
    regionStats: { egypt: number; international: number; unknown: number };
  }> {
    const results: SmsDeliveryResult[] = [];
    const providerStats = { vodafone: 0, twilio: 0, failed: 0 };
    const regionStats = { egypt: 0, international: 0, unknown: 0 };

    this.logger.log(`Starting bulk SMS delivery to ${recipients.length} recipients`);

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        const result = await this.sendSms({
          to: recipient.to,
          message: recipient.message,
          from: recipient.from,
          forceProvider: options.forceProvider,
        });

        results.push(result);
        providerStats[result.provider]++;
        regionStats[result.phoneRegion]++;

        // Add delay between messages if specified
        if (options.delayMs && i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, options.delayMs));
        }

      } catch (error) {
        const failedResult: SmsDeliveryResult = {
          success: false,
          provider: 'failed',
          error: error.message,
          routingReason: 'Bulk SMS error',
          phoneRegion: 'unknown',
          deliveryTime: 0,
        };
        
        results.push(failedResult);
        providerStats.failed++;
        regionStats.unknown++;

        if (!options.continueOnError) {
          this.logger.error(`Bulk SMS stopped at recipient ${i + 1} due to error: ${error.message}`);
          break;
        }
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    this.logger.log(`Bulk SMS completed: ${successful}/${results.length} successful`, {
      providerStats,
      regionStats,
    });

    return {
      total: results.length,
      successful,
      failed,
      results,
      providerStats,
      regionStats,
    };
  }

  /**
   * Get service status for both providers
   */
  async getServicesStatus(): Promise<{
    vodafone: { available: boolean; configured: boolean; info?: any };
    twilio: { available: boolean; configured: boolean; info?: any };
    router: SmsRouterConfig;
  }> {
    const vodafoneInfo = this.vodafoneSmsService.getServiceInfo();
    const vodafoneConnected = await this.vodafoneSmsService.testConnection().catch(() => false);

    return {
      vodafone: {
        available: vodafoneConnected,
        configured: vodafoneInfo.configured,
        info: vodafoneInfo,
      },
      twilio: {
        available: true, // Twilio service doesn't have a test connection method
        configured: true, // Assume configured if service exists
      },
      router: this.config,
    };
  }

  // Private helper methods

  private normalizePhoneNumber(phone: string): string {
    // Remove spaces, hyphens, parentheses
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Handle Egyptian numbers
    if (cleaned.startsWith('01')) {
      return `+2${cleaned}`;
    } else if (cleaned.startsWith('201') && !cleaned.startsWith('+')) {
      return `+${cleaned}`;
    } else if (!cleaned.startsWith('+')) {
      // Assume Egyptian if no country code
      return `+20${cleaned}`;
    }
    
    return cleaned;
  }

  private detectPhoneRegion(phone: string): 'egypt' | 'international' | 'unknown' {
    // Check Egyptian prefixes
    for (const prefix of this.config.egyptianPrefixes) {
      if (phone.startsWith(prefix)) {
        return 'egypt';
      }
    }
    
    // Check international prefixes
    for (const prefix of this.config.internationalPrefixes) {
      if (phone.startsWith(prefix)) {
        return 'international';
      }
    }
    
    // Check if it's Egypt but not in our known prefixes
    if (phone.startsWith('+20')) {
      return 'egypt';
    }
    
    return 'unknown';
  }

  private selectProvider(
    phoneRegion: 'egypt' | 'international' | 'unknown',
    forceProvider?: 'vodafone' | 'twilio' | 'auto'
  ): 'vodafone' | 'twilio' {
    if (forceProvider && forceProvider !== 'auto') {
      return forceProvider;
    }

    // Route based on deployment region and phone region
    switch (this.config.deploymentRegion) {
      case 'egypt':
        // Egypt deployment: Use Vodafone for domestic, Twilio for international
        return phoneRegion === 'egypt' ? this.config.domesticProvider : this.config.internationalProvider;
      
      case 'international':
        // International deployment: Prefer Twilio, but allow Vodafone for Egypt numbers
        return phoneRegion === 'egypt' ? this.config.domesticProvider : this.config.internationalProvider;
      
      case 'global':
        // Global deployment: Smart routing based on region
        if (phoneRegion === 'egypt') {
          return this.config.domesticProvider; // Vodafone for Egypt
        } else if (phoneRegion === 'international') {
          return this.config.internationalProvider; // Twilio for international
        } else {
          // Unknown region: use international provider as safe default
          return this.config.internationalProvider;
        }
      
      default:
        return this.config.domesticProvider;
    }
  }

  private getRoutingReason(
    phoneRegion: 'egypt' | 'international' | 'unknown',
    selectedProvider: 'vodafone' | 'twilio',
    forceProvider?: string
  ): string {
    if (forceProvider && forceProvider !== 'auto') {
      return `Forced to ${selectedProvider}`;
    }

    const deployment = this.config.deploymentRegion;
    
    if (phoneRegion === 'egypt' && selectedProvider === 'vodafone') {
      return `Egyptian number routed to Vodafone for local delivery (${deployment} deployment)`;
    } else if (phoneRegion === 'international' && selectedProvider === 'twilio') {
      return `International number routed to Twilio for global reach (${deployment} deployment)`;
    } else if (phoneRegion === 'egypt' && selectedProvider === 'twilio') {
      return `Egyptian number routed to Twilio (international provider configured for ${deployment})`;
    } else if (phoneRegion === 'international' && selectedProvider === 'vodafone') {
      return `International number routed to Vodafone (domestic provider configured for ${deployment})`;
    } else {
      return `Unknown region routed to ${selectedProvider} (${deployment} deployment default)`;
    }
  }

  private async attemptSmsDelivery(
    provider: 'vodafone' | 'twilio',
    options: { to: string; message: string; from?: string }
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      let success = false;
      
      if (provider === 'vodafone') {
        success = await this.vodafoneSmsService.sendSms(options);
      } else {
        success = await this.twilioSmsService.sendSms(options);
      }
      
      return {
        success,
        requestId: success ? `${provider}_${Date.now()}` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return phone;
    
    const countryCode = phone.substring(0, 3);
    const masked = phone.substring(3, -4).replace(/\d/g, '*');
    const lastFour = phone.substring(phone.length - 4);
    
    return `${countryCode}${masked}${lastFour}`;
  }

  /**
   * Get routing statistics for monitoring
   */
  getRoutingStats(): {
    config: SmsRouterConfig;
    supportedRegions: { egypt: string[]; international: string[] };
    routingRules: any;
  } {
    return {
      config: this.config,
      supportedRegions: {
        egypt: this.config.egyptianPrefixes,
        international: this.config.internationalPrefixes,
      },
      routingRules: {
        egypt_deployment: {
          egyptian_numbers: this.config.domesticProvider,
          international_numbers: this.config.internationalProvider,
        },
        international_deployment: {
          egyptian_numbers: this.config.domesticProvider,
          international_numbers: this.config.internationalProvider,
        },
        global_deployment: {
          egyptian_numbers: this.config.domesticProvider,
          international_numbers: this.config.internationalProvider,
          unknown_numbers: this.config.internationalProvider,
        },
      },
    };
  }
}