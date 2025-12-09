import { FastifyInstance } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { ChatService, ChatRoomType } from '../services/chat.service';
import { PrismaClient } from '@prisma/client';
import { parseJsonArray, stringifyJsonArray } from '../utils/array-helpers';

export interface ChatMessageDto {
  roomId: string;
  message: string;
}

export interface DirectMessageDto {
  targetUserId: number;
  message: string;
}

export interface WhisperDto {
  username: string;
  message: string;
}

export interface JoinRoomDto {
  roomId: string;
}

export interface ToggleIgnoreDto {
  username: string;
}

export interface FriendActionDto {
  username: string;
  message?: string;
}

export interface InviteDto {
  username: string;
  type: 'game' | 'tournament';
}

export interface JoinSessionDto {
  username: string;
}

export interface ViewProfileDto {
  username: string;
}

export interface SetDndDto {
  enabled: boolean;
}

// Extended chat state tracking
interface UserChatState {
  dndEnabled: boolean;
  ignoredUsers: Set<number>;
  activeWhispers: Set<number>; // Users who whispered before DND
}

export async function setupChatWebSocket(
  fastify: FastifyInstance,
  chatService: ChatService
) {
  const prisma = fastify.prisma as PrismaClient;
  const connectionManager = (fastify as any).connectionManager;
  const gameService = (fastify as any).gameService;
  const tournamentService = (fastify as any).tournamentService;

  // Track user chat states
  const userChatStates = new Map<number, UserChatState>();

  const getUserChatState = (userId: number): UserChatState => {
    let state = userChatStates.get(userId);
    if (!state) {
      state = {
        dndEnabled: false,
        ignoredUsers: new Set(),
        activeWhispers: new Set(),
      };
      userChatStates.set(userId, state);
    }
    return state;
  };

  // Helper to get user by username
  const getUserByUsername = async (username: string) => {
    return prisma.user.findFirst({
      where: {
        username: {
          equals: username,
        },
      },
    });
  };

  // Helper to check if user is ignoring another
  const isIgnoring = (userId: number, targetId: number): boolean => {
    const state = userChatStates.get(userId);
    return state?.ignoredUsers.has(targetId) || false;
  };

  // Helper to check DND status
  const isDndEnabled = (userId: number): boolean => {
    const state = userChatStates.get(userId);
    return state?.dndEnabled || false;
  };

  // Helper to check if whisper is allowed (not DND or in active list)
  const canWhisper = (fromUserId: number, toUserId: number): boolean => {
    const targetState = userChatStates.get(toUserId);
    if (!targetState?.dndEnabled) return true;
    return targetState.activeWhispers.has(fromUserId);
  };

  return {
    handleChatMessage: async (
      userId: number,
      username: string,
      avatar: string,
      message: any,
      socket: WebSocket
    ) => {
      try {
        switch (message.event) {
          // ==================== ROOM MANAGEMENT ====================
          
          case 'chat:join-room': {
            const { roomId } = message.data as JoinRoomDto;
            
            if (!roomId) {
              throw new Error('Room ID is required');
            }

            try {
              chatService.joinRoom(userId, roomId);
              
              socket.send(JSON.stringify({
                event: 'chat:joined',
                data: { roomId, success: true },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'chat:leave-room': {
            const { roomId } = message.data as JoinRoomDto;
            
            if (!roomId) {
              throw new Error('Room ID is required');
            }

            chatService.leaveRoom(userId, roomId);
            
            socket.send(JSON.stringify({
              event: 'chat:left',
              data: { roomId, success: true },
            }));
            break;
          }

          // ==================== MESSAGING ====================

          case 'chat:send-message': {
            const { roomId, message: text } = message.data as ChatMessageDto;
            
            if (!roomId || !text) {
              throw new Error('Room ID and message are required');
            }

            if (text.length > 500) {
              throw new Error('Message too long (max 500 characters)');
            }

            try {
              const chatMessage = chatService.sendMessage(
                roomId,
                userId,
                username,
                avatar,
                text
              );

              socket.send(JSON.stringify({
                event: 'chat:sent',
                data: { success: true, messageId: chatMessage.id },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'chat:send-dm': {
            const { targetUserId, message: text } = message.data as DirectMessageDto;
            
            if (!targetUserId || !text) {
              throw new Error('Target user ID and message are required');
            }

            if (text.length > 500) {
              throw new Error('Message too long (max 500 characters)');
            }

            // Check if target is ignoring sender
            if (isIgnoring(targetUserId, userId)) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: 'User is ignoring you.' },
              }));
              return;
            }

            // Check DND status
            if (!canWhisper(userId, targetUserId)) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: "Hello, I'm using Do Not Disturb mode. Please contact me later." },
              }));
              return;
            }

            // Add to active whispers for both users
            const senderState = getUserChatState(userId);
            const targetState = getUserChatState(targetUserId);
            senderState.activeWhispers.add(targetUserId);
            targetState.activeWhispers.add(userId);

            const dmMessage = chatService.sendDirectMessage(
              userId,
              username,
              avatar,
              targetUserId,
              text
            );

            socket.send(JSON.stringify({
              event: 'chat:dm-sent',
              data: { success: true, messageId: dmMessage.id },
            }));
            break;
          }

          // ==================== WHISPER BY USERNAME ====================

          case 'chat:whisper': {
            const { username: targetUsername, message: text } = message.data as WhisperDto;
            
            if (!targetUsername || !text) {
              throw new Error('Username and message are required');
            }

            if (text.length > 500) {
              throw new Error('Message too long (max 500 characters)');
            }

            const targetUser = await getUserByUsername(targetUsername);
            if (!targetUser) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: `User "${targetUsername}" not found` },
              }));
              return;
            }

            if (targetUser.id === userId) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: 'Cannot whisper to yourself' },
              }));
              return;
            }

            // Check if target is ignoring sender
            if (isIgnoring(targetUser.id, userId)) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: 'User is ignoring you.' },
              }));
              return;
            }

            // Check DND status
            if (!canWhisper(userId, targetUser.id)) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: "Hello, I'm using Do Not Disturb mode. Please contact me later." },
              }));
              return;
            }

            // Add to active whispers
            const senderState = getUserChatState(userId);
            const targetState = getUserChatState(targetUser.id);
            senderState.activeWhispers.add(targetUser.id);
            targetState.activeWhispers.add(userId);

            const dmMessage = chatService.sendDirectMessage(
              userId,
              username,
              avatar,
              targetUser.id,
              text
            );

            // Also send whisper tab info to sender
            socket.send(JSON.stringify({
              event: 'chat:whisper-sent',
              data: {
                success: true,
                messageId: dmMessage.id,
                targetUserId: targetUser.id,
                targetUsername: targetUser.username,
              },
            }));
            break;
          }

          // ==================== IGNORE SYSTEM ====================

          case 'chat:toggle-ignore': {
            const { username: targetUsername } = message.data as ToggleIgnoreDto;
            
            if (!targetUsername) {
              throw new Error('Username is required');
            }

            const targetUser = await getUserByUsername(targetUsername);
            if (!targetUser) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: `User "${targetUsername}" not found` },
              }));
              return;
            }

            if (targetUser.id === userId) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: 'Cannot ignore yourself' },
              }));
              return;
            }

            const state = getUserChatState(userId);
            const isNowIgnored = !state.ignoredUsers.has(targetUser.id);
            
            if (isNowIgnored) {
              state.ignoredUsers.add(targetUser.id);
            } else {
              state.ignoredUsers.delete(targetUser.id);
            }

            socket.send(JSON.stringify({
              event: 'chat:ignore-updated',
              data: {
                userId: targetUser.id,
                username: targetUser.username,
                ignored: isNowIgnored,
              },
            }));

            socket.send(JSON.stringify({
              event: 'chat:system',
              data: {
                roomId: 'global',
                message: isNowIgnored 
                  ? `You are now ignoring ${targetUser.username}`
                  : `You are no longer ignoring ${targetUser.username}`,
                timestamp: new Date(),
              },
            }));
            break;
          }

          // ==================== FRIEND SYSTEM ====================

          case 'chat:friend-add': {
            const { username: targetUsername, message: friendMessage } = message.data as FriendActionDto;
            
            if (!targetUsername) {
              throw new Error('Username is required');
            }

            const targetUser = await getUserByUsername(targetUsername);
            if (!targetUser) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: `User "${targetUsername}" not found` },
              }));
              return;
            }

            if (targetUser.id === userId) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: 'Cannot add yourself as friend' },
              }));
              return;
            }

            // Check if target is ignoring sender
            if (isIgnoring(targetUser.id, userId)) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: 'User is not accepting invitations.' },
              }));
              return;
            }

            // Get current user's friends list
            const currentUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { friends: true },
            });

            if (!currentUser) return;

            const friendsList = parseJsonArray(currentUser.friends);
            
            if (friendsList.includes(targetUser.id)) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: `${targetUser.username} is already your friend` },
              }));
              return;
            }

            // Add to friends list
            friendsList.push(targetUser.id);
            await prisma.user.update({
              where: { id: userId },
              data: { friends: stringifyJsonArray(friendsList) },
            });

            // Add current user to target's friends list
            const targetUserData = await prisma.user.findUnique({
              where: { id: targetUser.id },
              select: { friends: true },
            });

            if (targetUserData) {
              const targetFriendsList = parseJsonArray(targetUserData.friends);
              if (!targetFriendsList.includes(userId)) {
                targetFriendsList.push(userId);
                await prisma.user.update({
                  where: { id: targetUser.id },
                  data: { friends: stringifyJsonArray(targetFriendsList) },
                });
              }
            }

            socket.send(JSON.stringify({
              event: 'chat:friend-request-sent',
              data: {
                userId: targetUser.id,
                username: targetUser.username,
              },
            }));

            // Notify target user
            connectionManager.emitToUser(targetUser.id, 'chat:friend-added', {
              userId,
              username,
              message: friendMessage || '',
            });
            break;
          }

          case 'chat:friend-remove': {
            const { username: targetUsername } = message.data as FriendActionDto;
            
            if (!targetUsername) {
              throw new Error('Username is required');
            }

            const targetUser = await getUserByUsername(targetUsername);
            if (!targetUser) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: `User "${targetUsername}" not found` },
              }));
              return;
            }

            // Remove from friends list
            const currentUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { friends: true },
            });

            if (!currentUser) return;

            const friendsList = parseJsonArray(currentUser.friends);
            const newFriendsList = friendsList.filter((id: number) => id !== targetUser.id);
            
            await prisma.user.update({
              where: { id: userId },
              data: { friends: stringifyJsonArray(newFriendsList) },
            });

            // Also remove from target's friends list
            const targetUserData = await prisma.user.findUnique({
              where: { id: targetUser.id },
              select: { friends: true },
            });

            if (targetUserData) {
              const targetFriendsList = parseJsonArray(targetUserData.friends);
              const newTargetFriendsList = targetFriendsList.filter((id: number) => id !== userId);
              await prisma.user.update({
                where: { id: targetUser.id },
                data: { friends: stringifyJsonArray(newTargetFriendsList) },
              });
            }

            socket.send(JSON.stringify({
              event: 'chat:friend-removed',
              data: {
                userId: targetUser.id,
                username: targetUser.username,
              },
            }));
            break;
          }

          // ==================== INVITE SYSTEM ====================

          case 'chat:invite': {
            const { username: targetUsername, type } = message.data as InviteDto;
            
            if (!targetUsername) {
              throw new Error('Username is required');
            }

            const targetUser = await getUserByUsername(targetUsername);
            if (!targetUser) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: `User "${targetUsername}" not found` },
              }));
              return;
            }

            if (targetUser.id === userId) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: 'Cannot invite yourself' },
              }));
              return;
            }

            // Check if target is ignoring sender
            if (isIgnoring(targetUser.id, userId)) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: 'User is not accepting invitations.' },
              }));
              return;
            }

            // Check DND
            if (isDndEnabled(targetUser.id)) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: 'User has Do Not Disturb enabled.' },
              }));
              return;
            }

            if (type === 'tournament') {
              // Find user's active tournament
              const userTournaments = tournamentService?.getUserTournaments(userId);
              const activeTournament = userTournaments?.find(
                (t: any) => t.status === 'registration' && t.creatorId === userId
              );

              if (!activeTournament) {
                socket.send(JSON.stringify({
                  event: 'chat:error',
                  data: { message: 'You do not have an open tournament to invite to' },
                }));
                return;
              }

              // Send tournament invite
              connectionManager.emitToUser(targetUser.id, 'chat:invite-received', {
                type: 'tournament',
                fromUserId: userId,
                fromUsername: username,
                id: activeTournament.id,
                name: activeTournament.name,
              });
            } else {
              // Game invite - create private game if not in one
              const currentGameId = gameService?.getUserGameId(userId);
              
              connectionManager.emitToUser(targetUser.id, 'chat:invite-received', {
                type: 'game',
                fromUserId: userId,
                fromUsername: username,
                gameId: currentGameId,
              });
            }

            socket.send(JSON.stringify({
              event: 'chat:invite-sent',
              data: {
                userId: targetUser.id,
                username: targetUser.username,
                type,
              },
            }));
            break;
          }

          // ==================== JOIN SESSION ====================

          case 'chat:join-session': {
            const { username: targetUsername } = message.data as JoinSessionDto;
            
            if (!targetUsername) {
              throw new Error('Username is required');
            }

            const targetUser = await getUserByUsername(targetUsername);
            if (!targetUser) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: `User "${targetUsername}" not found` },
              }));
              return;
            }

            // Check if target is in a game
            const targetGameId = gameService?.getUserGameId(targetUser.id);
            if (targetGameId) {
              // Try to join as spectator or player 2
              socket.send(JSON.stringify({
                event: 'chat:join-game',
                data: { gameId: targetGameId, username: targetUser.username },
              }));
              return;
            }

            // Check if target is in a tournament
            const targetTournaments = tournamentService?.getUserTournaments(targetUser.id);
            const openTournament = targetTournaments?.find(
              (t: any) => t.status === 'registration'
            );

            if (openTournament) {
              socket.send(JSON.stringify({
                event: 'chat:join-tournament',
                data: { tournamentId: openTournament.id, name: openTournament.name },
              }));
              return;
            }

            socket.send(JSON.stringify({
              event: 'chat:error',
              data: { message: `${targetUser.username} is not in an active session` },
            }));
            break;
          }

          // ==================== VIEW PROFILE ====================

          case 'chat:view-profile': {
            const { username: targetUsername } = message.data as ViewProfileDto;
            
            if (!targetUsername) {
              throw new Error('Username is required');
            }

            const targetUser = await getUserByUsername(targetUsername);
            if (!targetUser) {
              socket.send(JSON.stringify({
                event: 'chat:error',
                data: { message: `User "${targetUsername}" not found` },
              }));
              return;
            }

            socket.send(JSON.stringify({
              event: 'chat:profile-data',
              data: {
                userId: targetUser.id,
                username: targetUser.username,
                avatar: targetUser.avatar,
                score: targetUser.score,
                rank: targetUser.rank,
                gamesPlayed: targetUser.gamesPlayed,
                gamesWon: targetUser.gamesWon,
                winRate: targetUser.winRate,
              },
            }));
            break;
          }

          // ==================== DND MODE ====================

          case 'chat:set-dnd': {
            const { enabled } = message.data as SetDndDto;
            
            const state = getUserChatState(userId);
            state.dndEnabled = enabled;

            if (enabled) {
              // Don't clear active whispers - existing conversations continue
            } else {
              // Clear active whispers when disabling DND
              state.activeWhispers.clear();
            }

            socket.send(JSON.stringify({
              event: 'chat:dnd-updated',
              data: { enabled },
            }));

            socket.send(JSON.stringify({
              event: 'chat:system',
              data: {
                roomId: 'global',
                message: enabled 
                  ? 'Do Not Disturb mode enabled. New whispers will receive an auto-response.'
                  : 'Do Not Disturb mode disabled.',
                timestamp: new Date(),
              },
            }));
            break;
          }

          // ==================== HISTORY & ROOMS ====================

          case 'chat:get-history': {
            const { roomId } = message.data as JoinRoomDto;
            
            if (!roomId) {
              throw new Error('Room ID is required');
            }

            chatService.sendRoomHistory(userId, roomId);
            break;
          }

          case 'chat:get-rooms': {
            const userRooms = chatService.getUserRooms(userId);
            const rooms = userRooms.map(roomId => {
              const room = chatService.getRoomById(roomId);
              return {
                id: room?.id,
                name: room?.name,
                type: room?.type,
                memberCount: chatService.getRoomMemberCount(roomId),
              };
            });

            socket.send(JSON.stringify({
              event: 'chat:rooms',
              data: { rooms },
            }));
            break;
          }

          case 'chat:create-room': {
            const { name, type } = message.data as { name: string; type: ChatRoomType };
            
            if (!name || !type) {
              throw new Error('Name and type are required');
            }

            const roomId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const room = chatService.createRoom(roomId, type, name);
            chatService.joinRoom(userId, roomId);

            socket.send(JSON.stringify({
              event: 'chat:room-created',
              data: { roomId, name, type },
            }));
            break;
          }

          case 'chat:broadcast': {
            const { message: text } = message.data as { message: string };
            
            if (!text) {
              throw new Error('Message is required');
            }

            chatService.broadcastToRoom('global', 'chat:broadcast', {
              from: username,
              message: text,
              timestamp: new Date(),
            });

            socket.send(JSON.stringify({
              event: 'chat:broadcast-sent',
              data: { success: true },
            }));
            break;
          }

          default:
            fastify.log.warn(`Unknown chat event: ${message.event}`);
        }
      } catch (error: any) {
        fastify.log.error({ err: error }, 'Chat message handling error');
        socket.send(JSON.stringify({
          event: 'chat:error',
          data: { message: error.message },
        }));
      }
    },

    // Cleanup when user disconnects
    handleDisconnect: (userId: number) => {
      chatService.leaveAllRooms(userId);
      // Don't clear chat state - preserve ignore list and DND for session
    },
  };
}
