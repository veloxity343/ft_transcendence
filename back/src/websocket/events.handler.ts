import { FastifyInstance } from 'fastify';
import { ConnectionManager, UserStatus } from './connection.manager';

export async function websocketHandler(fastify: FastifyInstance) {
  const connectionManager = new ConnectionManager();

  fastify.get('/ws', { websocket: true }, (connection, request) => {
    // The connection object IS the WebSocket
    const ws = connection;

    // Extract token from query or headers
    const token = (request.query as any).token || 
                  request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      ws.close(1008, 'No token provided');
      return;
    }

    // Verify JWT
    let userId: number;
    try {
      const decoded = fastify.jwt.verify(token) as any;
      userId = decoded.sub;
    } catch (err) {
      ws.close(1008, 'Invalid token');
      return;
    }

    // Add connection immediately
    connectionManager.addConnection(userId, ws);
    fastify.log.info(`User ${userId} connected to WebSocket`);

    // Send connection confirmation
    ws.send(JSON.stringify({
      event: 'connected',
      data: { userId },
    }));

    // Broadcast status update
    connectionManager.broadcast('user-statuses-updated', connectionManager.getAllStatuses());

    // Handle messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.event) {
          case 'update-status':
            connectionManager.setStatus(userId, message.data.status);
            connectionManager.broadcast('user-statuses-updated', connectionManager.getAllStatuses());
            break;

          case 'get-online-users':
            ws.send(JSON.stringify({
              event: 'online-users',
              data: {
                onlineUsers: connectionManager.getOnlineUsers(),
                statuses: connectionManager.getAllStatuses(),
              },
            }));
            break;

          case 'send-notification':
            connectionManager.emitToUser(message.data.targetUserId, 'notification', {
              from: userId,
              message: message.data.message,
              type: message.data.type,
              timestamp: new Date(),
            });
            break;

          default:
            fastify.log.warn(`Unknown event: ${message.event}`);
        }
      } catch (err: any) {
        fastify.log.error({ err }, 'WebSocket message error');
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      connectionManager.removeConnection(userId);
      fastify.log.info(`User ${userId} disconnected from WebSocket`);
      connectionManager.broadcast('user-statuses-updated', connectionManager.getAllStatuses());
    });

    ws.on('error', (err: any) => {
      fastify.log.error({ err }, 'WebSocket error');
    });
  });

  // Make connection manager available to other parts of the app
  fastify.decorate('connectionManager', connectionManager);
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    connectionManager: ConnectionManager;
  }
}
