import Fastify from 'fastify';
import app from './app';
import { config } from './config/config';

async function start() {
  const fastify = Fastify({
    logger: {
      level: config.environment === 'DEVELOPMENT' ? 'info' : 'warn',
    },
    trustProxy: config.trustProxy,
  });

  // Register our app
  await fastify.register(app);

  try {
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });
    
    console.log(`🚀 Server running on http://localhost:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
