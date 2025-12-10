import Fastify from 'fastify';
import app from './app';
import { config } from './config/config';

async function start() {
  const fastify = Fastify({
    logger: {
      level: config.environment === 'DEVELOPMENT' ? 'info' : 'warn',
    },
    trustProxy: config.trustProxy,
    ...(config.ssl && { https: config.ssl }),
  });

  // Register our app
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
