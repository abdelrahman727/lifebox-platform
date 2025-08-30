import pino from 'pino';
import { MQTTCommandPublisher, DeviceCommand } from './command-publisher';
import { CommandQueue } from './command-queue';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export class MQTTCommandService {
  private commandPublisher: MQTTCommandPublisher;
  private commandQueue: CommandQueue;
  private isRunning = false;
  private processingLoop: NodeJS.Timeout | null = null;

  constructor() {
    this.commandPublisher = new MQTTCommandPublisher();
    this.commandQueue = new CommandQueue();
  }

  /**
   * Start the command processing service
   */
  public async start(): Promise<void> {
    logger.info('Starting MQTT Command Service...');
    
    this.isRunning = true;
    
    // Start the command processing loop
    this.startCommandProcessingLoop();
    
    logger.info('MQTT Command Service started successfully');
  }

  /**
   * Stop the command processing service
   */
  public async stop(): Promise<void> {
    logger.info('Stopping MQTT Command Service...');
    
    this.isRunning = false;
    
    // Stop processing loop
    if (this.processingLoop) {
      clearTimeout(this.processingLoop);
      this.processingLoop = null;
    }
    
    // Shutdown components
    await Promise.all([
      this.commandPublisher.shutdown(),
      this.commandQueue.shutdown()
    ]);
    
    logger.info('MQTT Command Service stopped');
  }

  /**
   * Main command processing loop
   */
  private startCommandProcessingLoop(): void {
    const processCommands = async () => {
      try {
        if (!this.isRunning) {
          return;
        }

        // Get next command from queue (5 second timeout)
        const command = await this.commandQueue.dequeuePriorityCommand(5);
        
        if (command) {
          await this.processCommand(command);
        }

      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Error in command processing loop');
      } finally {
        // Schedule next iteration
        if (this.isRunning) {
          this.processingLoop = setTimeout(processCommands, 1000); // 1 second interval
        }
      }
    };

    // Start the processing loop
    processCommands();
  }

  /**
   * Process a single command
   */
  private async processCommand(command: DeviceCommand): Promise<void> {
    try {
      logger.info({
        commandId: command.commandId,
        deviceId: command.deviceId,
        type: command.type,
        priority: command.priority
      }, 'Processing command');

      // Check if command has expired
      if (command.expiresAt && new Date(command.expiresAt) < new Date()) {
        logger.warn({
          commandId: command.commandId,
          expiresAt: command.expiresAt
        }, 'Command expired, marking as failed');

        await this.commandQueue.markCommandFailed(
          command.commandId,
          'Command expired before processing',
          false // Don't retry expired commands
        );
        return;
      }

      // Publish command to MQTT
      const success = await this.commandPublisher.publishCommand(command);
      
      if (success) {
        // Mark as completed in queue (command publisher will handle acknowledgments)
        await this.commandQueue.markCommandCompleted(command.commandId);
        
        logger.info({
          commandId: command.commandId,
          deviceId: command.deviceId
        }, 'Command published successfully');
      } else {
        // Mark as failed and retry if appropriate
        const shouldRetry = command.priority === 'HIGH' || command.priority === 'CRITICAL';
        
        await this.commandQueue.markCommandFailed(
          command.commandId,
          'Failed to publish command to MQTT',
          shouldRetry
        );
        
        logger.error({
          commandId: command.commandId,
          deviceId: command.deviceId,
          willRetry: shouldRetry
        }, 'Failed to publish command');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error({
        commandId: command.commandId,
        error: errorMessage
      }, 'Error processing command');

      await this.commandQueue.markCommandFailed(
        command.commandId,
        errorMessage,
        true // Retry on processing errors
      );
    }
  }

  /**
   * Add a command to the processing queue
   */
  public async enqueueCommand(command: DeviceCommand): Promise<boolean> {
    try {
      logger.info({
        commandId: command.commandId,
        deviceId: command.deviceId,
        type: command.type,
        priority: command.priority
      }, 'Enqueuing command for processing');

      return await this.commandQueue.enqueueCommand(command);

    } catch (error) {
      logger.error({
        commandId: command.commandId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to enqueue command');

      return false;
    }
  }

  /**
   * Get service statistics
   */
  public async getServiceStats(): Promise<{
    commandService: {
      isRunning: boolean;
      queueStats: {
        queueSize: number;
        processingCount: number;
        failedCount: number;
      };
      publisherStats: {
        queueSize: number;
        pendingCommands: number;
      };
    };
  }> {
    try {
      const [queueStats, publisherStats] = await Promise.all([
        this.commandQueue.getQueueStats(),
        Promise.resolve(this.commandPublisher.getQueueStatus())
      ]);

      return {
        commandService: {
          isRunning: this.isRunning,
          queueStats,
          publisherStats
        }
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to get service stats');

      return {
        commandService: {
          isRunning: this.isRunning,
          queueStats: { queueSize: 0, processingCount: 0, failedCount: 0 },
          publisherStats: { queueSize: 0, pendingCommands: 0 }
        }
      };
    }
  }

  /**
   * Health check for the command service
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      commandService: boolean;
      commandQueue: boolean;
      mqttPublisher: boolean;
    };
  }> {
    try {
      const stats = await this.getServiceStats();
      
      return {
        healthy: this.isRunning,
        details: {
          commandService: this.isRunning,
          commandQueue: true, // If we can get stats, queue is working
          mqttPublisher: stats.commandService.publisherStats.queueSize !== -1 // Simple check
        }
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Health check failed');

      return {
        healthy: false,
        details: {
          commandService: false,
          commandQueue: false,
          mqttPublisher: false
        }
      };
    }
  }

  /**
   * Cleanup expired commands periodically
   */
  public async performMaintenance(): Promise<void> {
    try {
      logger.debug('Performing command service maintenance...');
      
      await this.commandQueue.cleanupExpiredCommands();
      
      // Log current stats
      const stats = await this.getServiceStats();
      logger.info(stats, 'Command service maintenance completed');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Command service maintenance failed');
    }
  }

  /**
   * Mark a command as completed
   */
  public async markCommandCompleted(commandId: string): Promise<void> {
    await this.commandQueue.markCommandCompleted(commandId);
  }

  /**
   * Mark a command as failed
   */
  public async markCommandFailed(commandId: string, reason: string, shouldRetry: boolean = false): Promise<void> {
    await this.commandQueue.markCommandFailed(commandId, reason, shouldRetry);
  }
}