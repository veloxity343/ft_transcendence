/**
 * Main server entry point
 * Initializes and starts the fastify server with configured plugins and routes
 */
import Fastify from 'fastify';
import app from './app';
import { config } from './config/config';

/**
 * Starts fastify server
 * - Configures logging
 * - Sets up SSL if configured for production
 * - Registers all application plugins and routes
 * - Binds to all interfaces (0.0.0.0) to work in docker containers
 */
async function start() {
  const fastify = Fastify({
    logger: {
      // Verbose logging in development, minimal in production for performance
      level: config.environment === 'DEVELOPMENT' ? 'info' : 'warn',
    },
    // Trust proxy headers when behind nginx/load balancer
    trustProxy: config.trustProxy,
    // Enable HTTPS if SSL certificates are configured
    ...(config.ssl && { https: config.ssl }),
  });

  // Register app
  await fastify.register(app);

  try {
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });
    
    const protocol = config.useSSL ? 'https' : 'http';
    console.log(`🚀 Server running on ${protocol}://localhost:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
