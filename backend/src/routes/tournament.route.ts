import { FastifyPluginAsync } from 'fastify';
import { TournamentService } from '../services/tournament.service';
import { authenticate, getUserId } from '../middleware/auth.middleware';
import { validateDto } from '../utils/validation';
import {
  CreateTournamentDto,
  JoinTournamentDto,
  LeaveTournamentDto,
  StartTournamentDto,
  TournamentActionDto,
} from '../dto/tournament.dto';

const tournamentRoutes: FastifyPluginAsync = async (fastify) => {
  const tournamentService = (fastify as any).tournamentService as TournamentService;

  if (!tournamentService) {
    fastify.log.warn('TournamentService not initialized - tournament routes will not function');
    return;
  }

  // ==================== CREATE TOURNAMENT ====================

  fastify.post('/create', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(CreateTournamentDto, request.body, reply);
    if (!dto) return;

    try {
      const tournament = await tournamentService.createTournament(
        userId,
        dto.name,
        dto.maxPlayers,
        dto.bracketType
      );

      reply.send({
        success: true,
        tournament: {
          id: tournament.id,
          name: tournament.name,
          maxPlayers: tournament.maxPlayers,
          currentPlayers: tournament.currentPlayers,
          status: tournament.status,
          createdAt: tournament.createdAt,
        },
      });
    } catch (error: any) {
      reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }
  });

  // ==================== JOIN TOURNAMENT ====================

  fastify.post('/join', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(JoinTournamentDto, request.body, reply);
    if (!dto) return;

    try {
      await tournamentService.joinTournament(userId, dto.tournamentId);

      reply.send({
        success: true,
        message: 'Joined tournament successfully',
      });
    } catch (error: any) {
      reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }
  });

  // ==================== LEAVE TOURNAMENT ====================

  fastify.post('/leave', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(LeaveTournamentDto, request.body, reply);
    if (!dto) return;

    try {
      await tournamentService.leaveTournament(userId, dto.tournamentId);

      reply.send({
        success: true,
        message: 'Left tournament successfully',
      });
    } catch (error: any) {
      reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }
  });

  // ==================== START TOURNAMENT ====================

  fastify.post('/start', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(StartTournamentDto, request.body, reply);
    if (!dto) return;

    try {
      await tournamentService.startTournament(dto.tournamentId, userId);

      reply.send({
        success: true,
        message: 'Tournament started successfully',
      });
    } catch (error: any) {
      reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }
  });

  // ==================== GET TOURNAMENT ====================

  fastify.get('/:id', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const tournament = tournamentService.getTournament(parseInt(id));

      if (!tournament) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Tournament not found',
        });
      }

      reply.send(tournament);
    } catch (error: any) {
      reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ==================== GET BRACKET ====================

  fastify.get('/:id/bracket', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const bracket = tournamentService.getTournamentBracket(parseInt(id));

      if (!bracket) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Tournament not found',
        });
      }

      reply.send(bracket);
    } catch (error: any) {
      reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ==================== GET STATS ====================

  fastify.get('/:id/stats', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const stats = tournamentService.getTournamentStats(parseInt(id));

      if (!stats) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Tournament not found',
        });
      }

      reply.send(stats);
    } catch (error: any) {
      reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ==================== LIST ALL TOURNAMENTS ====================

  fastify.get('/list/all', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    try {
      const tournaments = tournamentService.getAllTournaments();

      reply.send({
        tournaments: tournaments.map(t => ({
          id: t.id,
          name: t.name,
          maxPlayers: t.maxPlayers,
          currentPlayers: t.currentPlayers,
          status: t.status,
          creatorId: t.creatorId,
          createdAt: t.createdAt,
          startedAt: t.startedAt,
          finishedAt: t.finishedAt,
        })),
      });
    } catch (error: any) {
      reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ==================== LIST ACTIVE TOURNAMENTS ====================

  fastify.get('/list/active', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    try {
      const tournaments = tournamentService.getActiveTournaments();

      reply.send({
        tournaments: tournaments.map(t => ({
          id: t.id,
          name: t.name,
          maxPlayers: t.maxPlayers,
          currentPlayers: t.currentPlayers,
          status: t.status,
          creatorId: t.creatorId,
          createdAt: t.createdAt,
        })),
      });
    } catch (error: any) {
      reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ==================== GET TOURNAMENTS ====================

  fastify.get('/my-tournaments', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);

    try {
      const tournaments = tournamentService.getUserTournaments(userId);

      reply.send({
        tournaments: tournaments.map(t => ({
          id: t.id,
          name: t.name,
          maxPlayers: t.maxPlayers,
          currentPlayers: t.currentPlayers,
          status: t.status,
          currentRound: t.currentRound,
          totalRounds: t.totalRounds,
          createdAt: t.createdAt,
          startedAt: t.startedAt,
          finishedAt: t.finishedAt,
        })),
      });
    } catch (error: any) {
      reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ==================== CANCEL TOURNAMENT ====================

  fastify.post('/cancel', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(TournamentActionDto, request.body, reply);
    if (!dto) return;

    try {
      await tournamentService.cancelTournament(dto.tournamentId, userId);

      reply.send({
        success: true,
        message: 'Tournament cancelled successfully',
      });
    } catch (error: any) {
      reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }
  });
};

export default tournamentRoutes;
export const autoPrefix = '/tournament';
