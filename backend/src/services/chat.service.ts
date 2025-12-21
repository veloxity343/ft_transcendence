import { ConnectionManager } from '../websocket/connection.manager';

export enum ChatRoomType {
  GLOBAL = 'global',
  GAME = 'game',
  PRIVATE = 'private',
  SPECTATOR = 'spectator',
  LOBBY = 'lobby',
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: number;
  username: string;
  userAvatar: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'notification';
}

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  name: string;
  members: Set<number>;
  createdAt: Date;
  maxMessages?: number;
  messages: ChatMessage[];
}

export class ChatService {
  private rooms = new Map<string, ChatRoom>();
  private userRooms = new Map<number, Set<string>>(); // Track which rooms each user is in
  private messageHistory = new Map<string, ChatMessage[]>();
  
  constructor(private connectionManager: ConnectionManager) {
    // Create global chat room
    this.createRoom('global', ChatRoomType.GLOBAL, 'Global Chat');
  }

  // ==================== ROOM MANAGEMENT ====================

  createRoom(
    roomId: string,
    type: ChatRoomType,
    name: string,
    maxMessages: number = 100
  ): ChatRoom {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const room: ChatRoom = {
      id: roomId,
      type,
      name,
      members: new Set(),
      createdAt: new Date(),
      maxMessages,
      messages: [],
    };

    this.rooms.set(roomId, room);
    return room;
  }

  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove all members
    room.members.forEach(userId => {
      this.leaveRoom(userId, roomId);
    });

