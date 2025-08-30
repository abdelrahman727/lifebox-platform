import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  // Skip logging for these endpoints to avoid noise
  private readonly skipEndpoints = [
    '/health',
    '/api/v1/health',
    '/metrics',
    '/favicon.ico',
  ];

  // Skip logging for these methods to avoid noise (typically for health checks)
  private readonly skipMethods = ['OPTIONS'];

  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const user = request.user as any; // Assuming user is attached to request by auth guard

    const startTime = Date.now();

    // Skip logging for certain endpoints and methods
    if (this.shouldSkipLogging(request)) {
      return next.handle();
    }

    // Extract basic information
    const endpoint = request.route?.path || request.url;
    const method = request.method;
    const ipAddress = this.extractIpAddress(request);
    const userAgent = request.get('User-Agent');

    return next.handle().pipe(
      tap((responseData) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful requests
        this.logRequest({
          user,
          endpoint,
          method,
          statusCode,
          duration,
          ipAddress,
          userAgent,
          request,
          responseData,
          isSuccessful: true,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log failed requests
        this.logRequest({
          user,
          endpoint,
          method,
          statusCode,
          duration,
          ipAddress,
          userAgent,
          request,
          error,
          isSuccessful: false,
        });

        return throwError(() => error);
      })
    );
  }

  private async logRequest(data: {
    user: any;
    endpoint: string;
    method: string;
    statusCode: number;
    duration: number;
    ipAddress: string;
    userAgent?: string;
    request: Request;
    responseData?: any;
    error?: any;
    isSuccessful: boolean;
  }) {
    const {
      user,
      endpoint,
      method,
      statusCode,
      duration,
      ipAddress,
      userAgent,
      request,
      responseData,
      error,
      isSuccessful,
    } = data;

    try {
      // Determine action type based on HTTP method
      const actionType = this.getActionType(method, endpoint);
      
      // Determine resource type based on endpoint
      const resourceType = this.getResourceType(endpoint);
      
      // Extract resource ID from path if possible
      const resourceId = this.extractResourceId(endpoint, request.params);
      
      // Extract device ID from request if possible
      const deviceId = this.extractDeviceId(request);

      // Determine category and severity
      const category = this.getCategory(endpoint, actionType);
      const severity = this.getSeverity(statusCode, isSuccessful);

      // Prepare audit log data
      await this.auditLogService.log({
        userId: user?.id || null,
        deviceId,
        clientId: user?.clientId || null,
        actionType,
        resourceType,
        resourceId,
        endpoint,
        method,
        statusCode,
        duration,
        details: {
          requestBody: this.sanitizeRequestBody(request.body),
          requestQuery: request.query,
          requestParams: request.params,
          responsePreview: this.sanitizeResponseData(responseData),
        },
        metadata: {
          contentType: request.get('Content-Type'),
          contentLength: request.get('Content-Length'),
          referer: request.get('Referer'),
          origin: request.get('Origin'),
        },
        ipAddress,
        userAgent,
        sessionId: this.extractSessionId(request),
        severity,
        category,
        isSuccessful,
        errorMessage: error?.message || null,
      });
    } catch (auditError) {
      // Don't let audit logging errors break the request
      this.logger.error('Failed to log audit entry', auditError);
    }
  }

  private shouldSkipLogging(request: Request): boolean {
    const url = request.url.toLowerCase();
    const method = request.method.toUpperCase();

    return (
      this.skipMethods.includes(method) ||
      this.skipEndpoints.some(endpoint => url.startsWith(endpoint.toLowerCase()))
    );
  }

  private getActionType(method: string, endpoint: string): string {
    const upperMethod = method.toUpperCase();
    
    // Special cases based on endpoint patterns
    if (endpoint.includes('/execute') || endpoint.includes('/command')) {
      return 'EXECUTE';
    }
    if (endpoint.includes('/login')) {
      return 'LOGIN';
    }
    if (endpoint.includes('/logout')) {
      return 'LOGOUT';
    }
    if (endpoint.includes('/reset-password')) {
      return 'PASSWORD_RESET';
    }
    if (endpoint.includes('/export')) {
      return 'EXPORT';
    }
    if (endpoint.includes('/import')) {
      return 'IMPORT';
    }

    // Standard HTTP method mapping
    switch (upperMethod) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      case 'GET':
        return 'READ';
      default:
        return upperMethod;
    }
  }

  private getResourceType(endpoint: string): string {
    // Extract resource type from endpoint path
    const pathParts = endpoint.split('/').filter(part => part && !part.startsWith(':'));
    
    // Common resource mappings
    const resourceMappings = {
      devices: 'DEVICE',
      users: 'USER',
      clients: 'CLIENT',
      commands: 'COMMAND',
      alarms: 'ALARM',
      notifications: 'NOTIFICATION',
      files: 'FILE',
      reports: 'REPORT',
      auth: 'AUTH',
      telemetry: 'TELEMETRY',
      dashboard: 'DASHBOARD',
      settings: 'SETTING',
      payments: 'PAYMENT',
      'quick-view-pages': 'QUICK_VIEW_PAGE',
      sustainability: 'SUSTAINABILITY',
    };

    for (const part of pathParts) {
      if (resourceMappings[part]) {
        return resourceMappings[part];
      }
    }

    // Default fallback
    return pathParts[pathParts.length - 1]?.toUpperCase() || 'API';
  }

  private extractResourceId(endpoint: string, params: any): string | null {
    // Try to extract ID from common parameter names
    const idParams = ['id', 'deviceId', 'userId', 'clientId', 'commandId'];
    
    for (const param of idParams) {
      if (params[param]) {
        return params[param];
      }
    }

    return null;
  }

  private extractDeviceId(request: Request): string | null {
    // Check params first
    if (request.params.deviceId) {
      return request.params.deviceId;
    }
    
    // Check query parameters
    if (request.query.deviceId) {
      return request.query.deviceId as string;
    }
    
    // Check request body for device ID
    if (request.body?.deviceId) {
      return request.body.deviceId;
    }

    return null;
  }

  private getCategory(endpoint: string, actionType: string): 'user_action' | 'system' | 'security' | 'device_control' {
    if (endpoint.includes('/auth') || endpoint.includes('/login') || endpoint.includes('/logout')) {
      return 'security';
    }
    
    if (endpoint.includes('/device') || endpoint.includes('/command') || actionType === 'EXECUTE') {
      return 'device_control';
    }
    
    if (endpoint.includes('/system') || endpoint.includes('/health') || endpoint.includes('/metrics')) {
      return 'system';
    }

    return 'user_action';
  }

  private getSeverity(statusCode: number, isSuccessful: boolean): 'debug' | 'info' | 'warn' | 'error' | 'critical' {
    if (!isSuccessful) {
      if (statusCode >= 500) return 'error';
      if (statusCode >= 400) return 'warn';
    }
    
    return 'info';
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return null;

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeResponseData(responseData: any): any {
    if (!responseData) return null;

    // Limit response preview to prevent large logs
    const preview = JSON.stringify(responseData);
    if (preview.length > 500) {
      return preview.substring(0, 500) + '... [TRUNCATED]';
    }

    return responseData;
  }

  private extractIpAddress(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private extractSessionId(request: Request): string | null {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      try {
        const token = authorization.substring(7);
        return token.substring(0, 32);
      } catch {
        return null;
      }
    }
    return null;
  }
}