/**
 * Websocket Connection Manager
 * Manages all active websocket connections and user presence status
 * Provides event system for broadcasting and targeted messaging
 */
import { WebSocket } from '@fastify/websocket';

/** User online status */
export enum UserStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  IN_GAME = 'in_game',
}

/** Active websocket connection with metadata */
interface Connection {
  userId: number;
  socket: WebSocket;
  status: UserStatus;
  connectedAt: Date;
}

/**
 * Manages websocket connections and user presence
 * Ensures single connection per user (new connection replaces old)
 * Provides event system for internal comms between services
 */
export class ConnectionManager {
  private connections = new Map<number, Connection>();
  private socketToUser = new Map<WebSocket, number>();
  private eventHandlers = new Map<string, Set<Function>>();

  /**
   * Add or replace user's websocket connection
   * Old connection is automatically closed when user reconnects
   */
  addConnection(userId: number, socket: WebSocket) {
    // Remove old connection if exists
    this.removeConnection(userId);

    this.connections.set(userId, {
      userId,
      socket,
      status: UserStatus.ONLINE,
      connectedAt: new Date(),
    });

    this.socketToUser.set(socket, userId);
  }

  /** Remove connection by user ID */
  removeConnection(userId: number) {
    const conn = this.connections.get(userId);
    if (conn) {
      this.socketToUser.delete(conn.socket);
      this.connections.delete(userId);
    }
  }

  removeBySocket(socket: WebSocket): number | null {
    const userId = this.socketToUser.get(socket);
    if (userId) {
      this.removeConnection(userId);
      return userId;
    }
    return null;
  }

  /**
   * Register event handler for internal events
   * Used by services to listen for cross-service events
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  setStatus(userId: number, status: UserStatus) {
    const conn = this.connections.get(userId);
    if (conn) {
      conn.status = status;
    }
  }

  getStatus(userId: number): UserStatus {
    return this.connections.get(userId)?.status || UserStatus.OFFLINE;
  }

  getSocket(userId: number): WebSocket | undefined {
    return this.connections.get(userId)?.socket;
  }

  isConnected(userId: number): boolean {
    return this.connections.has(userId);
  }

  getAllStatuses(): Array<{ userId: number; status: UserStatus }> {
    return Array.from(this.connections.values()).map(conn => ({
      userId: conn.userId,
      status: conn.status,
    }));
  }

  getOnlineUsers(): number[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Broadcast event to all connected users
   * Also triggers internal event handlers for cross-service comms
   */
  broadcast(event: string, data: any): void {
    const message = JSON.stringify({ event, data });
    this.connections.forEach(conn => {
      conn.socket.send(message);
    });

    // Trigger internal event handlers
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Send event to a specific user
   * Fails silently if user is not connected or socket is closed
   */
  emitToUser(userId: number, event: string, data: any) {
    const socket = this.getSocket(userId);
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify({ event, data }));
    }
  }
}
