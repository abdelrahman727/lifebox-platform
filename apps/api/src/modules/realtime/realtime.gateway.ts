// src/modules/realtime/realtime.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  clientId?: string;
  role?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          role: true,
          client: {
            select: {
              id: true,
              name: true,
              organizationName: true,
            },
          },
        },
      });

      if (!user) {
        this.logger.warn(`Client ${client.id} connection rejected: Invalid user`);
        client.disconnect();
        return;
      }

      // Store user info in socket
      client.userId = user.id;
      client.clientId = user.clientId;
      client.role = user.role.name;

      // Add to connected clients map
      this.connectedClients.set(client.id, client);

      // Join client-specific room
      if (client.clientId) {
        client.join(`client:${client.clientId}`);
      }

      // Join role-specific room for admins
      if (client.role === 'super_user' || client.role === 'admin') {
        client.join('admins');
      }

      this.logger.log(
        `Client ${client.id} connected - User: ${user.email}, Client: ${user.client?.name || 'N/A'}, Role: ${client.role}`,
      );

      // Send connection success
      client.emit('connection:success', {
        message: 'Connected to real-time service',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role.name,
        },
        client: user.client,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Subscribe to device telemetry
  @SubscribeMessage('telemetry:subscribe')
  async handleSubscribeTelemetry(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deviceIds?: string[]; all?: boolean }
  ) {
    try {
      if (!client.clientId) {
        client.emit('error', { message: 'Client ID not found' });
        return;
      }

      // Verify device access
      let devices;
      if (data.all && (client.role === 'super_user' || client.role === 'admin')) {
        // Admin can subscribe to all devices
        devices = await this.prisma.device.findMany({
          select: { id: true, deviceCode: true, deviceName: true, clientId: true },
        });
      } else if (data.deviceIds) {
        // Subscribe to specific devices (check access)
        devices = await this.prisma.device.findMany({
          where: {
            id: { in: data.deviceIds },
            ...(client.role !== 'super_user' && client.role !== 'admin' 
              ? { clientId: client.clientId } 
              : {}
            ),
          },
          select: { id: true, deviceCode: true, deviceName: true, clientId: true },
        });
      } else {
        // Subscribe to all client devices
        devices = await this.prisma.device.findMany({
          where: { clientId: client.clientId },
          select: { id: true, deviceCode: true, deviceName: true, clientId: true },
        });
      }

      // Join device-specific rooms
      for (const device of devices) {
        client.join(`device:${device.id}`);
      }

      client.emit('telemetry:subscribed', {
        devices: devices.map(d => ({
          id: d.id,
          code: d.deviceCode,
          name: d.deviceName,
        })),
        timestamp: new Date(),
      });

      this.logger.log(`Client ${client.id} subscribed to ${devices.length} devices`);

    } catch (error) {
      this.logger.error(`Telemetry subscription error: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to telemetry' });
    }
  }

  // Unsubscribe from device telemetry
  @SubscribeMessage('telemetry:unsubscribe')
  async handleUnsubscribeTelemetry(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deviceIds?: string[]; all?: boolean }
  ) {
    try {
      if (data.all) {
        // Leave all device rooms
        const rooms = Array.from(client.rooms).filter(room => room.startsWith('device:'));
        rooms.forEach(room => client.leave(room));
        client.emit('telemetry:unsubscribed', { all: true, timestamp: new Date() });
      } else if (data.deviceIds) {
        // Leave specific device rooms
        data.deviceIds.forEach(deviceId => client.leave(`device:${deviceId}`));
        client.emit('telemetry:unsubscribed', { deviceIds: data.deviceIds, timestamp: new Date() });
      }

      this.logger.log(`Client ${client.id} unsubscribed from telemetry`);
    } catch (error) {
      this.logger.error(`Telemetry unsubscription error: ${error.message}`);
      client.emit('error', { message: 'Failed to unsubscribe from telemetry' });
    }
  }

  // Subscribe to alarms
  @SubscribeMessage('alarms:subscribe')
  async handleSubscribeAlarms(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { severity?: string[]; deviceIds?: string[] }
  ) {
    try {
      if (!client.clientId && client.role !== 'super_user' && client.role !== 'admin') {
        client.emit('error', { message: 'Access denied to alarms' });
        return;
      }

      // Join alarm rooms based on access level
      if (client.role === 'super_user' || client.role === 'admin') {
        client.join('alarms:global');
      } else {
        client.join(`alarms:client:${client.clientId}`);
      }

      // Join severity-specific rooms if specified
      if (data.severity) {
        data.severity.forEach(severity => {
          client.join(`alarms:severity:${severity}`);
        });
      }

      client.emit('alarms:subscribed', {
        message: 'Subscribed to alarms',
        scope: client.role === 'super_user' || client.role === 'admin' ? 'global' : 'client',
        severityFilters: data.severity || [],
        timestamp: new Date(),
      });

      this.logger.log(`Client ${client.id} subscribed to alarms`);

    } catch (error) {
      this.logger.error(`Alarm subscription error: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to alarms' });
    }
  }

  // Get connected clients count (Admin only)
  @SubscribeMessage('system:stats')
  async handleSystemStats(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.role !== 'super_user' && client.role !== 'admin') {
      client.emit('error', { message: 'Access denied' });
      return;
    }

    const stats = {
      connectedClients: this.connectedClients.size,
      activeRooms: this.server.sockets.adapter.rooms.size,
      timestamp: new Date(),
    };

    client.emit('system:stats', stats);
  }

  // Broadcast telemetry data to subscribed clients
  broadcastTelemetry(deviceId: string, telemetryData: any) {
    this.server.to(`device:${deviceId}`).emit('telemetry:data', {
      deviceId,
      data: telemetryData,
      timestamp: new Date(),
    });
  }

  // Broadcast alarm to subscribed clients
  broadcastAlarm(alarm: any) {
    // Broadcast to global admin room
    this.server.to('alarms:global').emit('alarm:new', alarm);
    
    // Broadcast to client-specific room
    if (alarm.clientId) {
      this.server.to(`alarms:client:${alarm.clientId}`).emit('alarm:new', alarm);
    }
    
    // Broadcast to severity-specific room
    if (alarm.severity) {
      this.server.to(`alarms:severity:${alarm.severity}`).emit('alarm:new', alarm);
    }
  }

  // Broadcast credit alerts
  broadcastCreditAlert(clientId: string, creditAlert: any) {
    this.server.to(`client:${clientId}`).emit('credit:alert', creditAlert);
    this.server.to('admins').emit('credit:alert', creditAlert);
  }

  // Broadcast device status changes
  broadcastDeviceStatus(deviceId: string, status: any) {
    this.server.to(`device:${deviceId}`).emit('device:status', {
      deviceId,
      status,
      timestamp: new Date(),
    });
  }

  // Broadcast system notifications
  broadcastSystemNotification(notification: any, targetRole?: string) {
    if (targetRole) {
      // Broadcast to specific role
      this.connectedClients.forEach((client) => {
        if (client.role === targetRole) {
          client.emit('system:notification', notification);
        }
      });
    } else {
      // Broadcast to all connected clients
      this.server.emit('system:notification', notification);
    }
  }

  // Generic broadcast to room/channel
  broadcastToRoom(room: string, event: string, data: any) {
    if (room === 'admin') {
      // Broadcast to all admin users
      this.connectedClients.forEach((client) => {
        if (client.role === 'super_user' || client.role === 'admin') {
          client.emit(event, data);
        }
      });
    } else if (room.startsWith('client-')) {
      // Broadcast to specific client users
      const clientId = room.replace('client-', '');
      this.connectedClients.forEach((client) => {
        if (client.clientId === clientId) {
          client.emit(event, data);
        }
      });
    } else if (room.startsWith('device-')) {
      // Broadcast to users who have access to specific device
      const deviceId = room.replace('device-', '');
      this.connectedClients.forEach((client) => {
        // For now, broadcast to all connected clients
        // TODO: Implement device-specific access control
        client.emit(event, data);
      });
    } else {
      // Broadcast to all connected clients
      this.server.emit(event, data);
    }
  }

  // Get client connection info
  getConnectedClientInfo(): Array<{ clientId: string; userId: string; role: string; connectedAt: Date }> {
    return Array.from(this.connectedClients.values()).map(client => ({
      clientId: client.clientId || '',
      userId: client.userId || '',
      role: client.role || '',
      connectedAt: new Date(),
    }));
  }
}