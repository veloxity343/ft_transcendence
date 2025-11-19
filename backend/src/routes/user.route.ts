import { FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/user.service';
import { UpdateUsernameDto, UpdateEmailDto, UpdatePasswordDto, UserRelationshipDto } from '../dto/user.dto';
import { validateDto } from '../utils/validation';
import { authenticate, getUserId } from '../middleware/auth.middleware';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = new UserService(fastify.prisma);

  // ==================== STATIC ROUTES (must come before parameterized routes) ====================
  
  // Get current user
  fastify.get('/me', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    
    try {
      const user = await userService.getUser(userId);
      reply.send(user);
    } catch (error: any) {
      reply.code(404).send({ error: error.message });
    }
  });

  // Search users (must be before /:id route)
  fastify.get('/search', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const { q, limit } = request.query as { q?: string; limit?: string };
    
    if (!q) {
      return reply.code(400).send({ error: 'Query parameter "q" is required' });
    }

    const users = await userService.searchUsers(q, limit ? parseInt(limit) : 10);
    reply.send(users);
  });

  // Get leaderboard (must be before /:id route)
  fastify.get('/leaderboard', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const { limit } = request.query as { limit?: string };
    
    const leaderboard = await userService.getLeaderboard(limit ? parseInt(limit) : 100);
    reply.send(leaderboard);
  });

  // ==================== FRIEND ROUTES ====================
  
  // Get friends list
  fastify.get('/friends/list', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    
    const friends = await userService.getFriends(userId);
    reply.send(friends);
  });

  // Add friend
  fastify.post('/friends/add', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(UserRelationshipDto, request.body, reply);
    if (!dto) return;

    try {
      const result = await userService.addFriend(userId, dto.targetUserId);
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Remove friend
  fastify.post('/friends/remove', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(UserRelationshipDto, request.body, reply);
    if (!dto) return;

    try {
      const result = await userService.removeFriend(userId, dto.targetUserId);
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // ==================== BLOCK ROUTES ====================
  
  // Get blocked users list
  fastify.get('/blocks/list', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    
    const blocked = await userService.getBlockedUsers(userId);
    reply.send(blocked);
  });

  // Block user
  fastify.post('/blocks/block', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(UserRelationshipDto, request.body, reply);
    if (!dto) return;

    try {
      const result = await userService.blockUser(userId, dto.targetUserId);
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Unblock user
  fastify.post('/blocks/unblock', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(UserRelationshipDto, request.body, reply);
    if (!dto) return;

    try {
      const result = await userService.unblockUser(userId, dto.targetUserId);
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // ==================== UPDATE ROUTES ====================
  
  // Update username
  fastify.post('/update-username', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(UpdateUsernameDto, request.body, reply);
    if (!dto) return;

    try {
      const user = await userService.updateUsername(userId, dto.username);
      reply.send(user);
    } catch (error: any) {
      reply.code(403).send({ error: error.message });
    }
  });

  // Update email
  fastify.post('/update-email', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(UpdateEmailDto, request.body, reply);
    if (!dto) return;

    try {
      const user = await userService.updateEmail(userId, dto.email);
      reply.send(user);
    } catch (error: any) {
      reply.code(403).send({ error: error.message });
    }
  });

  // Update password
  fastify.post('/update-password', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(UpdatePasswordDto, request.body, reply);
    if (!dto) return;

    try {
      const result = await userService.updatePassword(userId, dto.currentPassword, dto.newPassword);
      reply.send(result);
    } catch (error: any) {
      reply.code(403).send({ error: error.message });
    }
  });

  // ==================== PARAMETERIZED ROUTES (must come LAST) ====================
  
  // Get user by ID (must be registered AFTER all other GET routes)
  fastify.get('/:id', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const user = await userService.getUser(parseInt(id));
      reply.send(user);
    } catch (error: any) {
      reply.code(404).send({ error: error.message });
    }
  });
};

export default userRoutes;
export const autoPrefix = '/users';
