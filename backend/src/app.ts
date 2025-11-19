import { join } from 'path';
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload';
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import { config } from './config/config';
import userRoutes from './routes/user.route';
import { websocketHandler } from './websocket/events.handler';

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}

const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  // CORS
  await fastify.register(cors, {
    origin: config.frontUrl,
    credentials: true,
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

  // Load plugins
  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts,
  });

  // Load routes
  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts,
  });

  await websocketHandler(fastify);

  await fastify.register(userRoutes, {
    prefix: '/users'
  });

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
