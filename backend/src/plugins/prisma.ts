/**
 * Prisma database plugin
 * Manages the database connection lifecycle within Fastify's plugin system
 * Ensures proper connection and disconnection during server startup and shutdown
 */
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

// Extend Fastify's type system to include our Prisma client
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * Initializes Prisma client and registers it as a Fastify decorator
 * - Query logging is enabled in debug mode for troubleshooting
 * - Connection is established on server startup
 * - Graceful disconnection happens on server shutdown via onClose hook
 */
const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    // Enable query logging in debug mode for troubleshooting
    log: fastify.log.level === 'debug' ? ['query', 'error', 'warn'] : ['error'],
  });

  await prisma.$connect();

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
};

export default fp(prismaPlugin, {
  name: 'prisma',
});
