import { FastifyInstance } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { ChatService, ChatRoomType } from '../services/chat.service';

export interface ChatMessageDto {
  roomId: string;
  message: string;
}

export interface DirectMessageDto {
  targetUserId: number;
  message: string;
}

export interface JoinRoomDto {
  roomId: string;
}

export async function setupChatWebSocket(
  fastify: FastifyInstance,
  chatService: ChatService
) {

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

            // Generate unique room ID
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
            // Global broadcast (might want to restrict to admins)
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
  };
}
