import { connect } from 'mqtt';
import { z } from 'zod';
import pino from 'pino';
import axios from 'axios';
import { MQTTCommandService } from './command-service';
import { DeviceCommand } from './command-publisher';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Comprehensive MQTT Device Payload Schema - Complete IoT Data Structure
const DevicePayloadSchema = z.object({
  // Energy Measurements
  accumulated_nonsolar_consumption_value: z.number().optional(),
  accumulated_solar_consumption_value: z.number().optional(),
  daily_nonsolar_consumption_value: z.number().optional(),
  daily_solar_consumption_value: z.number().optional(),
  hourly_nonsolar_consumption_value: z.number().optional(),
  hourly_solar_consumption_value: z.number().optional(),
  energy_per_day_value: z.number().optional(),
  total_energy_value: z.number().optional(),
  pump_energy_consumption_value: z.number().optional(),
  
  // Electrical Measurements  
  bus_voltage_value: z.number().optional(),
  frequency_value: z.number().optional(),
  pump_current_value: z.number().optional(),
  pump_power_value: z.number().optional(),
  pump_voltage_value: z.number().optional(),
  
  // Motor & Pump Measurements
  motor_speed_value: z.number().optional(),
  pump_status_value: z.string().optional(),
  inverter_direction_value: z.string().optional(),
  inverter_status_value: z.string().optional(),
  inverter_supply_source_value: z.string().optional(),
  inverter_temperature_value: z.number().optional(),
  
  // Water & Environmental Measurements
  tds_sensor_value: z.number().optional(),
  level_sensor_value: z.number().optional(),
  pressure_sensor_value: z.number().optional(),
  totalWaterVolume_m3_value: z.number().optional(),
  water_pumped_flow_rate_per_hour_value: z.number().optional(),
  
  // System Information
  PowerSourceOfBox_value: z.string().optional(),
  device_code_value: z.string().optional(),
  device_id_value: z.string().optional(),
  lifebox_code_value: z.string().optional(),
  location_value: z.string().optional(),
  system_components_value: z.string().optional(),
  Last_InvUpdate_value: z.string().optional(),
  
  // Date Fields
  commissioning_date_value: z.string().optional(),
  installation_date_value: z.string().optional(),
  
  // Contract & Business
  contract_ref_number_value: z.string().optional(),
  replacing_what_value: z.string().optional(),
  subscription_type_value: z.string().optional(),
  client_tier_value: z.string().optional(),
  
  // Calculated Values
  money_saved_value: z.number().optional(),
  TotalCO2Mitigated_value: z.number().optional(),
  
  // Control & Configuration
  StartCommandMode_value: z.string().optional(),
  SW_VERSION_value: z.string().optional(),
  HW_VERSION_value: z.string().optional(),
  
  // Legacy format support (for backward compatibility)
  data: z.object({
    frequency: z.object({ value: z.number() }).optional(),
    pump_voltage: z.object({ value: z.number() }).optional(),
    pump_current: z.object({ value: z.number() }).optional(),
    motor_speed: z.object({ value: z.number() }).optional(),
    bus_voltage: z.object({ value: z.number() }).optional(),
    inverter_temperature: z.object({ value: z.number() }).optional(),
    total_energy: z.object({ value: z.number() }).optional(),
    pump_energy_consumption: z.object({ value: z.number() }).optional(),
    energy_per_day: z.object({ value: z.number() }).optional(),
    inverter_supply_source: z.object({ value: z.string() }).optional(),
    inverter_status: z.object({ value: z.number() }).optional(),
    water_pumped_flow_rate_per_hour: z.object({ value: z.number() }).optional(),
    money_saved: z.object({ value: z.number() }).optional(),
  }).optional()
}).passthrough(); // Allow additional unknown fields

// Command acknowledgment schema
const CommandAcknowledgmentSchema = z.object({
  commandId: z.string(),
  deviceId: z.string(),
  status: z.enum(['RECEIVED', 'EXECUTING', 'COMPLETED', 'FAILED', 'TIMEOUT']),
  message: z.string().optional(),
  timestamp: z.string(),
  executionData: z.record(z.any()).optional()
});

