import { SetMetadata } from '@nestjs/common';

export interface Permission {
  resource: string;
  action: string;
}

/**
 * Decorator to specify required permissions for an endpoint
 * 
 * @example
 * @RequirePermissions({ resource: 'devices', action: 'create' })
 * @RequirePermissions([
 *   { resource: 'devices', action: 'read' },
 *   { resource: 'clients', action: 'read' }
 * ])
 */
export const RequirePermissions = (...permissions: Permission[] | Permission[][]) => {
  const flattenedPermissions = permissions.flat();
  return SetMetadata('permissions', flattenedPermissions);
};

// Legacy decorator for backward compatibility
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata('permission', { resource, action });

/**
 * Common permission combinations for convenience
 */
export class CommonPermissions {
  // Device permissions
  static readonly DEVICE_CREATE = { resource: 'devices', action: 'create' };
  static readonly DEVICE_READ = { resource: 'devices', action: 'read' };
  static readonly DEVICE_UPDATE = { resource: 'devices', action: 'update' };
  static readonly DEVICE_DELETE = { resource: 'devices', action: 'delete' };
  static readonly DEVICE_COMMAND = { resource: 'devices', action: 'command' };
  
  // User management permissions
  static readonly USER_CREATE = { resource: 'users', action: 'create' };
  static readonly USER_READ = { resource: 'users', action: 'read' };
  static readonly USER_UPDATE = { resource: 'users', action: 'update' };
  static readonly USER_DELETE = { resource: 'users', action: 'delete' };
  
  // Client management permissions
  static readonly CLIENT_CREATE = { resource: 'clients', action: 'create' };
  static readonly CLIENT_READ = { resource: 'clients', action: 'read' };
  static readonly CLIENT_UPDATE = { resource: 'clients', action: 'update' };
  static readonly CLIENT_DELETE = { resource: 'clients', action: 'delete' };
  
  // Report permissions
  static readonly REPORT_GENERATE = { resource: 'reports', action: 'generate' };
  static readonly REPORT_VIEW = { resource: 'reports', action: 'view' };
  static readonly REPORT_DOWNLOAD = { resource: 'reports', action: 'download' };
  
  // Dashboard permissions
  static readonly DASHBOARD_VIEW = { resource: 'dashboard', action: 'view' };
  static readonly DASHBOARD_CUSTOMIZE = { resource: 'dashboard', action: 'customize' };
  
  // Widget permissions
  static readonly WIDGET_CREATE = { resource: 'widgets', action: 'create' };
  static readonly WIDGET_CONFIGURE = { resource: 'widgets', action: 'configure' };
  
  // Alarm permissions
  static readonly ALARM_CREATE = { resource: 'alarms', action: 'create' };
  static readonly ALARM_MANAGE = { resource: 'alarms', action: 'manage' };
  static readonly ALARM_ACKNOWLEDGE = { resource: 'alarms', action: 'acknowledge' };
  
  // System permissions
  static readonly SYSTEM_MANAGE = { resource: 'system', action: 'manage' };
  static readonly SETTINGS_SYSTEM = { resource: 'settings', action: 'system' };
  static readonly SETTINGS_ORG = { resource: 'settings', action: 'organization' };
  
  // File permissions
  static readonly FILE_UPLOAD = { resource: 'files', action: 'upload' };
  static readonly FILE_VIEW = { resource: 'files', action: 'view' };
  static readonly FILE_MANAGE = { resource: 'files', action: 'manage' };
  
  // Notification permissions
  static readonly NOTIFICATION_SEND = { resource: 'notifications', action: 'send' };
  static readonly NOTIFICATION_MANAGE = { resource: 'notifications', action: 'manage' };
}