import pino from 'pino';
import { DeviceCommand } from './command-publisher';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

interface QueuedCommand {
  command: DeviceCommand;
  enqueuedAt: Date;
  retryCount: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRY';
}

export class CommandQueue {
  private commandQueue: Map<string, QueuedCommand> = new Map();
  private processingQueue: Map<string, QueuedCommand> = new Map();
  private failedQueue: Map<string, QueuedCommand> = new Map();
  private priorityQueues: { [key: string]: string[] } = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };
  private isConnected = true; // Always connected for in-memory

  constructor() {
    logger.info('Initialized in-memory command queue');
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    // Clean up expired commands every 5 minutes
    setInterval(() => {
      this.cleanupExpiredCommands();
    }, 5 * 60 * 1000);
  }

  /**
   * Add a command to the queue for processing
   */
  public async enqueueCommand(command: DeviceCommand): Promise<boolean> {
    try {
      const queuedCommand: QueuedCommand = {
        command,
        enqueuedAt: new Date(),
        retryCount: 0,
        status: 'QUEUED'
      };

      // Store command
      this.commandQueue.set(command.commandId, queuedCommand);

      // Add to priority queue
      const priority = command.priority || 'MEDIUM';
      this.priorityQueues[priority]?.push(command.commandId);

      logger.info({
        commandId: command.commandId,
        deviceId: command.deviceId,
        type: command.type,
        priority: command.priority
      }, 'Command enqueued successfully');

      return true;

    } catch (error) {
      logger.error({
        commandId: command.commandId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to enqueue command');
      return false;
    }
  }

  /**
   * Get next command from queue (non-blocking operation)
   */
  public async dequeueCommand(timeoutSeconds = 5): Promise<DeviceCommand | null> {
    try {
      // Check priority queues in order
      for (const priority of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
        const commandIds = this.priorityQueues[priority];
        if (commandIds && commandIds.length > 0) {
          const commandId = commandIds.shift()!; // Remove from priority queue
          const queuedCommand = this.commandQueue.get(commandId);

          if (queuedCommand && queuedCommand.status === 'QUEUED') {
            // Move to processing
            queuedCommand.status = 'PROCESSING';
            this.processingQueue.set(commandId, queuedCommand);

            logger.info({
              commandId: queuedCommand.command.commandId,
              deviceId: queuedCommand.command.deviceId,
              type: queuedCommand.command.type
            }, 'Command dequeued for processing');

            return queuedCommand.command;
          }
        }
      }

      return null; // No commands available

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to dequeue command');
      return null;
    }
  }

  /**
   * Mark command as completed and remove from processing
   */
  public async markCommandCompleted(commandId: string): Promise<void> {
    try {
      const queuedCommand = this.processingQueue.get(commandId);
      
      if (queuedCommand) {
        queuedCommand.status = 'COMPLETED';
        // Remove from processing and main queue
        this.processingQueue.delete(commandId);
        this.commandQueue.delete(commandId);
        
        logger.info({ commandId }, 'Command marked as completed');
      } else {
        logger.warn({ commandId }, 'Command not found in processing queue');
      }

    } catch (error) {
      logger.error({
        commandId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to mark command as completed');
    }
  }

  /**
   * Mark command as failed and optionally retry
   */
  public async markCommandFailed(commandId: string, errorMessage: string, retry = false): Promise<void> {
    try {
      const queuedCommand = this.processingQueue.get(commandId) || this.commandQueue.get(commandId);

      if (!queuedCommand) {
        logger.warn({ commandId }, 'Command not found for failure');
        return;
      }

      queuedCommand.retryCount += 1;

      // Remove from processing queue
      this.processingQueue.delete(commandId);

      if (retry && queuedCommand.retryCount < 3) {
        // Re-queue for retry
        queuedCommand.status = 'RETRY';
        const priority = queuedCommand.command.priority || 'MEDIUM';
        this.priorityQueues[priority]?.push(commandId);
        
        logger.info({
          commandId,
          retryCount: queuedCommand.retryCount,
          errorMessage
        }, 'Command marked for retry');
      } else {
        // Move to failed queue
        queuedCommand.status = 'FAILED';
        this.failedQueue.set(commandId, queuedCommand);
        this.commandQueue.delete(commandId);
        
        logger.error({
          commandId,
          retryCount: queuedCommand.retryCount,
          errorMessage
        }, 'Command marked as failed');
      }

    } catch (error) {
      logger.error({
        commandId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to mark command as failed');
    }
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(): Promise<{
    queueSize: number;
    processingCount: number;
    failedCount: number;
  }> {
    try {
      const totalQueueSize = Object.values(this.priorityQueues).reduce(
        (sum, queue) => sum + queue.length, 0
      );
      
      return {
        queueSize: totalQueueSize,
        processingCount: this.processingQueue.size,
        failedCount: this.failedQueue.size
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to get queue stats');
      
      return { queueSize: 0, processingCount: 0, failedCount: 0 };
    }
  }

  /**
   * Clear expired commands from processing queue
   */
  public async cleanupExpiredCommands(): Promise<void> {
    try {
      const now = new Date();
      const expiredCommands: string[] = [];
      
      // Check for expired commands (older than 1 hour)
      for (const [commandId, queuedCommand] of this.commandQueue) {
        const commandAge = now.getTime() - queuedCommand.enqueuedAt.getTime();
        if (commandAge > 60 * 60 * 1000) { // 1 hour
          expiredCommands.push(commandId);
        }
      }
      
      // Remove expired commands
      for (const commandId of expiredCommands) {
        this.commandQueue.delete(commandId);
        this.processingQueue.delete(commandId);
        
        // Remove from priority queues
        for (const priority of Object.keys(this.priorityQueues)) {
          const index = this.priorityQueues[priority]?.indexOf(commandId) ?? -1;
          if (index > -1) {
            this.priorityQueues[priority]?.splice(index, 1);
          }
        }
      }
      
      if (expiredCommands.length > 0) {
        logger.info({ expiredCount: expiredCommands.length }, 'Cleaned up expired commands');
      }
      
      const stats = await this.getQueueStats();
      logger.debug(stats, 'Command queue cleanup completed');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to cleanup expired commands');
    }
  }

  /**
   * Priority queue management - get commands by priority
   */
  public async dequeuePriorityCommand(timeoutSeconds = 5): Promise<DeviceCommand | null> {
    // This method is the same as dequeueCommand since we already handle priorities there
    return this.dequeueCommand(timeoutSeconds);
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down in-memory command queue...');
    
    // Clear all queues
    this.commandQueue.clear();
    this.processingQueue.clear();
    this.failedQueue.clear();
    
    // Clear priority queues
    for (const priority of Object.keys(this.priorityQueues)) {
      this.priorityQueues[priority] = [];
    }
    
    logger.info('In-memory command queue shutdown complete');
  }
}