import { FastifyPluginAsync } from 'fastify';
import { MatchHistoryService } from '../services/history.service';
import { authenticate, getUserId } from '../middleware/auth.middleware';

const historyRoutes: FastifyPluginAsync = async (fastify) => {
  const historyService = new MatchHistoryService(fastify.prisma);

  // ==================== MATCH HISTORY ====================

  /**
   * GET /history/matches
   * Get current user's match history
   */
  fastify.get('/matches', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const { limit, offset, type } = request.query as {
      limit?: string;
      offset?: string;
      type?: 'all' | 'quickplay' | 'tournament' | 'ai';
    };

    const result = await historyService.getMatchHistory(
      userId,
      parseInt(limit || '20', 10),
      parseInt(offset || '0', 10),
      type
    );

    return reply.send(result);
  });

  /**
   * GET /history/matches/:userId
   * Get match history for a specific user (public)
   */
  fastify.get('/matches/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { limit, offset, type } = request.query as {
      limit?: string;
      offset?: string;
      type?: 'all' | 'quickplay' | 'tournament' | 'ai';
    };

    try {
      const result = await historyService.getMatchHistory(
        parseInt(userId, 10),
        parseInt(limit || '20', 10),
        parseInt(offset || '0', 10),
        type
      );

      return reply.send(result);
    } catch (error: any) {
      return reply.code(404).send({ error: error.message });
    }
  });

  /**
   * GET /history/match/:gameId
   * Get details for a specific match
   */
  fastify.get('/match/:gameId', async (request, reply) => {
    const { gameId } = request.params as { gameId: string };

    const match = await historyService.getMatchDetails(parseInt(gameId, 10));

    if (!match) {
      return reply.code(404).send({ error: 'Match not found' });
    }

    return reply.send(match);
  });

  // ==================== TOURNAMENT HISTORY ====================

  /**
   * GET /history/tournaments
   * Get current user's tournament history
   */
  fastify.get('/tournaments', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);

    const tournaments = await historyService.getTournamentHistory(userId);

    return reply.send(tournaments);
  });

  /**
   * GET /history/tournaments/:userId
   * Get tournament history for a specific user (public)
   */
  fastify.get('/tournaments/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    try {
      const tournaments = await historyService.getTournamentHistory(
        parseInt(userId, 10)
      );

      return reply.send(tournaments);
    } catch (error: any) {
      return reply.code(404).send({ error: error.message });
    }
  });

  /**
   * GET /history/tournament/:tournamentId
   * Get detailed tournament info including bracket
   */
  fastify.get('/tournament/:tournamentId', async (request, reply) => {
    const { tournamentId } = request.params as { tournamentId: string };

    const tournament = await historyService.getTournamentDetails(
      parseInt(tournamentId, 10)
    );

    if (!tournament) {
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    return reply.send(tournament);
  });

  // ==================== PLAYER STATS ====================

  /**
   * GET /history/stats
   * Get current user's stats
   */
  fastify.get('/stats', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);

    try {
      const stats = await historyService.getPlayerStats(userId);
      return reply.send(stats);
    } catch (error: any) {
      return reply.code(404).send({ error: error.message });
    }
  });

  /**
   * GET /history/stats/:userId
   * Get stats for a specific user (public)
   */
  fastify.get('/stats/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    try {
      const stats = await historyService.getPlayerStats(parseInt(userId, 10));
      return reply.send(stats);
    } catch (error: any) {
      return reply.code(404).send({ error: error.message });
    }
  });
};

export default historyRoutes;
export const autoPrefix = '/history';