// API Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const API_ADMIN_TOKEN = process.env.API_ADMIN_TOKEN; // For telemetry ingestion

// MQTT Configuration
const MQTT_BROKER_HOST = process.env.MQTT_BROKER_HOST || 'localhost';
const MQTT_BROKER_PORT = parseInt(process.env.MQTT_BROKER_PORT || '1883');
const MQTT_USERNAME = process.env.MQTT_USERNAME || 'lifebox_ingestion';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || `lifebox-ingestion-${process.pid}`;

// Processing Configuration
const CONCURRENT_PROCESSING = parseInt(process.env.CONCURRENT_PROCESSING || '5');
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000');

// Initialize Command Service
const commandService = new MQTTCommandService();

/**
 * Transform device payload to API telemetry format (New Comprehensive Structure)
 */
function transformDevicePayload(devicePayload: any, deviceId: string) {
  // Build telemetry object with all new MQTT fields mapped directly
  const telemetry: any = {
    time: new Date().toISOString(),
    
    // NEW: Energy Measurements (direct mapping from MQTT)
    accumulatedNonsolarConsumptionValue: devicePayload.accumulated_nonsolar_consumption_value,
    accumulatedSolarConsumptionValue: devicePayload.accumulated_solar_consumption_value,
    dailyNonsolarConsumptionValue: devicePayload.daily_nonsolar_consumption_value,
    dailySolarConsumptionValue: devicePayload.daily_solar_consumption_value,
    hourlyNonsolarConsumptionValue: devicePayload.hourly_nonsolar_consumption_value,
    hourlySolarConsumptionValue: devicePayload.hourly_solar_consumption_value,
    energyPerDayValue: devicePayload.energy_per_day_value,
    totalEnergyValue: devicePayload.total_energy_value,
    pumpEnergyConsumptionValue: devicePayload.pump_energy_consumption_value,
    
    // NEW: Electrical Measurements
    busVoltageValue: devicePayload.bus_voltage_value,
    frequencyValue: devicePayload.frequency_value,
    pumpCurrentValue: devicePayload.pump_current_value,
    pumpPowerValue: devicePayload.pump_power_value,
    pumpVoltageValue: devicePayload.pump_voltage_value,
    
    // NEW: Motor & Pump Measurements
    motorSpeedValue: devicePayload.motor_speed_value,
    pumpStatusValue: devicePayload.pump_status_value,
    inverterDirectionValue: devicePayload.inverter_direction_value,
    inverterStatusValue: devicePayload.inverter_status_value,
    inverterSupplySourceValue: devicePayload.inverter_supply_source_value,
    inverterTemperatureValue: devicePayload.inverter_temperature_value,
    
    // NEW: Water & Environmental Measurements
    tdsValue: devicePayload.tds_sensor_value,
    levelSensorValue: devicePayload.level_sensor_value,
    pressureSensorValue: devicePayload.pressure_sensor_value,
    totalWaterVolumeM3Value: devicePayload.totalWaterVolume_m3_value,
    waterPumpedFlowRatePerHourValue: devicePayload.water_pumped_flow_rate_per_hour_value,
    
    // NEW: System Information
    powerSourceOfBoxValue: devicePayload.PowerSourceOfBox_value,
    deviceCodeValue: devicePayload.device_code_value,
    deviceIdValue: devicePayload.device_id_value,
    lifeboxCodeValue: devicePayload.lifebox_code_value,
    locationValue: devicePayload.location_value,
    systemComponentsValue: devicePayload.system_components_value,
    lastInvUpdateValue: devicePayload.Last_InvUpdate_value,
    
    // NEW: Date Fields
    commissioningDateValue: devicePayload.commissioning_date_value,
    installationDateValue: devicePayload.installation_date_value,
    
    // NEW: Contract & Business
    contractRefNumberValue: devicePayload.contract_ref_number_value,
    replacingWhatValue: devicePayload.replacing_what_value,
    subscriptionTypeValue: devicePayload.subscription_type_value,
    clientTierValue: devicePayload.client_tier_value,
    
    // NEW: Calculated Values
    moneySavedValue: devicePayload.money_saved_value,
    totalCO2MitigatedValue: devicePayload.TotalCO2Mitigated_value,
    
    // NEW: Control & Configuration
    startCommandModeValue: devicePayload.StartCommandMode_value,
    swVersionValue: devicePayload.SW_VERSION_value,
    hwVersionValue: devicePayload.HW_VERSION_value,
    
    // Store raw payload for debugging and unknown field detection
    rawPayload: devicePayload
  };

  // LEGACY SUPPORT: Handle old data structure if present
  if (devicePayload.data) {
    const { data } = devicePayload;
    
    // Map legacy fields if new ones aren't present
    if (!telemetry.frequencyValue && data.frequency?.value) telemetry.frequencyValue = data.frequency.value;
    if (!telemetry.pumpVoltageValue && data.pump_voltage?.value) telemetry.pumpVoltageValue = data.pump_voltage.value;
    if (!telemetry.pumpCurrentValue && data.pump_current?.value) telemetry.pumpCurrentValue = data.pump_current.value;
    if (!telemetry.motorSpeedValue && data.motor_speed?.value) telemetry.motorSpeedValue = data.motor_speed.value;
    if (!telemetry.busVoltageValue && data.bus_voltage?.value) telemetry.busVoltageValue = data.bus_voltage.value;
    if (!telemetry.inverterTemperatureValue && data.inverter_temperature?.value) telemetry.inverterTemperatureValue = data.inverter_temperature.value;
    if (!telemetry.totalEnergyValue && data.total_energy?.value) telemetry.totalEnergyValue = data.total_energy.value;
    if (!telemetry.pumpEnergyConsumptionValue && data.pump_energy_consumption?.value) telemetry.pumpEnergyConsumptionValue = data.pump_energy_consumption.value;
    if (!telemetry.energyPerDayValue && data.energy_per_day?.value) telemetry.energyPerDayValue = data.energy_per_day.value;
    if (!telemetry.inverterSupplySourceValue && data.inverter_supply_source?.value) telemetry.inverterSupplySourceValue = data.inverter_supply_source.value;
    if (!telemetry.waterPumpedFlowRatePerHourValue && data.water_pumped_flow_rate_per_hour?.value) telemetry.waterPumpedFlowRatePerHourValue = data.water_pumped_flow_rate_per_hour.value;
    if (!telemetry.moneySavedValue && data.money_saved?.value) telemetry.moneySavedValue = data.money_saved.value;
  }

  // Remove undefined values to clean payload
  Object.keys(telemetry).forEach(key => {
    if (telemetry[key] === undefined) {
      delete telemetry[key];
    }
  });

  // Collect unknown fields for catalog (fields not in our schema)
  // UPDATED: Complete list of all 37+ known MQTT telemetry fields
  const knownFields = new Set([
    // Energy Measurements
    'accumulated_nonsolar_consumption_value', 'accumulated_solar_consumption_value',
    'daily_nonsolar_consumption_value', 'daily_solar_consumption_value',
    'hourly_nonsolar_consumption_value', 'hourly_solar_consumption_value',
    'energy_per_day_value', 'total_energy_value', 'pump_energy_consumption_value',
    
    // Electrical Measurements  
    'bus_voltage_value', 'frequency_value', 'pump_current_value', 'pump_power_value', 'pump_voltage_value',
    
    // Motor & Pump Measurements
    'motor_speed_value', 'pump_status_value', 'inverter_direction_value', 'inverter_status_value',
    'inverter_supply_source_value', 'inverter_temperature_value',
    
    // Water & Environmental Measurements
    'tds_sensor_value', 'level_sensor_value', 'pressure_sensor_value', 
    'totalWaterVolume_m3_value', 'water_pumped_flow_rate_per_hour_value',
    
    // System Information
    'PowerSourceOfBox_value', 'device_code_value', 'device_id_value', 'lifebox_code_value', 
    'location_value', 'system_components_value', 'Last_InvUpdate_value',
    
    // Date Fields
    'commissioning_date_value', 'installation_date_value',
    
    // Contract & Business  
    'contract_ref_number_value', 'replacing_what_value', 'subscription_type_value', 'client_tier_value',
    
    // Calculated Values
    'money_saved_value', 'TotalCO2Mitigated_value',
    
    // Control & Configuration
    'StartCommandMode_value', 'SW_VERSION_value', 'HW_VERSION_value',
    
    // Legacy format support
    'data'
  ]);

  const unknownFields: Record<string, any> = {};
  Object.keys(devicePayload).forEach(key => {
    if (!knownFields.has(key)) {
      unknownFields[key] = devicePayload[key];
    }
  });

  return {
    telemetry,
    unknownFields,
    deviceId
  };
}

