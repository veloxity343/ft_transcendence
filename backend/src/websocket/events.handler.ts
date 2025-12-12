import { FastifyInstance } from 'fastify';
import { ConnectionManager, UserStatus } from './connection.manager';
import { GameService } from '../services/game.service';
import { UserService } from '../services/user.service';
import { ChatService } from '../services/chat.service';
import { TournamentService } from '../services/tournament.service';
import { AIOpponentService } from '../services/ai.service';
import { setupGameWebSocket } from './game.websocket';
import { setupChatWebSocket } from './chat.websocket';
import { setupTournamentWebSocket } from './tournament.websocket';

export async function websocketHandler(fastify: FastifyInstance) {
  const connectionManager = fastify.connectionManager;
  const chatService = fastify.chatService;
  const gameService = fastify.gameService;
  const tournamentService = fastify.tournamentService;
  const aiOpponentService = fastify.aiOpponentService;
  const userService = new UserService(fastify.prisma);

  // Setup game WebSocket handlers
  const gameWebSocket = await setupGameWebSocket(
    fastify,
    gameService,
    aiOpponentService
  );

  // Setup chat WebSocket handlers
  const chatWebSocket = await setupChatWebSocket(
    fastify,
    chatService
  );

  // Setup tournament WebSocket handlers
  const tournamentWebSocket = await setupTournamentWebSocket(
    fastify,
    tournamentService
  );

  fastify.get('/ws', { websocket: true }, (connection, request) => {
    // The connection object IS the WebSocket
    const ws = connection;

    // Extract token from query or headers
    const token = (request.query as any).token || 
                  request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      ws.close(1008, 'No token provided');
      return;
    }

    // Verify JWT
    let userId: number;
    let userEmail: string;
    try {
      const decoded = fastify.jwt.verify(token) as any;
      userId = decoded.sub;
      userEmail = decoded.email;
    } catch (err) {
      ws.close(1008, 'Invalid token');
      return;
    }

    // Add connection immediately
    connectionManager.addConnection(userId, ws);
    fastify.log.info(`User ${userId} connected to WebSocket`);

    // Get user info for chat
    let userInfo: { username: string; avatar: string } | null = null;
    
    const userInfoPromise = userService.getUser(userId).then(user => {
      userInfo = { username: user.username, avatar: user.avatar || '' };
      
      // Auto-join global chat
      try {
        chatService.joinRoom(userId, 'global');
      } catch (error) {
        // Already in room, that's fine
      }
      return userInfo;
    }).catch(err => {
      fastify.log.error({ err }, 'Failed to get user info');
      return { username: `User${userId}`, avatar: '' };
    });

    // Send connection confirmation
    ws.send(JSON.stringify({
      event: 'connected',
      data: { userId },
    }));

    // Broadcast status update
    connectionManager.broadcast('user-statuses-updated', connectionManager.getAllStatuses());

    // Handle messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Route game-related messages to game handler
        if (message.event && message.event.startsWith('game:')) {
          await gameWebSocket.handleGameMessage(userId, message, ws);
          return;
        }

        // Route chat-related messages to chat handler
        if (message.event && message.event.startsWith('chat:')) {
          if (!userInfo) {
            userInfo = await userInfoPromise;
          }
          await chatWebSocket.handleChatMessage(userId, userInfo.username, userInfo.avatar, message, ws);
          return;
        }

        // Route tournament-related messages to tournament handler
        if (message.event && message.event.startsWith('tournament:')) {
          if (!userInfo) {
            userInfo = await userInfoPromise;
          }
          await tournamentWebSocket.handleTournamentMessage(userId, userInfo.username, message, ws);
          return;
        }

        // Handle other WebSocket events
        switch (message.event) {
          case 'update-status':
            connectionManager.setStatus(userId, message.data.status);
            connectionManager.broadcast('user-statuses-updated', connectionManager.getAllStatuses());
            break;

          case 'get-online-users':
            ws.send(JSON.stringify({
              event: 'online-users',
              data: {
                onlineUsers: connectionManager.getOnlineUsers(),
                statuses: connectionManager.getAllStatuses(),
              },
            }));
            break;

          case 'send-notification':
            connectionManager.emitToUser(message.data.targetUserId, 'notification', {
              from: userId,
              message: message.data.message,
              type: message.data.type,
              timestamp: new Date(),
            });
            break;

          case 'user:refresh-info':
            userService.getUser(userId).then(user => {
              userInfo = { username: user.username, avatar: user.avatar || '' };
              ws.send(JSON.stringify({
                event: 'user:info-updated',
                data: { username: userInfo.username, avatar: userInfo.avatar },
              }));
            }).catch(err => {
              fastify.log.error({ err }, 'Failed to refresh user info');
            });
            break;

          default:
            fastify.log.warn(`Unknown event: ${message.event}`);
        }
      } catch (err: any) {
        fastify.log.error({ err }, 'WebSocket message error');
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      // Handle game disconnection
      gameService.handleDisconnect(userId);
      
      // Handle chat disconnection
      chatService.leaveAllRooms(userId);
      
      // Remove connection
      connectionManager.removeConnection(userId);
      fastify.log.info(`User ${userId} disconnected from WebSocket`);
      connectionManager.broadcast('user-statuses-updated', connectionManager.getAllStatuses());
    });

    ws.on('error', (err: any) => {
      fastify.log.error({ err }, 'WebSocket error');
    });
  });
}

// Extend Fastify types to include our services
declare module 'fastify' {
  interface FastifyInstance {
    connectionManager: ConnectionManager;
    chatService: ChatService;
    gameService: GameService;
    tournamentService: TournamentService;
    aiOpponentService: AIOpponentService;
  }
}
