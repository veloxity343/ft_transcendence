import { FastifyInstance } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { TournamentService } from '../services/tournament.service';
import { BracketType } from '../game/types/tournament.types';

export interface CreateTournamentMessage {
  name: string;
  maxPlayers: number;
  bracketType?: BracketType;
}

export interface TournamentIdMessage {
  tournamentId: number;
}

export interface ReadyForMatchMessage {
  tournamentId: number;
  matchId: string;
}

export async function setupTournamentWebSocket(
  fastify: FastifyInstance,
  tournamentService: TournamentService
) {
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
            // Create a new tournament (online or local). Local mode uses provided player names.
            const { name, maxPlayers, bracketType, isLocal, localPlayerNames } = message.data as CreateTournamentMessage & {
              isLocal?: boolean;
              localPlayerNames?: string[];
            };

            if (!name || !maxPlayers) {
              throw new Error('Name and maxPlayers are required');
            }

            const minPlayers = isLocal ? 2 : 2;
            if (maxPlayers < minPlayers || maxPlayers > 32) {
              throw new Error(`Max players must be between ${minPlayers} and 32`);
            }

            if (isLocal && (!localPlayerNames || localPlayerNames.length < 2)) {
              throw new Error('Local tournaments require at least 2 player names');
            }

            try {
              const tournament = await tournamentService.createTournament(
                userId,
                name,
                maxPlayers,
                bracketType,
                isLocal,
                localPlayerNames
              );

              // Send confirmation to creator
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
                    isLocal: tournament.isLocal,
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
            // Player joins tournament lobby; service enforces capacity and duplicates
            const { tournamentId } = message.data as TournamentIdMessage;

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
            // Player leaves registration or drops before start
            const { tournamentId } = message.data as TournamentIdMessage;

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
            // Tournament creator starts bracket generation; broadcasts start to participants
            const { tournamentId } = message.data as TournamentIdMessage;

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              await tournamentService.startTournament(tournamentId, userId);
              // Note: tournament:started is broadcast by the service to all participants
              // No need to send a separate confirmation here
            } catch (error: any) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: error.message },
              }));
            }
            break;
          }

          case 'tournament:start-local-match': {
            // Start a specific local match (hotseat mode) without networked players
            const { tournamentId, matchId } = message.data as { tournamentId: number; matchId: string };

            if (!tournamentId || !matchId) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: 'Tournament ID and Match ID are required' },
              }));
              break;
            }

            try {
              const result = await tournamentService.startLocalTournamentMatch(userId, tournamentId, matchId);

              socket.send(JSON.stringify({
                event: 'tournament:local-match-starting',
                data: {
                  success: true,
                  ...result,
                  tournamentId,
                  matchId,
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

          // ==================== READY FOR MATCH ====================
          case 'tournament:ready': {
            // Player signals readiness; match begins when both are ready
            const { tournamentId, matchId } = message.data as ReadyForMatchMessage;

            if (!tournamentId || !matchId) {
              socket.send(JSON.stringify({
                event: 'tournament:error',
                data: { message: 'Tournament ID and Match ID are required' },
              }));
              break;
            }

            try {
              await tournamentService.playerReady(userId, tournamentId, matchId);

              // Send confirmation to the player
              socket.send(JSON.stringify({
                event: 'tournament:ready-confirmed',
                data: { 
                  success: true, 
                  tournamentId, 
                  matchId,
                  message: 'You are ready! Waiting for opponent...',
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

          case 'tournament:get': {
            // Fetch tournament state (from cache or DB) for late joiners or refreshes
            const { tournamentId } = message.data as TournamentIdMessage;

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              const tournament = await tournamentService.getTournamentFromCacheOrDb(tournamentId);

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
            // Fetch bracket view data; tailored by user for permissions/visibility
            const { tournamentId } = message.data as TournamentIdMessage;

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              const bracket = tournamentService.getBracketViewData(
                tournamentId,
                userId
              );

              if (!bracket) {
                throw new Error('Tournament not found');
              }

              // Fixed: Send 'tournament:bracket' to match frontend expectation
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
            // Lightweight list of active tournaments for lobby browsing
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
                    creatorId: t.creatorId,
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

          case 'tournament:my-tournaments': {
            // User-specific list of tournaments they own or joined
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
            // Creator cancels tournament; service validates permissions
            const { tournamentId } = message.data as TournamentIdMessage;

            if (!tournamentId) {
              throw new Error('Tournament ID is required');
            }

            try {
              await tournamentService.cancelTournament(tournamentId, userId);

              socket.send(JSON.stringify({
                event: 'tournament:cancelled',
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