    this.rooms.delete(roomId);
    this.messageHistory.delete(roomId);
    return true;
  }

  getRoomById(roomId: string): ChatRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomsByType(type: ChatRoomType): ChatRoom[] {
    return Array.from(this.rooms.values()).filter(room => room.type === type);
  }

  // ==================== MEMBER MANAGEMENT ====================

  joinRoom(userId: number, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    room.members.add(userId);

    // Track user's rooms
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId)!.add(roomId);

    // Send join notification
    this.sendSystemMessage(
      roomId,
      `User joined the chat`,
      userId
    );

    // Send room history to new member
    this.sendRoomHistory(userId, roomId);

    return true;
  }

  leaveRoom(userId: number, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.members.delete(userId);

    // Update user's rooms
    const userRooms = this.userRooms.get(userId);
    if (userRooms) {
      userRooms.delete(roomId);
      if (userRooms.size === 0) {
        this.userRooms.delete(userId);
      }
    }

    // Send leave notification
    this.sendSystemMessage(
      roomId,
      `User left the chat`,
      userId
    );

    return true;
  }

  leaveAllRooms(userId: number): void {
    const userRooms = this.userRooms.get(userId);
    if (!userRooms) return;

    userRooms.forEach(roomId => {
      this.leaveRoom(userId, roomId);
    });
  }

  getUserRooms(userId: number): string[] {
    return Array.from(this.userRooms.get(userId) || []);
  }

  isUserInRoom(userId: number, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    return room?.members.has(userId) || false;
  }

  // ==================== MESSAGING ====================

  sendMessage(
    roomId: string,
    userId: number,
    username: string,
    userAvatar: string,
    messageText: string
  ): ChatMessage {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (!room.members.has(userId)) {
      throw new Error(`User ${userId} is not in room ${roomId}`);
    }

    const message: ChatMessage = {
      id: this.generateMessageId(),
      roomId,
      userId,
      username,
      userAvatar,
      message: messageText,
      timestamp: new Date(),
      type: 'message',
    };

    // Add to room history
    room.messages.push(message);

    // Trim history if needed
    if (room.maxMessages && room.messages.length > room.maxMessages) {
      room.messages = room.messages.slice(-room.maxMessages);
    }

    // Broadcast to all room members
    this.broadcastToRoom(roomId, 'chat:message', message);

    return message;
  }

  sendSystemMessage(
    roomId: string,
    messageText: string,
    aboutUserId?: number
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const message: ChatMessage = {
      id: this.generateMessageId(),
      roomId,
      userId: 0, // System user
      username: 'System',
      userAvatar: '',
      message: messageText,
      timestamp: new Date(),
      type: 'system',
    };

    room.messages.push(message);

    this.broadcastToRoom(roomId, 'chat:system', message);
  }

  sendDirectMessage(
    fromUserId: number,
    fromUsername: string,
    fromAvatar: string,
    toUserId: number,
    toUsername: string,
    toAvatar: string,
    messageText: string
  ): ChatMessage {
    // Create or get private room between users
    const roomId = this.getPrivateRoomId(fromUserId, toUserId);
    
    let room = this.rooms.get(roomId);
    if (!room) {
      room = this.createRoom(
        roomId,
        ChatRoomType.PRIVATE,
        `DM: ${fromUserId}-${toUserId}`
      );
      room.members.add(fromUserId);
      room.members.add(toUserId);
    }

    if (!this.userRooms.has(fromUserId)) {
      this.userRooms.set(fromUserId, new Set());
    }
    if (!this.userRooms.has(toUserId)) {
      this.userRooms.set(toUserId, new Set());
    }
    this.userRooms.get(fromUserId)!.add(roomId);
    this.userRooms.get(toUserId)!.add(roomId);

    const message: ChatMessage = {
      id: this.generateMessageId(),
      roomId,
      userId: fromUserId,
      username: fromUsername,
      userAvatar: fromAvatar,
      message: messageText,
      timestamp: new Date(),
      type: 'message',
    };

    room.messages.push(message);

    // Send to both users with recipient info included
    this.connectionManager.emitToUser(fromUserId, 'chat:dm', {
      ...message,
      toUserId,
      toUsername,
      toAvatar,
    });
    
    this.connectionManager.emitToUser(toUserId, 'chat:dm', {
      ...message,
      toUserId,
      toUsername,
      toAvatar,
    });

    return message;
  }

  // ==================== ROOM BROADCASTING ====================

  broadcastToRoom(roomId: string, event: string, data: any): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.members.forEach(userId => {
      this.connectionManager.emitToUser(userId, event, data);
    });
  }

  sendToUser(userId: number, event: string, data: any): void {
    this.connectionManager.emitToUser(userId, event, data);
  }

  // ==================== HISTORY ====================

  sendRoomHistory(userId: number, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.connectionManager.emitToUser(userId, 'chat:history', {
      roomId,
      messages: room.messages,
    });
  }

  getRoomMessages(roomId: string, limit?: number): ChatMessage[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    if (limit) {
      return room.messages.slice(-limit);
    }
    return [...room.messages];
  }

  clearRoomHistory(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.messages = [];
    }
  }

  // ==================== GAME INTEGRATION ====================

  createGameRoom(gameId: number): string {
    const roomId = `game-${gameId}`;
    this.createRoom(roomId, ChatRoomType.GAME, `Game ${gameId}`);
    return roomId;
  }

  createSpectatorRoom(gameId: number): string {
    const roomId = `spectator-${gameId}`;
    this.createRoom(roomId, ChatRoomType.SPECTATOR, `Spectating Game ${gameId}`);
    return roomId;
  }

  deleteGameRoom(gameId: number): void {
    this.deleteRoom(`game-${gameId}`);
    this.deleteRoom(`spectator-${gameId}`);
  }

  createTournamentRoom(tournamentId: number): string {
    const roomId = `tournament-${tournamentId}`;
    this.createRoom(roomId, ChatRoomType.LOBBY, `Tournament ${tournamentId}`);
    return roomId;
  }

  deleteTournamentRoom(tournamentId: number): void {
    this.deleteRoom(`tournament-${tournamentId}`);
  }

  // ==================== UTILITIES ====================

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPrivateRoomId(userId1: number, userId2: number): string {
    const [lower, higher] = [userId1, userId2].sort((a, b) => a - b);
    return `dm-${lower}-${higher}`;
  }

  // ==================== STATS ====================

  getRoomMemberCount(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room?.members.size || 0;
  }

  getTotalRooms(): number {
    return this.rooms.size;
  }

  getActiveRooms(): ChatRoom[] {
    return Array.from(this.rooms.values()).filter(
      room => room.members.size > 0
    );
  }

  // ==================== MODERATION ====================

  muteUser(roomId: string, userId: number): void {
    // Implementation depends on your moderation system
    // Could store muted users per room
    this.sendSystemMessage(roomId, `User has been muted`, userId);
  }

  kickUser(roomId: string, userId: number): void {
    this.leaveRoom(userId, roomId);
    this.sendSystemMessage(roomId, `User has been kicked`, userId);
  }
}
