/**
 * User Routes
 * Handles user profiles, avatar uploads, friend system, and blocking
 * Public routes: view profiles, search, leaderboard
 * Protected routes: update profile, manage relationships
 */
import { FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/user.service';
import { 
  UpdateUsernameDto, 
  UpdateEmailDto, 
  UpdatePasswordDto,
  UserRelationshipDto 
} from '../dto/user.dto';
import { validateDto } from '../utils/validation';
import { authenticate, getUserId } from '../middleware/auth.middleware';
import { config } from '../config/config';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = new UserService(fastify.prisma);

  // ==================== PUBLIC ROUTES ====================

  // Get user by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const user = await userService.getUser(parseInt(id, 10));
      reply.send(user);
    } catch (error: any) {
      reply.code(404).send({ error: error.message });
    }
  });

  // Search users
  fastify.get('/search', async (request, reply) => {
    const { q, limit } = request.query as { q?: string; limit?: string };
    
    if (!q || q.length < 2) {
      return reply.send([]);
    }

    const users = await userService.searchUsers(q, parseInt(limit || '10', 10));
    reply.send(users);
  });

  // Get leaderboard
  fastify.get('/leaderboard', async (request, reply) => {
    const { limit } = request.query as { limit?: string };
    
    const leaderboard = await userService.getLeaderboard(parseInt(limit || '100', 10));
    reply.send(leaderboard);
  });

  // ==================== PROTECTED ROUTES ====================

  // Update username
  fastify.put('/update-username', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(UpdateUsernameDto, request.body, reply);
    if (!dto) return;

    try {
      const user = await userService.updateUsername(userId, dto.username);
      reply.send(user);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Update email
  fastify.put('/update-email', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(UpdateEmailDto, request.body, reply);
    if (!dto) return;

    try {
      const user = await userService.updateEmail(userId, dto.email);
      reply.send(user);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
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
      reply.code(400).send({ error: error.message });
    }
  });

  // Upload avatar
  fastify.post('/avatar', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);

    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' });
      }

      // Generate unique filename
      const ext = extname(data.filename) || '.jpg';
      const filename = `${uuidv4()}${ext}`;
      
      // Ensure upload directory exists
      const uploadDir = join(__dirname, '..', '..', config.uploadDir);
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      const filepath = join(uploadDir, filename);

      // Save file
      await pipeline(data.file, createWriteStream(filepath));

      // Get old avatar to delete
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      // Update user's avatar in database
      await fastify.prisma.user.update({
        where: { id: userId },
        data: { avatar: filename },
      });

      // Delete old avatar if it's not the default
      if (user?.avatar && user.avatar !== 'default-avatar.png') {
        const oldFilePath = join(uploadDir, user.avatar);
        if (existsSync(oldFilePath)) {
          try {
            unlinkSync(oldFilePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
      }

      reply.send({ 
        message: 'Avatar uploaded successfully',
        avatar: filename,
      });
    } catch (error: any) {
      fastify.log.error({ error }, 'Avatar upload error');
      reply.code(500).send({ error: 'Failed to upload avatar' });
    }
  });

  // ==================== FRIENDS ROUTES ====================

  // Get friends list
  fastify.get('/friends', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);

    try {
      const friends = await userService.getFriends(userId);
      reply.send(friends);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Add friend
  fastify.post('/:id/friend', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };

    try {
      const result = await userService.addFriend(userId, parseInt(id, 10));

      // Add WebSocket notification
      const connectionManager = (fastify as any).connectionManager;
      if (connectionManager) {
        const targetUser = await userService.getUser(parseInt(id, 10));
        const currentUser = await userService.getUser(userId);

        if (targetUser && currentUser) {
          // Check if this completed a mutual friendship
          const userAfter = await fastify.prisma.user.findUnique({
            where: { id: userId },
            select: { friends: true },
          });
          
          const friendsList = JSON.parse(userAfter?.friends || '[]');
          const isMutual = friendsList.includes(parseInt(id, 10));
          
          if (isMutual) {
            // send acceptance notification to BOTH users
            connectionManager.emitToUser(parseInt(id, 10), 'friend:request-accepted', {
              userId,
              username: currentUser.username,
            });
            
            connectionManager.emitToUser(userId, 'friend:request-accepted', {
              userId: parseInt(id, 10),
              username: targetUser.username,
            });
            
            //emit a general friend list update event for both
            connectionManager.emitToUser(parseInt(id, 10), 'friend:list-updated', {});
            connectionManager.emitToUser(userId, 'friend:list-updated', {});
          } else {
            // New friend request
            connectionManager.emitToUser(parseInt(id, 10), 'friend:request-received', {
              fromUserId: userId,
              fromUsername: currentUser.username,
              fromAvatar: currentUser.avatar,
              message: '',
            });
          }
        }
      }

      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Remove friend
  fastify.delete('/:id/friend', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };

    try {
      const result = await userService.removeFriend(userId, parseInt(id, 10));
      
      // Notify both users that friendship was removed
      const connectionManager = (fastify as any).connectionManager;
      if (connectionManager) {
        connectionManager.emitToUser(parseInt(id, 10), 'friend:list-updated', {});
        connectionManager.emitToUser(userId, 'friend:list-updated', {});
      }
      
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Decline friend request
  fastify.delete('/:id/friend-request', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };

    try {
      const result = await userService.declineFriendRequest(userId, parseInt(id, 10));
      
      // Notify the sender that their request was declined
      const connectionManager = (fastify as any).connectionManager;
      if (connectionManager) {
        const currentUser = await userService.getUser(userId);
        
        if (currentUser) {
          connectionManager.emitToUser(parseInt(id, 10), 'friend:request-declined', {
            userId,
            username: currentUser.username,
          });
        }
      }
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // ==================== BLOCK ROUTES ====================

  // Get blocked users
  fastify.get('/blocked', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);

    try {
      const blocked = await userService.getBlockedUsers(userId);
      reply.send(blocked);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Block user
  fastify.post('/:id/block', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };

    try {
      const result = await userService.blockUser(userId, parseInt(id, 10));
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Unblock user
  fastify.delete('/:id/block', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };

    try {
      const result = await userService.unblockUser(userId, parseInt(id, 10));
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // ==================== ACCOUNT DELETION ====================

  // Delete account
  fastify.delete('/me', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);

    try {
      // Get user's avatar to delete
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      // Delete user
      await fastify.prisma.user.delete({
        where: { id: userId },
      });

      // Delete avatar file if not default
      if (user?.avatar && user.avatar !== 'default-avatar.png') {
        const uploadDir = join(__dirname, '..', '..', config.uploadDir);
        const filePath = join(uploadDir, user.avatar);
        if (existsSync(filePath)) {
          try {
            unlinkSync(filePath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
      }

      reply.send({ message: 'Account deleted successfully' });
    } catch (error: any) {
      fastify.log.error({ error }, 'Account deletion error');
      reply.code(500).send({ error: 'Failed to delete account' });
    }
  });
};

export default userRoutes;
export const autoPrefix = '/users';
