import { FastifyInstance } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { TournamentService } from '../services/tournament.service';
import { BracketType } from '../game/types/tournament.types';

export interface CreateTournamentMessage {
  name: string;
  maxPlayers: number;
  bracketType?: BracketType;
}

export interface JoinTournamentMessage {
  tournamentId: number;
}

export interface LeaveTournamentMessage {
  tournamentId: number;
}

export interface StartTournamentMessage {
  tournamentId: number;
}

export interface GetTournamentMessage {
  tournamentId: number;
}

export async function setupTournamentWebSocket(
  fastify: FastifyInstance,
  tournamentService: TournamentService
) {
  // Decorate if not already decorated
  if (!fastify.hasDecorator('tournamentService')) {
    fastify.decorate('tournamentService', tournamentService);
  }

  return {
    handleTournamentMessage: async (
      userId: number,
      username: string,
      message: any,
      socket: WebSocket
    ) => {
      try {
        switch (message.event) {
          case 'tournament:create': {
            const { name, maxPlayers, bracketType } = message.data as CreateTournamentMessage;

            if (!name || !maxPlayers) {
              throw new Error('Name and maxPlayers are required');
            }

            if (maxPlayers < 4 || maxPlayers > 32) {
              throw new Error('Max players must be between 4 and 32');
            }

            try {
              const tournament = await tournamentService.createTournament(
                userId,
                name,
                maxPlayers,
                bracketType
              );

              socket.send(JSON.stringify({
                event: 'tournament:created',
                data: {
                  success: true,
                  tournament: {
                    id: tournament.id,
                    name: tournament.name,
                    maxPlayers: tournament.maxPlayers,
                    currentPlayers: tournament.currentPlayers,
                    status: tournament.status,
                  },
                },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'tournament:join': {
            const { tournamentId } = message.data as JoinTournamentMessage;

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              await tournamentService.joinTournament(userId, tournamentId);

              socket.send(JSON.stringify({
                event: 'tournament:joined',
                data: { success: true, tournamentId },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'tournament:leave': {
            const { tournamentId } = message.data as LeaveTournamentMessage;

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              await tournamentService.leaveTournament(userId, tournamentId);

              socket.send(JSON.stringify({
                event: 'tournament:left',
                data: { success: true, tournamentId },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'tournament:start': {
            const { tournamentId } = message.data as StartTournamentMessage;

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              await tournamentService.startTournament(tournamentId, userId);

              socket.send(JSON.stringify({
                event: 'tournament:start-initiated',
                data: { success: true, tournamentId },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'tournament:get': {
            const { tournamentId } = message.data as GetTournamentMessage;

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              const tournament = tournamentService.getTournament(tournamentId);

              if (!tournament) {
                throw new Error('Tournament not found');
              }

              socket.send(JSON.stringify({
                event: 'tournament:data',
                data: { tournament },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'tournament:get-bracket': {
            const { tournamentId } = message.data as GetTournamentMessage;

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              const bracket = tournamentService.getTournamentBracket(tournamentId);

              if (!bracket) {
                throw new Error('Tournament not found');
              }

              socket.send(JSON.stringify({
                event: 'tournament:bracket',
                data: { bracket },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'tournament:list-active': {
            try {
              const tournaments = tournamentService.getActiveTournaments();

              socket.send(JSON.stringify({
                event: 'tournament:active-list',
                data: {
                  tournaments: tournaments.map(t => ({
                    id: t.id,
                    name: t.name,
                    maxPlayers: t.maxPlayers,
                    currentPlayers: t.currentPlayers,
                    status: t.status,
                    createdAt: t.createdAt,
                  })),
                },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'tournament:my-tournaments': {
            try {
              const tournaments = tournamentService.getUserTournaments(userId);

              socket.send(JSON.stringify({
                event: 'tournament:my-list',
                data: {
                  tournaments: tournaments.map(t => ({
                    id: t.id,
                    name: t.name,
                    maxPlayers: t.maxPlayers,
                    currentPlayers: t.currentPlayers,
                    status: t.status,
                    currentRound: t.currentRound,
                    totalRounds: t.totalRounds,
                    createdAt: t.createdAt,
                  })),
                },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'tournament:cancel': {
            const { tournamentId } = message.data as { tournamentId: number };

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              await tournamentService.cancelTournament(tournamentId, userId);

              socket.send(JSON.stringify({
                event: 'tournament:cancelled-confirmed',
                data: { success: true, tournamentId },
              }));
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          default:
            fastify.log.warn(`Unknown tournament event: ${message.event}`);
        }
      } catch (error: any) {
        fastify.log.error({ err: error }, 'Tournament message handling error');
        socket.send(JSON.stringify({
          event: 'tournament:error',
          data: { message: error.message },
        }));
      }
    },
  };
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    tournamentService: TournamentService;
  }
}
