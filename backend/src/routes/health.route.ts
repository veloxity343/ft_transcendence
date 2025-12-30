/**
 * Health Check Routes
 * Provides endpoints for monitoring server health and status
 * Used by load balancers and monitoring systems
 */
import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Health check endpoint
  fastify.get('/', async (request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Detailed health check
  fastify.get('/detailed', async (request, reply) => {
    let dbStatus = 'unknown';
    
    try {
      // Test database connection
      await fastify.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
    }

    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        websocket: fastify.connectionManager ? 'available' : 'unavailable',
      },
      memory: process.memoryUsage(),
    });
  });
};

export default healthRoutes;
export const autoPrefix = '/health';
