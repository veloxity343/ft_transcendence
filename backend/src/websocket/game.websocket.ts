import { FastifyInstance } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { GameService } from '../services/game.service';
import { AIOpponentService } from '../services/ai.service';

export async function setupGameWebSocket(
  fastify: FastifyInstance,
  gameService: GameService,
  aiOpponentService: AIOpponentService,
) {

  // Helper to emit to user
  const emitToUser = (userId: number, event: string, data: any) => {
    const socket = gameService['connectionManager'].getSocket(userId);
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify({ event, data }));
    }
  };

  return {
    handleGameMessage: async (userId: number, message: any, socket: WebSocket) => {
      try {
        switch (message.event) {
          case 'game:join-matchmaking': {
            try {
              const playerInfo = await gameService.joinMatchmaking(userId);
              socket.send(JSON.stringify({
                event: 'game:joined',
                data: playerInfo,
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'game:create-ai': {
            try {
              const { difficulty } = message.data || {};
              
              if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
                throw new Error('Invalid difficulty. Must be easy, medium, or hard');
              }

              const gameInfo = await aiOpponentService.createAIGame(
                userId,
                difficulty || 'medium'
              );

              socket.send(JSON.stringify({
                event: 'game:ai-created',
                data: {
                  ...gameInfo,
                  difficulty: difficulty || 'medium',
                },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'game:create-private': {
            try {
              const playerInfo = await gameService.createPrivateGame(userId);
              socket.send(JSON.stringify({
                event: 'game:created',
                data: playerInfo,
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'game:join-private': {
            try {
              if (!message.data || typeof message.data.gameId !== 'number') {
                throw new Error('Invalid gameId');
              }

              const playerInfo = await gameService.joinPrivateGame(
                userId,
                message.data.gameId
              );
              
              socket.send(JSON.stringify({
                event: 'game:joined',
                data: playerInfo,
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'game:create-local': {
            try {
                const { player1Name, player2Name } = message.data || {};
                
                const playerInfo = await gameService.createLocalGame(
                    userId,
                    player1Name || 'Player 1',
                    player2Name || 'Player 2'
                );
                
                socket.send(JSON.stringify({
                    event: 'game:created',
                    data: playerInfo,
                }));
            } catch (error: any) {
                socket.send(JSON.stringify({
                    event: 'game:error',
                    data: { message: error.message },
                }));
            }
            break;
          }

          case 'game:send-invitation': {
            try {
              if (!message.data || typeof message.data.targetUserId !== 'number') {
                throw new Error('Invalid targetUserId');
              }

              // Create private game
              const playerInfo = await gameService.createPrivateGame(userId);

              // Get user info for invitation
              const user = await fastify.prisma.user.findUnique({
                where: { id: userId },
                select: { username: true },
              });

              // Send invitation to target user
              emitToUser(message.data.targetUserId, 'game-invitation', {
                from: userId,
                gameId: playerInfo.gameId,
                inviterName: user?.username || 'Unknown',
              });

              socket.send(JSON.stringify({
                event: 'game:invitation-sent',
                data: { success: true, gameId: playerInfo.gameId },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'game:move': {
            try {
              if (!message.data || 
                  typeof message.data.gameId !== 'number' ||
                  typeof message.data.direction !== 'number') {
                throw new Error('Invalid move data');
              }

              gameService.movePaddle(
                userId,
                message.data.gameId,
                message.data.direction,
                message.data.playerNumber
              );

              // Send acknowledgment
              socket.send(JSON.stringify({
                event: 'game:move-ack',
                data: { success: true },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'game:spectate': {
            try {
              if (!message.data || typeof message.data.gameId !== 'number') {
                throw new Error('Invalid gameId');
              }

              const gameState = await gameService.spectateGame(message.data.gameId);

              if (!gameState) {
                throw new Error('Game not found or not in progress');
              }

              // Send game state
              socket.send(JSON.stringify({
                event: 'game:spectate-started',
                data: gameState,
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'game:get-active': {
            try {
              const activeGames = gameService.getActiveGames();
              socket.send(JSON.stringify({
                event: 'game:active-games',
                data: activeGames,
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'game:leave': {
            try {
              gameService.leaveGame(userId);
              // Note: The service will send 'game:left-with-reconnect' for in-progress games
              // or we send 'game:left' for non-in-progress games
              socket.send(JSON.stringify({
                event: 'game:left',
                data: { success: true },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          // ==================== FORFEIT ====================
          case 'game:forfeit': {
            try {
              const result = gameService.forfeitGame(userId);
              
              if (result.success) {
                socket.send(JSON.stringify({
                  event: 'game:forfeited',
                  data: { success: true },
                }));
              } else {
                socket.send(JSON.stringify({
                  event: 'game:error',
                  data: { message: result.error || 'Failed to forfeit' },
                }));
              }
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          // ==================== REJOIN ====================
          case 'game:rejoin': {
            try {
              const { gameId } = message.data || {};
              
              if (!gameId || typeof gameId !== 'number') {
                throw new Error('Invalid gameId');
              }

              const playerInfo = await gameService.rejoinGame(userId, gameId);
              
              if (playerInfo) {
                // Get current game state for the rejoining player
                const gameState = await gameService.spectateGame(gameId);
                const gameInfo = gameService.getGameInfo(gameId);
                
                socket.send(JSON.stringify({
                  event: 'game:rejoined',
                  data: {
                    ...playerInfo,
                    gameState,
                    player1Name: gameInfo?.player1Name,
                    player2Name: gameInfo?.player2Name,
                  },
                }));
              } else {
                socket.send(JSON.stringify({
                  event: 'game:error',
                  data: { message: 'Cannot rejoin game - game ended or timeout expired' },
                }));
              }
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          // ==================== NEW: CHECK RECONNECTABLE ====================
          case 'game:check-reconnectable': {
            try {
              const reconnectable = gameService.getReconnectableGame(userId);
              
              socket.send(JSON.stringify({
                event: 'game:reconnectable-game',
                data: reconnectable || { gameId: null },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'game:get-active-state': {
            // Check if user is currently in a game and return full state
            // This allows the game view to restore state when navigating from tournament
            try {
              const gameId = gameService.getUserGameId(userId);
              
              if (!gameId) {
                // Also check for reconnectable games
                const reconnectable = gameService.getReconnectableGame(userId);
                
                socket.send(JSON.stringify({
                  event: 'game:active-state',
                  data: { 
                    inGame: false,
                    reconnectable: reconnectable || null,
                  },
                }));
                break;
              }

              // Get game info
              const gameInfo = gameService.getGameInfo(gameId);
              const gameState = await gameService.spectateGame(gameId);
              
              if (!gameInfo) {
                socket.send(JSON.stringify({
                  event: 'game:active-state',
                  data: { inGame: false },
                }));
                break;
              }

              // Access internal rooms map to get full room details
              const rooms = (gameService as any).rooms;
              const room = rooms.get(gameId);
              
              // Determine player number
              let playerNumber: 1 | 2 = 1;
              if (room) {
                playerNumber = room.player1Id === userId ? 1 : 2;
              }

              socket.send(JSON.stringify({
                event: 'game:active-state',
                data: {
                  inGame: true,
                  gameId,
                  playerNumber,
                  isLocal: gameInfo.isLocal,
                  player1Name: gameInfo.player1Name,
                  player2Name: gameInfo.player2Name,
                  gameState: gameState || null,
                  // Include room details for full restoration
                  player1: room ? {
                    id: room.player1Id,
                    name: room.player1Name,
                    avatar: room.player1Avatar,
                  } : null,
                  player2: room ? {
                    id: room.player2Id,
                    name: room.player2Name,
                    avatar: room.player2Avatar,
                  } : null,
                  status: room?.status || 'unknown',
                },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'game:active-state',
                data: { inGame: false, error: error.message },
              }));
            }
            break;
          }

          default:
            fastify.log.warn(`Unknown game event: ${message.event}`);
        }
      } catch (error: any) {
        fastify.log.error({ err: error }, 'Game message handling error');
        socket.send(JSON.stringify({
          event: 'game:error',
          data: { message: error.message },
        }));
      }
    },
  };
}
