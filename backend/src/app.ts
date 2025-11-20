import { join } from 'path';
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload';
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import { config } from './config/config';
import { UserService } from './services/user.service';
import { GameService } from './services/game.service';
import { ChatService } from './services/chat.service';
import { TournamentService } from './services/tournament.service';
import { ConnectionManager } from './websocket/connection.manager';
import { websocketHandler } from './websocket/events.handler';

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}

const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  // CORS
  await fastify.register(cors, {
    origin: config.frontUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
  });

  // JWT
  await fastify.register(jwt, {
    secret: config.jwt.secret,
  });

  // multipart file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 1000000, // 1MB
    },
  });

  // static files
  await fastify.register(staticFiles, {
    root: join(__dirname, '..', config.uploadDir),
    prefix: '/uploads/',
  });

  // WebSocket
  await fastify.register(websocket);

  // Load plugins (including Prisma)
  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts,
  });

  // ==================== INITIALIZE SERVICES ====================
  // Initialize services BEFORE routes so they're available to both HTTP and WebSocket handlers
  const connectionManager = new ConnectionManager();
  const userService = new UserService(fastify.prisma);
  const chatService = new ChatService(connectionManager);
  const gameService = new GameService(
    fastify.prisma,
    userService,
    connectionManager,
  );
  const tournamentService = new TournamentService(
    fastify.prisma,
    userService,
    gameService,
    connectionManager,
  );

  // Decorate fastify instance with services
  fastify.decorate('connectionManager', connectionManager);
  fastify.decorate('chatService', chatService);
  fastify.decorate('gameService', gameService);
  fastify.decorate('tournamentService', tournamentService);

  fastify.log.info('All services initialized successfully');

  // ==================== LOAD ROUTES ====================
  // AutoLoad will automatically register all routes in the routes directory
  // with their respective prefixes (defined by autoPrefix export)
  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts,
  });

  // ==================== SETUP WEBSOCKET ====================
  // Setup WebSocket handlers (they will use the existing services)
  await websocketHandler(fastify);

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    fastify.log.error(message);

    reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: message,
    });
  });
};

export default app;
export { app, options };
