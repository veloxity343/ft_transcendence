import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConnectionService } from '../connection/connection.service';
import { UserStatus } from '../types';
import { JoinRoomDto, LeaveRoomDto, UpdateStatusDto } from '../dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONT_URL || 'http://localhost:5173',
    credentials: true,
  },
})
@UsePipes(new ValidationPipe())
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private connectionService: ConnectionService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ==================== CONNECTION HANDLERS ====================

  async handleConnection(client: Socket) {
    try {
      // Increase max listeners to prevent warnings
      client.setMaxListeners(20);

      // Extract token from handshake
      const token = client.handshake.headers.authorization?.replace('Bearer ', '') ||
                    client.handshake.auth?.token ||
                    client.handshake.headers.token;

      if (!token) {
        throw new WsException('No authentication token provided');
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('jwt.secret'),
      });

      const userId = payload.sub;

      if (!userId) {
        throw new WsException('Invalid token payload');
      }

      // Store userId in socket data
      client.data.userId = userId;

      // Add connection
      this.connectionService.addConnection(userId, client);

      // Broadcast updated status to all clients
      this.broadcastUserStatuses();

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      this.connectionService.removeConnection(userId);
      this.broadcastUserStatuses();
      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }

    client.removeAllListeners();
  }

  // ==================== STATUS MANAGEMENT ====================

  @SubscribeMessage('update-status')
  handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdateStatusDto,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    this.connectionService.setUserStatus(userId, dto.status);
    this.broadcastUserStatuses();

    return { success: true, status: dto.status };
  }

  @SubscribeMessage('get-online-users')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    const onlineUsers = this.connectionService.getOnlineUsers();
    const statuses = this.connectionService.getAllUserStatuses();

    return {
      onlineUsers,
      statuses: Array.from(statuses.entries()).map(([id, status]) => ({
        userId: id,
        status,
      })),
    };
  }

  // ==================== ROOM MANAGEMENT ====================

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    this.connectionService.joinRoom(userId, dto.roomName);
    client.join(dto.roomName);

    this.logger.debug(`User ${userId} joined room: ${dto.roomName}`);

    return { success: true, room: dto.roomName };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LeaveRoomDto,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    this.connectionService.leaveRoom(userId, dto.roomName);
    client.leave(dto.roomName);

    this.logger.debug(`User ${userId} left room: ${dto.roomName}`);

    return { success: true, room: dto.roomName };
  }

  // ==================== MESSAGING ====================

  @SubscribeMessage('send-notification')
  handleSendNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: number; message: string; type: string },
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    const targetSocket = this.connectionService.getSocket(data.targetUserId);

    if (targetSocket) {
      targetSocket.emit('notification', {
        from: userId,
        message: data.message,
        type: data.type,
        timestamp: new Date(),
      });
    }

    return { success: true, delivered: !!targetSocket };
  }

  @SubscribeMessage('broadcast-to-room')
  handleBroadcastToRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomName: string; event: string; payload: any },
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    this.server.to(data.roomName).emit(data.event, {
      from: userId,
      ...data.payload,
      timestamp: new Date(),
    });

    return { success: true };
  }

  // ==================== UTILITY METHODS ====================

  private broadcastUserStatuses() {
    const statuses = this.connectionService.getAllUserStatuses();
    const statusArray = Array.from(statuses.entries()).map(([userId, status]) => ({
      userId,
      status,
    }));

    this.server.emit('user-statuses-updated', statusArray);
  }

  // Public methods for other modules to use

  public setUserStatus(userId: number, status: UserStatus) {
    this.connectionService.setUserStatus(userId, status);
    this.broadcastUserStatuses();
  }

  public emitToUser(userId: number, event: string, data: any) {
    const socket = this.connectionService.getSocket(userId);
    
    if (socket) {
      socket.emit(event, data);
    }
  }

  public emitToRoom(roomName: string, event: string, data: any) {
    this.server.to(roomName).emit(event, data);
  }

  public isUserOnline(userId: number): boolean {
    return this.connectionService.isUserConnected(userId);
  }

  public getUserStatus(userId: number): UserStatus {
    return this.connectionService.getUserStatus(userId);
  }

  public addUserToRoom(userId: number, roomName: string) {
    this.connectionService.joinRoom(userId, roomName);
  }

  public removeUserFromRoom(userId: number, roomName: string) {
    this.connectionService.leaveRoom(userId, roomName);
  }
}
