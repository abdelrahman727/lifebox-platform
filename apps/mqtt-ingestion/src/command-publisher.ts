import { connect, MqttClient } from 'mqtt';
import { z } from 'zod';
import pino from 'pino';
import axios from 'axios';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Command payload schema for device commands (Updated with complete 28-command list)
const DeviceCommandSchema = z.object({
  commandId: z.string(),
  deviceId: z.string(),
  type: z.enum([
    // Updated: Complete 28-command types based on user requirements
    'TDS_RANGE',
    'Level_Sensor', 
    'Pressure_Sensor',
    'Change_phone_number',
    'Control_Pump_Forward1',
    'Select_Start_Command_Mode',
    'Change_Inverter_Temperature_SetPoint',
    'Pre_alarm_Temperature_Setpoint',
    'pre_temp_alarm_test',
    'Inverter_Cancel_Pass',
    'Inverter_Change_Password',
    'control_master_on',
    'EdgeBox_Command',
    'Inverter_Reg_Addr',
    'Inverter_Reg_Addr2',
    'Inverter_Remote_direction',
    'Inverter_Remote_AlarmReset',
    'Control_Pump_Stop',
    'Control_Pump_Forward',
    'Control_Pump_Backward',
    'control_master_off',
    'client_data_1',
    'client_data_2',
    'Grid_Price_Rate',
    'Diesel_Price_Rate',
    'ChangeApn',
    'Change_Cloud_Credential',
    'Reset_Box',
    // Legacy commands for backward compatibility
    'START_PUMP',
    'STOP_PUMP', 
    'SET_FREQUENCY',
    'SET_MOTOR_SPEED',
    'ENABLE_AUTO_MODE',
    'DISABLE_AUTO_MODE',
    'RESTART_SYSTEM',
    'SHUTDOWN_SYSTEM'
  ]),
  action: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  payload: z.object({
    raw: z.object({
      type: z.string(),
      title: z.string(),
      status: z.number(),
      severity: z.number(),
      propagate: z.boolean()
    })
  }).optional(),
  timestamp: z.string(),
  expiresAt: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM')
});

// Command acknowledgment schema
const CommandAckSchema = z.object({
  commandId: z.string(),
  deviceId: z.string(),
  status: z.enum(['RECEIVED', 'EXECUTING', 'COMPLETED', 'FAILED', 'TIMEOUT']),
  message: z.string().optional(),
  timestamp: z.string(),
  executionData: z.record(z.any()).optional()
});

export type DeviceCommand = z.infer<typeof DeviceCommandSchema>;
export type CommandAck = z.infer<typeof CommandAckSchema>;

export class MQTTCommandPublisher {
  private mqttClient!: MqttClient;
  private isConnected = false;
  private commandQueue: Map<string, DeviceCommand> = new Map();
  private pendingCommands: Map<string, NodeJS.Timeout> = new Map();
  
