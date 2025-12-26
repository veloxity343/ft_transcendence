import { PrismaClient } from '@prisma/client';
import * as argon from 'argon2';
import { parseJsonArray, stringifyJsonArray, addToJsonArray, removeFromJsonArray } from '../utils/array-helpers';

export class UserService {
  constructor(private prisma: PrismaClient) {}

  // ==================== READ OPERATIONS ====================

  async getUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Remove sensitive data
    const { hash, hashedRtoken, twoFAsecret, ...safeUser } = user;

    // Parse JSON arrays
    return {
      ...safeUser,
      friends: parseJsonArray(user.friends),
      adding: parseJsonArray(user.adding),
      added: parseJsonArray(user.added),
      blocks: parseJsonArray(user.blocks),
      gameHistory: parseJsonArray(user.gameHistory),
    };
  }

  async searchUsers(query: string, limit: number = 10) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        rank: true,
      },
      take: limit,
    });

    return users;
  }

  async getLeaderboard(limit: number = 100) {
    const users = await this.prisma.user.findMany({
      where: {
        gamesPlayed: {
          gt: 0,
        },
        email: {
          not: 'ai@transcendence.local',
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        rank: true,
        score: true,
        gamesWon: true,
        gamesLost: true,
        gamesPlayed: true,
        winRate: true,
      },
      orderBy: {
        rank: 'desc',
      },
      take: limit,
    });

    return users;
  }

  // ==================== UPDATE PROFILE ====================

  async updateUsername(userId: number, newUsername: string) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { username: newUsername },
      });

      return this.getUser(user.id);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Username already taken');
      }
      throw error;
    }
  }

  async updateEmail(userId: number, newEmail: string) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      });

      return this.getUser(user.id);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Email already taken');
      }
      throw error;
    }
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const passwordMatches = await argon.verify(user.hash, currentPassword);

    if (!passwordMatches) {
      throw new Error('Current password is incorrect');
    }

    const newHash = await argon.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { hash: newHash },
    });

    return { message: 'Password updated successfully' };
  }

  // ==================== FRIEND SYSTEM ====================

  async getFriends(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { friends: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const friendIds = parseJsonArray(user.friends);
    
    if (friendIds.length === 0) {
      return [];
    }

    const friends = await this.prisma.user.findMany({
      where: {
        id: { in: friendIds },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        rank: true,
      },
    });

    return friends;
  }

  async addFriend(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new Error('Cannot add yourself as friend');
    }

    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: targetId } }),
    ]);

    if (!user || !target) {
      throw new Error('User not found');
    }

    const userFriends = parseJsonArray(user.friends);
    const userAdding = parseJsonArray(user.adding);
    const userBlocks = parseJsonArray(user.blocks);
    const targetBlocks = parseJsonArray(target.blocks);

    if (userFriends.includes(targetId)) {
      throw new Error('Already friends');
    }

    if (userAdding.includes(targetId)) {
      throw new Error('Friend request already sent');
    }

    if (userBlocks.includes(targetId) || targetBlocks.includes(userId)) {
      throw new Error('Cannot add this user');
    }

    // Add to sender's adding list
    const newAdding = addToJsonArray(user.adding, targetId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { adding: newAdding },
    });

    // Add to receiver's added list
    const newAdded = addToJsonArray(target.added, userId);
    await this.prisma.user.update({
      where: { id: targetId },
      data: { added: newAdded },
    });

    // Check if mutual - if target also sent request, make them friends
    const targetAdding = parseJsonArray(target.adding);
    if (targetAdding.includes(userId)) {
      await this.finalizeFriendship(userId, targetId);
    }

    return { message: 'Friend request sent' };
  }

  private async finalizeFriendship(userId: number, targetId: number) {
    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: targetId } }),
    ]);

    if (!user || !target) {
      throw new Error('User not found');
    }

    // Remove from adding/added lists and add to friends
    const userAdding = parseJsonArray(user.adding).filter(id => id !== targetId);
    const userAdded = parseJsonArray(user.added).filter(id => id !== targetId);
    const userFriends = parseJsonArray(user.friends);
    userFriends.push(targetId);

    const targetAdding = parseJsonArray(target.adding).filter(id => id !== userId);
    const targetAdded = parseJsonArray(target.added).filter(id => id !== userId);
    const targetFriends = parseJsonArray(target.friends);
    targetFriends.push(userId);

    await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          adding: stringifyJsonArray(userAdding),
          added: stringifyJsonArray(userAdded),
          friends: stringifyJsonArray(userFriends),
        },
      }),
      this.prisma.user.update({
        where: { id: targetId },
        data: {
          adding: stringifyJsonArray(targetAdding),
          added: stringifyJsonArray(targetAdded),
          friends: stringifyJsonArray(targetFriends),
        },
      }),
    ]);
  }

  async removeFriend(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new Error('Invalid operation');
    }

    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: targetId } }),
    ]);

    if (!user || !target) {
      throw new Error('User not found');
    }

    const userFriends = parseJsonArray(user.friends);
    if (!userFriends.includes(targetId)) {
      throw new Error('Not friends');
    }

    await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          friends: removeFromJsonArray(user.friends, targetId),
        },
      }),
      this.prisma.user.update({
        where: { id: targetId },
        data: {
          friends: removeFromJsonArray(target.friends, userId),
        },
      }),
    ]);

    return { message: 'Friend removed' };
  }

  async declineFriendRequest(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new Error('Invalid operation');
    }

    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: targetId } }),
    ]);

    if (!user || !target) {
      throw new Error('User not found');
    }

    // Check if there's actually a pending request
    const userAdded = parseJsonArray(user.added);
    if (!userAdded.includes(targetId)) {
      throw new Error('No pending friend request from this user');
    }

    // Remove from both users' pending lists
    await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          added: removeFromJsonArray(user.added, targetId),
        },
      }),
      this.prisma.user.update({
        where: { id: targetId },
        data: {
          adding: removeFromJsonArray(target.adding, userId),
        },
      }),
    ]);

    return { message: 'Friend request declined' };
  }

  // ==================== BLOCK SYSTEM ====================

  async blockUser(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new Error('Cannot block yourself');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const blocks = parseJsonArray(user.blocks);
    if (blocks.includes(targetId)) {
      throw new Error('User already blocked');
    }

    // Remove friendship if exists
    await this.removeFriend(userId, targetId).catch(() => {});

    // Add to blocks
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        blocks: addToJsonArray(user.blocks, targetId),
      },
    });

    return { message: 'User blocked' };
  }

  async unblockUser(userId: number, targetId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        blocks: removeFromJsonArray(user.blocks, targetId),
      },
    });

    return { message: 'User unblocked' };
  }

  async getBlockedUsers(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { blocks: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const blockIds = parseJsonArray(user.blocks);
    
    if (blockIds.length === 0) {
      return [];
    }

    const blocked = await this.prisma.user.findMany({
      where: {
        id: { in: blockIds },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    });

    return blocked;
  }
}
