import { FastifyPluginAsync } from 'fastify';
import { GameService } from '../services/game.service';
import { authenticate, getUserId } from '../middleware/auth.middleware';

const gameRoutes: FastifyPluginAsync = async (fastify) => {
  // Get GameService instance - we'll need to pass it from the WebSocket handler
  // For now, we'll create it here, but ideally it should be shared
  const gameService = (fastify as any).gameService as GameService;

  if (!gameService) {
    fastify.log.error('GameService not initialized');
    return;
  }

  // Get active games
  fastify.get('/active', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    try {
      const games = gameService.getActiveGames();
      reply.send(games);
    } catch (error: any) {
      reply.code(500).send({ 
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message 
      });
    }
  });

  // Get game state for spectating
  fastify.get('/spectate/:gameId', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const { gameId } = request.params as { gameId: string };

    try {
      const gameState = await gameService.spectateGame(parseInt(gameId));
      
      if (!gameState) {
        return reply.code(404).send({ 
          statusCode: 404,
          error: 'Not Found',
          message: 'Game not found or not in progress' 
        });
      }

      reply.send(gameState);
    } catch (error: any) {
      reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
  });

  // Get game statistics
  fastify.get('/stats', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);

    try {
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          gamesWon: true,
          gamesLost: true,
          gamesPlayed: true,
          winRate: true,
          score: true,
          rank: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ 
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found' 
        });
      }

      reply.send(user);
    } catch (error: any) {
      reply.code(500).send({ 
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message 
      });
    }
  });

  // Get game history
  fastify.get('/history', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);

    try {
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { gameHistory: true },
      });

      if (!user) {
        return reply.code(404).send({ 
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found' 
        });
      }

      const gameIds = JSON.parse(user.gameHistory) as number[];

      if (gameIds.length === 0) {
        return reply.send([]);
      }

      const games = await fastify.prisma.game.findMany({
        where: {
          id: { in: gameIds },
        },
        orderBy: {
          endTime: 'desc',
        },
      });

      // Format games with opponent information
      const formattedGames = await Promise.all(
        games.map(async (game) => {
          const isPlayer1 = game.player1 === userId;
          const opponentId = isPlayer1 ? game.player2 : game.player1;
          
          const opponent = await fastify.prisma.user.findUnique({
            where: { id: opponentId },
            select: {
              id: true,
              username: true,
              avatar: true,
              rank: true,
            },
          });

          return {
            gameId: game.id,
            opponentId: opponent?.id,
            opponentUsername: opponent?.username,
            opponentAvatar: opponent?.avatar,
            opponentRank: opponent?.rank,
            userScore: isPlayer1 ? game.score1 : game.score2,
            opponentScore: isPlayer1 ? game.score2 : game.score1,
            victory: isPlayer1 ? game.score1 > game.score2 : game.score2 > game.score1,
            duration: game.duration,
            playedAt: game.endTime,
          };
        })
      );

      reply.send(formattedGames);
    } catch (error: any) {
      reply.code(500).send({ 
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message 
      });
    }
  });

  // Get specific game details
  fastify.get('/:gameId', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const { gameId } = request.params as { gameId: string };

    try {
      const game = await fastify.prisma.game.findUnique({
        where: { id: parseInt(gameId) },
      });

      if (!game) {
        return reply.code(404).send({ 
          statusCode: 404,
          error: 'Not Found',
          message: 'Game not found' 
        });
      }

      // Get player information
      const [player1, player2] = await Promise.all([
        fastify.prisma.user.findUnique({
          where: { id: game.player1 },
          select: {
            id: true,
            username: true,
            avatar: true,
            rank: true,
          },
        }),
        fastify.prisma.user.findUnique({
          where: { id: game.player2 },
          select: {
            id: true,
            username: true,
            avatar: true,
            rank: true,
          },
        }),
      ]);

      reply.send({
        id: game.id,
        player1,
        player2,
        score1: game.score1,
        score2: game.score2,
        startTime: game.startTime,
        endTime: game.endTime,
        duration: game.duration,
      });
    } catch (error: any) {
      reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
  });
};

export default gameRoutes;
export const autoPrefix = '/game';
