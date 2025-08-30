// Device Types
export interface Device {
  id: string;
  clientId: string;
  deviceName: string;
  deviceCode: string;
  seitechDeviceId?: string;
  lifeboxCode: string;
  deviceType: string;
  installationDate?: Date;
  commissioningDate?: Date;
  warrantyEndDate?: Date;
  contractReference?: string;
  components: DeviceComponents;
  pumpDetails: PumpDetails;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceComponents {
  pumping: boolean;
  desalination: boolean;
  batteries: boolean;
}

export interface PumpDetails {
  powerKw: number;
  voltageV: number;
  currentA: number;
  flowRateLh: number;
}

// Telemetry Types
export interface TelemetryEvent {
  time: Date;
  deviceId: string;
  totalEnergyMwh?: number;
  energyPerDayKwh?: number;
  busVoltageV?: number;
  acSource?: 'grid' | 'diesel' | 'solar' | null;
  pumpPowerKw?: number;
  pumpVoltageV?: number;
  pumpCurrentA?: number;
  motorRpm?: number;
  pumpEnergyKwh?: number;
  frequencyHz?: number;
  inverterOn?: boolean;
  pumpOn?: boolean;
  inverterTempC?: number;
  tdsPpm?: number;
  waterLevelM?: number;
  pressureBar?: number;
  ph?: number;
  soilMoisturePct?: number;
  waterVolumeM3?: number;
  extras?: Record<string, any>;
}

// Command Types
export enum CommandType {
  PUMP_ON = 'pump_on',
  PUMP_OFF = 'pump_off',
  PUMP_FORWARD = 'pump_forward',
  PUMP_REVERSE = 'pump_reverse',
  INVERTER_PASSWORD_CHANGE = 'inverter_password_change',
  MASTER_SHUTDOWN = 'master_shutdown',
  MASTER_UNLOCK = 'master_unlock',
  ALARM_RESET = 'alarm_reset',
  PARAMETER_UPDATE = 'parameter_update'
}

export enum CommandStatus {
  PENDING = 'pending',
  SENT = 'sent',
  ACKNOWLEDGED = 'acknowledged',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

// Alarm Types
export enum AlarmSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum AlarmCategory {
  FRECON_VFD = 'frecon_vfd',
  BATTERY_INVERTER = 'battery_inverter',
  GATEWAY = 'gateway',
  CONNECTIVITY = 'connectivity',
  CUSTOM = 'custom'
}

// User & Role Types
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ORGANIZATION_CLIENT = 'organization_client',
  OPERATOR = 'operator',
  VIEWER = 'viewer'
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  roleId: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Payment Types
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum SubscriptionType {
  DIRECT_SALE = 'direct_sale',
  SUBSCRIPTION = 'subscription'
}