// In-memory processing queue to handle concurrent requests
const processingQueue: Array<() => Promise<void>> = [];
let isProcessing = false;

/**
 * Add telemetry processing task to queue
 */
async function queueTelemetryProcessing(deviceId: string, telemetry: any, unknownFields: Record<string, any>) {
  return new Promise<void>((resolve, reject) => {
    const task = async () => {
      try {
        await processTelemetryData(deviceId, telemetry, unknownFields);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    processingQueue.push(task);
    processQueue();
  });
}

/**
 * Process the telemetry queue
 */
async function processQueue() {
  if (isProcessing || processingQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  
  // Process up to CONCURRENT_PROCESSING tasks at once
  const tasks = processingQueue.splice(0, CONCURRENT_PROCESSING);
  
  try {
    await Promise.all(tasks.map(task => task().catch(err => {
      logger.error('Task processing failed:', err.message);
    })));
  } finally {
    isProcessing = false;
    // Continue processing remaining tasks
    if (processingQueue.length > 0) {
      setImmediate(processQueue);
    }
  }
}

/**
 * Process telemetry data by sending it to API endpoints
 */
async function processTelemetryData(deviceId: string, telemetry: any, unknownFields: Record<string, any>) {
  try {
    logger.info({ deviceId, fieldsCount: Object.keys(telemetry).length }, 'Processing telemetry data');
    
    // Send telemetry to API
    const response = await axios.post(
      `${API_BASE_URL}/devices/${deviceId}/telemetry`,
      telemetry,
      {
        headers: {
          'Authorization': `Bearer ${API_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT,
      }
    );
    
    logger.info({ 
      deviceId, 
      responseStatus: response.status,
      telemetryId: response.data?.id 
    }, 'Telemetry sent to API successfully');
    
    // Process unknown fields if any
    if (Object.keys(unknownFields).length > 0) {
      await processUnknownFields(deviceId, unknownFields);
    }
    
    // Send to alarm processing endpoint
    await processAlarms(deviceId, telemetry);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error({
      deviceId,
      error: errorMessage,
      stack: errorStack,
      telemetryData: telemetry,
    }, 'Failed to process telemetry data');
    
    // Don't re-throw - just log the error
  }
}

/**
 * Process unknown fields by sending them to the UnknownFieldCatalog API
 * ENHANCED: Now includes device metadata context for better field analysis
 */
async function processUnknownFields(deviceId: string, unknownFields: Record<string, any>): Promise<void> {
  try {
    // Get device metadata for context (optional, non-blocking)
    let deviceContext = null;
    try {
      const deviceResponse = await axios.get(
        `${API_BASE_URL}/devices/${deviceId}`,
        {
          headers: { 'Authorization': `Bearer ${API_ADMIN_TOKEN}` },
          timeout: 5000, // Quick timeout for metadata
        }
      );
      deviceContext = {
        deviceType: deviceResponse.data?.deviceType,
        deviceModel: deviceResponse.data?.deviceModel,
        softwareVersion: deviceResponse.data?.softwareVersion,
        hardwareVersion: deviceResponse.data?.hardwareVersion,
        installationDate: deviceResponse.data?.installationDate,
        clientId: deviceResponse.data?.clientId,
      };
    } catch (metadataError) {
      // Continue without metadata if fetch fails
      logger.debug({ deviceId, error: metadataError instanceof Error ? metadataError.message : 'Unknown metadata error' }, 'Could not fetch device metadata for unknown fields context');
    }

    for (const [fieldName, value] of Object.entries(unknownFields)) {
      const payload = {
        fieldName,
        sampleValues: [value], // Add value to sample values array
        deviceId,
        occurrenceCount: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        // ENHANCED: Add device metadata context
        deviceContext: deviceContext ? [deviceContext] : [],
      };

      // Send to UnknownFieldCatalog endpoint
      await axios.post(
        `${API_BASE_URL}/telemetry/unknown-fields/catalog`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${API_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: API_TIMEOUT,
        }
      );
      
      logger.debug({ 
        deviceId, 
        fieldName, 
        value,
        hasDeviceContext: !!deviceContext 
      }, 'Unknown field added to catalog with metadata context');
    }
    
    logger.info({ 
      deviceId, 
      unknownFieldsCount: Object.keys(unknownFields).length,
      fields: Object.keys(unknownFields),
      deviceContextAvailable: !!deviceContext
    }, 'Unknown fields processed and added to catalog');
    
  } catch (error) {
    // Log error but don't fail the telemetry processing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ 
      deviceId, 
      unknownFields: Object.keys(unknownFields),
      error: errorMessage 
    }, 'Failed to process unknown fields');
  }
}

/**
 * Send telemetry data to alarm processing system
 */
async function processAlarms(deviceId: string, telemetryData: any): Promise<void> {
  try {
    await axios.post(
      `${API_BASE_URL}/alarms/process-telemetry`,
      {
        deviceId,
        data: telemetryData,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    
    logger.debug({ deviceId }, 'Telemetry sent to alarm processor');
  } catch (error) {
    // Log error but don't fail the telemetry processing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ 
      deviceId, 
      error: errorMessage 
    }, 'Failed to process alarms for telemetry');
  }
}

/**
 * Process command acknowledgment from device
 */
async function processCommandAcknowledgment(deviceId: string, acknowledgment: any): Promise<void> {
  try {
    logger.info({
      commandId: acknowledgment.commandId,
      deviceId,
      status: acknowledgment.status,
      message: acknowledgment.message
    }, 'Processing command acknowledgment from device');

    // Validate acknowledgment structure
    const validationResult = CommandAcknowledgmentSchema.safeParse(acknowledgment);
    
    if (!validationResult.success) {
      logger.warn({
        deviceId,
        acknowledgment,
        errors: validationResult.error.errors
      }, 'Invalid acknowledgment structure received');
      return;
    }

    const validAck = validationResult.data;

    // Update command status in database via API
    const response = await axios.patch(
      `${API_BASE_URL}/devices/${deviceId}/commands/${validAck.commandId}/status`,
      {
        status: validAck.status,
        message: validAck.message,
        acknowledgedAt: validAck.timestamp,
        executionData: validAck.executionData
      },
      {
        headers: {
          'Authorization': `Bearer ${API_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT,
      }
    );

    logger.info({
      commandId: validAck.commandId,
      deviceId,
      status: validAck.status,
      responseStatus: response.status
    }, 'Command status updated successfully');

    // Mark command as completed in command service if final status
    if (['COMPLETED', 'FAILED', 'TIMEOUT'].includes(validAck.status)) {
      if (validAck.status === 'COMPLETED') {
        await commandService.markCommandCompleted(validAck.commandId);
      } else {
        await commandService.markCommandFailed(validAck.commandId, validAck.message || 'Command failed', false);
      }
    }

    // Send real-time notification via WebSocket
    await sendRealtimeCommandUpdate(deviceId, validAck);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      deviceId,
      commandId: acknowledgment.commandId,
      error: errorMessage,
      acknowledgment
    }, 'Failed to process command acknowledgment');
  }
}

/**
 * Send real-time command status update via WebSocket
 */
async function sendRealtimeCommandUpdate(deviceId: string, acknowledgment: any): Promise<void> {
  try {
    // Send command status update to real-time service
    await axios.post(
      `${API_BASE_URL}/realtime/command-status`,
      {
        deviceId,
        commandId: acknowledgment.commandId,
        status: acknowledgment.status,
        message: acknowledgment.message,
        timestamp: acknowledgment.timestamp,
        executionData: acknowledgment.executionData
      },
      {
        headers: {
          'Authorization': `Bearer ${API_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000, // Quick timeout for real-time updates
      }
    );

    logger.debug({
      deviceId,
      commandId: acknowledgment.commandId,
      status: acknowledgment.status
    }, 'Real-time command update sent');

  } catch (error) {
    // Don't fail acknowledgment processing if WebSocket notification fails
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({
      deviceId,
      commandId: acknowledgment.commandId,
      error: errorMessage
    }, 'Failed to send real-time command update');
  }
}

/**
 * Handle command received from API via MQTT
 */
async function handleCommandFromAPI(payload: Buffer): Promise<void> {
  try {
    const rawCommand = JSON.parse(payload.toString());
    
    logger.info({
      commandId: rawCommand.commandId,
      deviceId: rawCommand.deviceId,
      type: rawCommand.type
    }, 'Received command from API via MQTT');

    // Validate command structure
    const command = rawCommand as DeviceCommand;
    
    // Add timestamp if not provided
    if (!command.timestamp) {
      command.timestamp = new Date().toISOString();
    }

    // Enqueue command for processing
    const success = await commandService.enqueueCommand(command);
    
    if (success) {
      logger.info({
        commandId: command.commandId,
        deviceId: command.deviceId
      }, 'Command enqueued successfully');
    } else {
      logger.error({
        commandId: command.commandId,
        deviceId: command.deviceId
      }, 'Failed to enqueue command');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      error: errorMessage,
      payload: payload.toString().substring(0, 200)
    }, 'Failed to handle command from API');
  }
}

// MQTT client setup
const mqttBrokerUrl = `mqtt://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`;
logger.info({ brokerUrl: mqttBrokerUrl, clientId: MQTT_CLIENT_ID }, 'Connecting to MQTT broker');

const mqttClient = connect(mqttBrokerUrl, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clientId: MQTT_CLIENT_ID,
  keepalive: 60,
  reconnectPeriod: 5000, // Reconnect every 5 seconds
  connectTimeout: 30 * 1000, // 30 seconds
  clean: true, // Start with clean session
});

mqttClient.on('connect', async () => {
  logger.info('Connected to MQTT broker');
  
  // Subscribe to device telemetry topics
  mqttClient.subscribe('devices/+/telemetry', (err) => {
    if (err) {
      logger.error({ err }, 'Failed to subscribe to telemetry topics');
    } else {
      logger.info('Subscribed to device telemetry topics');
    }
  });

  // Subscribe to command acknowledgment topics
  mqttClient.subscribe('devices/+/commands/ack', (err) => {
    if (err) {
      logger.error({ err }, 'Failed to subscribe to command acknowledgment topics');
    } else {
      logger.info('Subscribed to command acknowledgment topics');
    }
  });

  // Subscribe to command queue topic (for API to send commands)
  mqttClient.subscribe('platform/commands/queue', (err) => {
    if (err) {
      logger.error({ err }, 'Failed to subscribe to command queue topic');
    } else {
      logger.info('Subscribed to command queue topic');
    }
  });

  // Start command service
  try {
    await commandService.start();
    logger.info('Command service started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start command service');
  }
});

mqttClient.on('message', async (topic: string, payload: Buffer) => {
  try {
    const topicParts = topic.split('/');
    
    // Handle different topic types
    if (topic === 'platform/commands/queue') {
      // Handle command from API
      await handleCommandFromAPI(payload);
      return;
    }
    
    // Handle command acknowledgments (devices/+/commands/ack)
    if (topicParts.length === 4 && topicParts[0] === 'devices' && topicParts[2] === 'commands' && topicParts[3] === 'ack') {
      const deviceId = topicParts[1];
      
      if (!deviceId) {
        logger.warn({ topic }, 'Could not extract device ID from acknowledgment topic');
        return;
      }
      
      // Parse acknowledgment payload
      const acknowledgment = JSON.parse(payload.toString());
      
      logger.info({
        deviceId,
        commandId: acknowledgment.commandId,
        status: acknowledgment.status
      }, 'Device command acknowledgment received');
      
      // Process acknowledgment (non-blocking)
      processCommandAcknowledgment(deviceId, acknowledgment).catch(error => {
        logger.error({
          deviceId,
          commandId: acknowledgment.commandId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Failed to process command acknowledgment');
      });
      
      return;
    }
    
    // Handle device telemetry (devices/+/telemetry)
    if (topicParts.length === 3 && topicParts[0] === 'devices' && topicParts[2] === 'telemetry') {
      const deviceId = topicParts[1];
      
      if (!deviceId) {
        logger.warn({ topic }, 'Could not extract device ID from telemetry topic');
        return;
      }
      
      // Parse JSON payload
      const rawPayload = JSON.parse(payload.toString());
      
      // Validate device payload structure
      const validationResult = DevicePayloadSchema.safeParse(rawPayload);
      
      if (!validationResult.success) {
        logger.warn({
          deviceId,
          errors: validationResult.error.errors,
          payload: rawPayload,
        }, 'Invalid device payload structure received');
        return;
      }
      
      // Transform device payload to API format
      const { telemetry, unknownFields } = transformDevicePayload(validationResult.data, deviceId);
      
      logger.info({ 
        deviceId, 
        fieldsCount: Object.keys(telemetry).length,
        unknownFieldsCount: Object.keys(unknownFields).length 
      }, 'Device telemetry received - queuing for processing');
      
      // Queue for processing (non-blocking)
      queueTelemetryProcessing(deviceId, telemetry, unknownFields).catch(error => {
        logger.error({
          deviceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Failed to process telemetry');
      });
      
      return;
    }
    
    // Handle unknown topics
    logger.warn({ topic, topicParts }, 'Received message on unknown topic');
    
  } catch (error) {
    logger.error({
      topic,
      error: error instanceof Error ? error.message : 'Unknown error',
      payload: payload.toString().substring(0, 500), // Log first 500 chars for debugging
    }, 'Failed to process MQTT message');
  }
});

mqttClient.on('error', (error) => {
  logger.error({ error }, 'MQTT client error');
});

mqttClient.on('reconnect', () => {
  logger.info('Reconnecting to MQTT broker...');
});

mqttClient.on('disconnect', () => {
  logger.warn('Disconnected from MQTT broker');
});

mqttClient.on('offline', () => {
  logger.warn('MQTT client went offline');
});

mqttClient.on('close', () => {
  logger.info('MQTT client connection closed');
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down MQTT ingestion service...');
  
  // Stop command service first
  try {
    await commandService.stop();
    logger.info('Command service stopped');
  } catch (error) {
    logger.error({ error }, 'Error stopping command service');
  }
  
  // Stop accepting new MQTT messages
  mqttClient.end(false, {}, () => {
    logger.info('MQTT client disconnected');
  });
  
  // Wait for processing queue to finish
  while (processingQueue.length > 0 || isProcessing) {
    logger.info({ queueSize: processingQueue.length, isProcessing }, 'Waiting for processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  logger.info('MQTT Ingestion Service shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception, shutting down');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
});

logger.info({
  brokerUrl: mqttBrokerUrl,
  clientId: MQTT_CLIENT_ID,
  apiBaseUrl: API_BASE_URL,
  concurrentProcessing: CONCURRENT_PROCESSING
}, 'MQTT Ingestion Service started');