  // Configuration
  private readonly API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
  private readonly API_ADMIN_TOKEN = process.env.API_ADMIN_TOKEN;
  private readonly COMMAND_TIMEOUT_MS = parseInt(process.env.COMMAND_TIMEOUT_MS || '300000'); // 5 minutes
  private readonly MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_COMMAND_RETRIES || '3');

  constructor() {
    this.initializeMQTTClient();
  }

  private initializeMQTTClient(): void {
    const MQTT_BROKER_HOST = process.env.MQTT_BROKER_HOST || 'localhost';
    const MQTT_BROKER_PORT = parseInt(process.env.MQTT_BROKER_PORT || '1883');
    const MQTT_USERNAME = process.env.MQTT_USERNAME || 'lifebox_ingestion';
    const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
    const MQTT_CLIENT_ID = `lifebox-command-publisher-${process.pid}`;

    const mqttBrokerUrl = `mqtt://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`;
    
    logger.info({ brokerUrl: mqttBrokerUrl, clientId: MQTT_CLIENT_ID }, 'Connecting MQTT Command Publisher to broker');

    this.mqttClient = connect(mqttBrokerUrl, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clientId: MQTT_CLIENT_ID,
      keepalive: 60,
      reconnectPeriod: 5000,
      connectTimeout: 30 * 1000,
      clean: true,
    });

    this.setupMQTTEventHandlers();
  }

  private setupMQTTEventHandlers(): void {
    this.mqttClient.on('connect', () => {
      logger.info('MQTT Command Publisher connected to broker');
      this.isConnected = true;
      
      // Subscribe to command acknowledgment topics
      this.mqttClient.subscribe('devices/+/commands/ack', (err) => {
        if (err) {
          logger.error({ err }, 'Failed to subscribe to command acknowledgment topics');
        } else {
          logger.info('Subscribed to command acknowledgment topics');
        }
      });

      // Subscribe to device status for command validation
      this.mqttClient.subscribe('devices/+/status', (err) => {
        if (err) {
          logger.error({ err }, 'Failed to subscribe to device status topics');
        } else {
          logger.info('Subscribed to device status topics');
        }
      });
    });

    this.mqttClient.on('message', (topic: string, payload: Buffer) => {
      this.handleIncomingMessage(topic, payload);
    });

    this.mqttClient.on('error', (error) => {
      logger.error({ error }, 'MQTT Command Publisher error');
      this.isConnected = false;
    });

    this.mqttClient.on('reconnect', () => {
      logger.info('MQTT Command Publisher reconnecting...');
    });

    this.mqttClient.on('disconnect', () => {
      logger.warn('MQTT Command Publisher disconnected');
      this.isConnected = false;
    });

    this.mqttClient.on('offline', () => {
      logger.warn('MQTT Command Publisher offline');
      this.isConnected = false;
    });
  }

  private async handleIncomingMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const topicParts = topic.split('/');
      const deviceId = topicParts[1];
      const messageType = topicParts[2];

      if (!deviceId) {
        logger.warn({ topic }, 'Could not extract device ID from topic');
        return;
      }

      const rawPayload = JSON.parse(payload.toString());

      if (messageType === 'commands' && topicParts[3] === 'ack') {
        // Handle command acknowledgment
        await this.handleCommandAcknowledgment(deviceId, rawPayload);
      } else if (messageType === 'status') {
        // Handle device status updates
        await this.handleDeviceStatusUpdate(deviceId, rawPayload);
      }

    } catch (error) {
      logger.error({
        topic,
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: payload.toString().substring(0, 200)
      }, 'Failed to process MQTT command message');
    }
  }

  private async handleCommandAcknowledgment(deviceId: string, payload: any): Promise<void> {
    try {
      const validation = CommandAckSchema.safeParse(payload);
      
      if (!validation.success) {
        logger.warn({
          deviceId,
          errors: validation.error.errors,
          payload
        }, 'Invalid command acknowledgment format');
        return;
      }

      const ack = validation.data;
      logger.info({
        deviceId,
        commandId: ack.commandId,
        status: ack.status,
        message: ack.message
      }, 'Received command acknowledgment');

      // Clear timeout for this command
      const timeoutId = this.pendingCommands.get(ack.commandId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.pendingCommands.delete(ack.commandId);
      }

      // Remove from command queue if completed or failed
      if (['COMPLETED', 'FAILED', 'TIMEOUT'].includes(ack.status)) {
        this.commandQueue.delete(ack.commandId);
      }

      // Update command status in API
      await this.updateCommandStatusInAPI(ack);

    } catch (error) {
      logger.error({
        deviceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to handle command acknowledgment');
    }
  }

  private async handleDeviceStatusUpdate(deviceId: string, payload: any): Promise<void> {
    try {
      logger.debug({ deviceId, status: payload }, 'Received device status update');
      
      // Here you can implement device status validation logic
      // For example, check if device is online before sending commands
      
    } catch (error) {
      logger.error({
        deviceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to handle device status update');
    }
  }

  public async publishCommand(command: DeviceCommand): Promise<boolean> {
    try {
      // Validate command
      const validation = DeviceCommandSchema.safeParse(command);
      if (!validation.success) {
        logger.error({
          errors: validation.error.errors,
          command
        }, 'Invalid command format');
        return false;
      }

      const validCommand = validation.data;

      // Check if MQTT client is connected
      if (!this.isConnected) {
        logger.error({ commandId: validCommand.commandId }, 'MQTT client not connected, cannot publish command');
        return false;
      }

      // Check if command has expired
      if (validCommand.expiresAt && new Date(validCommand.expiresAt) < new Date()) {
        logger.warn({ commandId: validCommand.commandId }, 'Command has expired, not publishing');
        return false;
      }

      const topic = `devices/${validCommand.deviceId}/commands`;
      const payload = JSON.stringify(validCommand);

      // Publish command to MQTT
      return new Promise((resolve) => {
        this.mqttClient.publish(topic, payload, { qos: 1, retain: false }, (error) => {
          if (error) {
            logger.error({
              commandId: validCommand.commandId,
              deviceId: validCommand.deviceId,
              error: error.message
            }, 'Failed to publish command to MQTT');
            resolve(false);
          } else {
            logger.info({
              commandId: validCommand.commandId,
              deviceId: validCommand.deviceId,
              commandType: validCommand.type,
              topic
            }, 'Command published to MQTT successfully');

            // Add to command queue and set timeout
            this.commandQueue.set(validCommand.commandId, validCommand);
            this.setCommandTimeout(validCommand);
            resolve(true);
          }
        });
      });

    } catch (error) {
      logger.error({
        command,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to publish command');
      return false;
    }
  }

  private setCommandTimeout(command: DeviceCommand): void {
    const timeoutId = setTimeout(async () => {
      logger.warn({
        commandId: command.commandId,
        deviceId: command.deviceId,
        commandType: command.type
      }, 'Command timeout - no acknowledgment received');

      // Remove from pending commands
      this.pendingCommands.delete(command.commandId);

      // Create timeout acknowledgment
      const timeoutAck: CommandAck = {
        commandId: command.commandId,
        deviceId: command.deviceId,
        status: 'TIMEOUT',
        message: 'Command timed out - no response from device',
        timestamp: new Date().toISOString()
      };

      // Update status in API
      await this.updateCommandStatusInAPI(timeoutAck);

      // Remove from command queue
      this.commandQueue.delete(command.commandId);

    }, this.COMMAND_TIMEOUT_MS);

    this.pendingCommands.set(command.commandId, timeoutId);
  }

  private async updateCommandStatusInAPI(ack: CommandAck): Promise<void> {
    try {
      await axios.patch(
        `${this.API_BASE_URL}/devices/${ack.deviceId}/commands/${ack.commandId}/status`,
        {
          status: ack.status,
          message: ack.message,
          executionData: ack.executionData,
          acknowledgedAt: ack.timestamp
        },
        {
          headers: {
            'Authorization': `Bearer ${this.API_ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info({
        commandId: ack.commandId,
        deviceId: ack.deviceId,
        status: ack.status
      }, 'Command status updated in API');

    } catch (error) {
      logger.error({
        commandId: ack.commandId,
        deviceId: ack.deviceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to update command status in API');
    }
  }

  public getQueueStatus(): { queueSize: number, pendingCommands: number } {
    return {
      queueSize: this.commandQueue.size,
      pendingCommands: this.pendingCommands.size
    };
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down MQTT Command Publisher...');

    // Clear all timeouts
    for (const timeoutId of this.pendingCommands.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingCommands.clear();

    // Disconnect MQTT client
    if (this.mqttClient) {
      this.mqttClient.end(false, {}, () => {
        logger.info('MQTT Command Publisher disconnected');
      });
    }

    logger.info('MQTT Command Publisher shutdown complete');
  }
}