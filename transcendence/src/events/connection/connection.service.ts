import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { UserStatus } from '../types';

interface ConnectedUser {
  userId: number;
  socket: Socket;
  status: UserStatus;
  connectedAt: Date;
}

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);
  private connections = new Map<number, ConnectedUser>();
  private socketToUser = new Map<string, number>();

  // ==================== CONNECTION MANAGEMENT ====================

  addConnection(userId: number, socket: Socket): void {
    // Remove old connection if exists
    this.removeConnection(userId);

    this.connections.set(userId, {
      userId,
      socket,
      status: UserStatus.ONLINE,
      connectedAt: new Date(),
    });

    this.socketToUser.set(socket.id, userId);

    this.logger.log(`User ${userId} connected (socket: ${socket.id})`);
  }

  removeConnection(userId: number): void {
    const connection = this.connections.get(userId);
    
    if (connection) {
      this.socketToUser.delete(connection.socket.id);
      this.connections.delete(userId);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  removeBySocketId(socketId: string): number | null {
    const userId = this.socketToUser.get(socketId);
    
    if (userId) {
      this.removeConnection(userId);
      return userId;
    }
    
    return null;
  }

  // ==================== STATUS MANAGEMENT ====================

  setUserStatus(userId: number, status: UserStatus): void {
    const connection = this.connections.get(userId);
    
    if (connection) {
      connection.status = status;
      this.logger.debug(`User ${userId} status set to ${status}`);
    }
  }

  getUserStatus(userId: number): UserStatus {
    const connection = this.connections.get(userId);
    return connection?.status || UserStatus.OFFLINE;
  }

  getAllUserStatuses(): Map<number, UserStatus> {
    const statuses = new Map<number, UserStatus>();
    
    this.connections.forEach((connection, userId) => {
      statuses.set(userId, connection.status);
    });
    
    return statuses;
  }

  // ==================== SOCKET RETRIEVAL ====================

  getSocket(userId: number): Socket | null {
    return this.connections.get(userId)?.socket || null;
  }

  getUserIdBySocket(socketId: string): number | null {
    return this.socketToUser.get(socketId) || null;
  }

  isUserConnected(userId: number): boolean {
    return this.connections.has(userId);
  }

  // ==================== ROOM MANAGEMENT ====================

  joinRoom(userId: number, roomName: string): void {
    const socket = this.getSocket(userId);
    
    if (socket) {
      socket.join(roomName);
      this.logger.debug(`User ${userId} joined room: ${roomName}`);
    }
  }

  leaveRoom(userId: number, roomName: string): void {
    const socket = this.getSocket(userId);
    
    if (socket) {
      socket.leave(roomName);
      this.logger.debug(`User ${userId} left room: ${roomName}`);
    }
  }

  // ==================== STATISTICS ====================

  getOnlineUsers(): number[] {
    return Array.from(this.connections.keys());
  }

  getOnlineCount(): number {
    return this.connections.size;
  }

  getConnectionInfo(userId: number): ConnectedUser | null {
    return this.connections.get(userId) || null;
  }
}
