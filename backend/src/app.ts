/**
 * Main application module
 * Configures all Fastify plugins, services, routes, and WebSocket handlers
 * This is the heart of the application where all components are wired together
 */
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
import { AIOpponentService } from './services/ai.service';

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}

const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  // ==================== CORS Configuration ====================
  // Allow cross-origin requests from the frontend for API access
  // Credentials are enabled for JWT cookies/headers
  await fastify.register(cors, {
    origin: true, // config.frontUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
  });

  // ==================== JWT Authentication ====================
  // JWT tokens are used for stateless authentication
  // Secret must be kept secure and rotated periodically in production
  await fastify.register(jwt, {
    secret: config.jwt.secret,
  });

  // ==================== File Upload Handler ====================
  // Handles multipart form data for avatar uploads
  // File size limit prevents abuse and DoS attacks
  await fastify.register(multipart, {
    limits: {
      fileSize: 1000000, // 1MB
    },
  });

  // ==================== Static File Serving ====================
  // Serves uploaded files (avatars) at /uploads/ URL prefix
  await fastify.register(staticFiles, {
    root: join(__dirname, '..', config.uploadDir),
    prefix: '/uploads/',
  });

  // ==================== WebSocket Support ====================
  await fastify.register(websocket);

  // ==================== Plugin Loading ====================
  // Load plugins (including Prisma database connection)
  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts,
  });

  // ==================== Service Initialization ====================
  // Services are initialized here and decorated onto the Fastify instance
  // This allows both HTTP routes and WebSocket handlers to access the same service instances
  // Order matters: dependent services must be initialized after their dependencies
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
  const aiOpponentService = new AIOpponentService(
  fastify.prisma,
  gameService,
  userService,
  connectionManager,
  );

  // Decorate fastify instance with services
  fastify.decorate('connectionManager', connectionManager);
  fastify.decorate('chatService', chatService);
  fastify.decorate('gameService', gameService);
  fastify.decorate('tournamentService', tournamentService);
  fastify.decorate('aiOpponentService', aiOpponentService);

  fastify.log.info('All services initialized successfully');

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
