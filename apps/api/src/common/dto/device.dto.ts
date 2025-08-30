import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsUUID, IsDateString, IsObject, IsNumber, IsLatitude, IsLongitude } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({ example: 'Solar Pump Station 1' })
  @IsString()
  deviceName: string;

  @ApiProperty({ example: 'INV-001' })
  @IsString()
  deviceCode: string;

  @ApiPropertyOptional({ example: 'SEITECH-12345' })
  @IsOptional()
  @IsString()
  seitechDeviceId?: string;

  @ApiProperty({ example: 'LB-001' })
  @IsString()
  lifeboxCode: string;

  @ApiProperty({ example: 'solar_pump' })
  @IsString()
  deviceType: string;

  @ApiProperty({ example: '550d7b3e-4e3f-4c6f-8b3a-9c9e3b1e3a5b' })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @ApiPropertyOptional({ example: '2024-01-20' })
  @IsOptional()
  @IsDateString()
  commissioningDate?: string;

  @ApiPropertyOptional({ example: '2027-01-15' })
  @IsOptional()
  @IsDateString()
  warrantyEndDate?: string;

  @ApiPropertyOptional({ example: 'CONTRACT-2024-001' })
  @IsOptional()
  @IsString()
  contractReference?: string;

  @ApiPropertyOptional({
    example: { pumping: true, desalination: false, batteries: true }
  })
  @IsOptional()
  @IsObject()
  components?: Record<string, any>;

  @ApiPropertyOptional({
    example: { powerKw: 5.5, voltageV: 380, currentA: 15, flowRateLh: 1000 }
  })
  @IsOptional()
  @IsObject()
  pumpDetails?: Record<string, any>;
}

export class UpdateDeviceDto extends CreateDeviceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDeviceLocationDto {
  @ApiProperty({ example: 30.0444 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 31.2357 })
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ example: '123 Solar Farm Road, Cairo, Egypt' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Cairo' })
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiPropertyOptional({ example: 'Nasr City' })
  @IsOptional()
  @IsString()
  city?: string;
}

export class DeviceQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number = 10;
}

export class SendCommandDto {
  @ApiProperty({ 
    example: 'TDS_RANGE',
    description: 'Command type - supports all 28 new command types plus legacy commands',
    enum: [
      // New 28 command types
      'TDS_RANGE', 'Level_Sensor', 'Pressure_Sensor', 'Change_phone_number',
      'Control_Pump_Forward1', 'Select_Start_Command_Mode', 'Change_Inverter_Temperature_SetPoint',
      'Pre_alarm_Temperature_Setpoint', 'pre_temp_alarm_test', 'Inverter_Cancel_Pass',
      'Inverter_Change_Password', 'control_master_on', 'EdgeBox_Command',
      'Inverter_Reg_Addr', 'Inverter_Reg_Addr2', 'Inverter_Remote_direction',
      'Inverter_Remote_AlarmReset', 'Control_Pump_Stop', 'Control_Pump_Forward',
      'Control_Pump_Backward', 'control_master_off', 'client_data_1',
      'client_data_2', 'Grid_Price_Rate', 'Diesel_Price_Rate', 'ChangeApn',
      'Change_Cloud_Credential', 'Reset_Box',
      // Legacy commands for backward compatibility
      'status_monitoring', 'BoxPowerSource', 'pump_control', 'system_control', 'monitoring',
      'pump_on', 'pump_off', 'pump_forward', 'pump_reverse', 'inverter_password_change',
      'master_shutdown', 'master_unlock', 'alarm_reset', 'parameter_update',
      'START_PUMP', 'STOP_PUMP', 'SET_FREQUENCY', 'SET_MOTOR_SPEED',
      'ENABLE_AUTO_MODE', 'DISABLE_AUTO_MODE', 'RESTART_SYSTEM', 'SHUTDOWN_SYSTEM'
    ]
  })
  @IsString()
  commandType: string;

  @ApiPropertyOptional({ example: 'start' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: { speed: 75, duration: 3600 } })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ 
    example: {
      raw: {
        type: 'status_monitoring',
        title: 'Status Monitoring Not Updated', 
        status: 1,
        severity: 2,
        propagate: true
      }
    }
  })
  @IsOptional()
  @IsObject()
  payload?: {
    raw?: {
      type: string;
      title: string;
      status: number;
      severity: number;
      propagate: boolean;
    };
  } | Record<string, any>;

  @ApiPropertyOptional({ 
    example: 'MEDIUM',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  })
  @IsOptional()
  @IsString()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({ example: '2025-08-15T15:00:00Z' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
