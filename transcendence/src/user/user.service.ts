import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as argon from 'argon2';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from './dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // ==================== READ OPERATIONS ====================

  async getUser(id: number): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return plainToInstance(UserDto, user);
  }

  async getUserByUsername(username: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return plainToInstance(UserDto, user);
  }

  async getUserByEmail(email: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return plainToInstance(UserDto, user);
  }

  async getLeaderboard(limit: number = 100) {
    const users = await this.prisma.user.findMany({
      where: {
        gamesPlayed: {
          gt: 0,
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
        rank: 'asc',
      },
      take: limit,
    });

    return users;
  }

  async searchUsers(query: string, limit: number = 10) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
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

  // ==================== UPDATE PROFILE ====================

  async updateUsername(userId: number, newUsername: string): Promise<UserDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { username: newUsername },
      });

      return plainToInstance(UserDto, user);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ForbiddenException('Username already taken');
      }
      throw error;
    }
  }

  async updateEmail(userId: number, newEmail: string): Promise<UserDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      });

      return plainToInstance(UserDto, user);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ForbiddenException('Email already taken');
      }
      throw error;
    }
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await argon.verify(user.hash, currentPassword);

    if (!passwordMatches) {
      throw new ForbiddenException('Current password is incorrect');
    }

    const newHash = await argon.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { hash: newHash },
    });

    return { message: 'Password updated successfully' };
  }

  async updateAvatar(userId: number, avatarFilename: string): Promise<UserDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarFilename },
    });

    return plainToInstance(UserDto, user);
  }

  // ==================== FRIEND SYSTEM ====================

  async getFriends(userId: number): Promise<UserDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { friends: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const friends = await this.prisma.user.findMany({
      where: {
        id: { in: user.friends },
      },
    });

    return friends.map(friend => plainToInstance(UserDto, friend));
  }

  async getPendingSent(userId: number): Promise<UserDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { adding: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const pending = await this.prisma.user.findMany({
      where: {
        id: { in: user.adding },
      },
    });

    return pending.map(u => plainToInstance(UserDto, u));
  }

  async getPendingReceived(userId: number): Promise<UserDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { added: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const pending = await this.prisma.user.findMany({
      where: {
        id: { in: user.added },
      },
    });

    return pending.map(u => plainToInstance(UserDto, u));
  }

  async isFriend(userId: number, targetId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { friends: true },
    });

    return (user?.friends.includes(targetId) ?? false);
  }

  async addFriend(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new BadRequestException('Cannot add yourself as friend');
    }

    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: targetId } }),
    ]);

    if (!user || !target) {
      throw new NotFoundException('User not found');
    }

    // Check if already friends
    if (user.friends.includes(targetId)) {
      throw new BadRequestException('Already friends');
    }

    // Check if already sent invite
    if (user.adding.includes(targetId)) {
      throw new BadRequestException('Friend request already sent');
    }

    // Check if blocked
    if (user.blocks.includes(targetId) || target.blocks.includes(userId)) {
      throw new BadRequestException('Cannot add this user');
    }

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Add to sender's adding list
      await tx.user.update({
        where: { id: userId },
        data: {
          adding: {
            push: targetId,
          },
        },
      });

      // Add to receiver's added list
      await tx.user.update({
        where: { id: targetId },
        data: {
          added: {
            push: userId,
          },
        },
      });

      // Check if mutual - both have sent requests
      const updatedTarget = await tx.user.findUnique({
        where: { id: targetId },
      });

      // Fix: Add null check
      if (updatedTarget && updatedTarget.adding.includes(userId)) {
        // Mutual friend request - make them friends
        await this.finalizeFriendship(userId, targetId, tx);
      }
    });

    return { message: 'Friend request sent' };
  }

  private async finalizeFriendship(userId: number, targetId: number, tx: any) {
    const [user, target] = await Promise.all([
      tx.user.findUnique({ where: { id: userId } }),
      tx.user.findUnique({ where: { id: targetId } }),
    ]);

    // Fix: Add null checks
    if (!user || !target) {
      throw new NotFoundException('User not found during finalization');
    }

    // Remove from adding/added lists
    const userAdding = user.adding.filter(id => id !== targetId);
    const userAdded = user.added.filter(id => id !== targetId);
    const targetAdding = target.adding.filter(id => id !== userId);
    const targetAdded = target.added.filter(id => id !== userId);

    // Update both users
    await Promise.all([
      tx.user.update({
        where: { id: userId },
        data: {
          adding: userAdding,
          added: userAdded,
          friends: {
            push: targetId,
          },
        },
      }),
      tx.user.update({
        where: { id: targetId },
        data: {
          adding: targetAdding,
          added: targetAdded,
          friends: {
            push: userId,
          },
        },
      }),
    ]);
  }

  async removeFriend(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new BadRequestException('Invalid operation');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.friends.includes(targetId)) {
      throw new BadRequestException('Not friends');
    }

    await this.prisma.$transaction(async (tx) => {
      const [user, target] = await Promise.all([
        tx.user.findUnique({ where: { id: userId } }),
        tx.user.findUnique({ where: { id: targetId } }),
      ]);

      // Fix: Add null checks
      if (!user || !target) {
        throw new NotFoundException('User not found');
      }

      await Promise.all([
        tx.user.update({
          where: { id: userId },
          data: {
            friends: user.friends.filter(id => id !== targetId),
          },
        }),
        tx.user.update({
          where: { id: targetId },
          data: {
            friends: target.friends.filter(id => id !== userId),
          },
        }),
      ]);
    });

    return { message: 'Friend removed' };
  }

  async cancelFriendRequest(userId: number, targetId: number) {
    await this.prisma.$transaction(async (tx) => {
      const [user, target] = await Promise.all([
        tx.user.findUnique({ where: { id: userId } }),
        tx.user.findUnique({ where: { id: targetId } }),
      ]);

      if (!user || !target) {
        throw new NotFoundException('User not found');
      }

      await Promise.all([
        tx.user.update({
          where: { id: userId },
          data: {
            adding: user.adding.filter(id => id !== targetId),
          },
        }),
        tx.user.update({
          where: { id: targetId },
          data: {
            added: target.added.filter(id => id !== userId),
          },
        }),
      ]);
    });

    return { message: 'Friend request cancelled' };
  }

  async denyFriendRequest(userId: number, targetId: number) {
    // Deny is the reverse of cancel - target is cancelling user's request
    return this.cancelFriendRequest(targetId, userId);
  }

  // ==================== BLOCK SYSTEM ====================

  async getBlockedUsers(userId: number): Promise<UserDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { blocks: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const blocked = await this.prisma.user.findMany({
      where: {
        id: { in: user.blocks },
      },
    });

    return blocked.map(u => plainToInstance(UserDto, u));
  }

  async isBlocked(userId: number, targetId: number): Promise<boolean> {
    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { blocks: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetId },
        select: { blocks: true },
      }),
    ]);

    return (
      (user?.blocks.includes(targetId) ?? false) ||
      (target?.blocks.includes(userId) ?? false)
    );
  }

  async blockUser(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.blocks.includes(targetId)) {
      throw new BadRequestException('User already blocked');
    }

    await this.prisma.$transaction(async (tx) => {
      const [user, target] = await Promise.all([
        tx.user.findUnique({ where: { id: userId } }),
        tx.user.findUnique({ where: { id: targetId } }),
      ]);

      // Fix: Add null checks
      if (!user || !target) {
        throw new NotFoundException('User not found');
      }

      // Remove friendship if exists
      const userFriends = user.friends.filter(id => id !== targetId);
      const targetFriends = target.friends.filter(id => id !== userId);

      // Remove pending requests
      const userAdding = user.adding.filter(id => id !== targetId);
      const userAdded = user.added.filter(id => id !== targetId);
      const targetAdding = target.adding.filter(id => id !== userId);
      const targetAdded = target.added.filter(id => id !== userId);

      await Promise.all([
        tx.user.update({
          where: { id: userId },
          data: {
            blocks: {
              push: targetId,
            },
            friends: userFriends,
            adding: userAdding,
            added: userAdded,
          },
        }),
        tx.user.update({
          where: { id: targetId },
          data: {
            friends: targetFriends,
            adding: targetAdding,
            added: targetAdded,
          },
        }),
      ]);
    });

    return { message: 'User blocked' };
  }

  async unblockUser(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new BadRequestException('Invalid operation');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.blocks.includes(targetId)) {
      throw new BadRequestException('User not blocked');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        blocks: user.blocks.filter(id => id !== targetId),
      },
    });

    return { message: 'User unblocked' };
  }

  // ==================== GAME STATS ====================

  async updateGameStats(
    winnerId: number,
    loserId: number,
    gameId: number,
    duration: number,
  ) {
    const [winner, loser] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: winnerId } }),
      this.prisma.user.findUnique({ where: { id: loserId } }),
    ]);

    if (!winner || !loser) {
      throw new NotFoundException('User not found');
    }

    // Calculate new ELO scores
    const [newWinnerScore, newLoserScore] = this.calculateEloScores(
      winner.score,
      loser.score,
    );

    // Update both users in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update winner
      const winnerGamesPlayed = winner.gamesPlayed + 1;
      const winnerGamesWon = winner.gamesWon + 1;
      const winnerWinRate = winnerGamesWon / winnerGamesPlayed;

      await tx.user.update({
        where: { id: winnerId },
        data: {
          gamesWon: winnerGamesWon,
          gamesPlayed: winnerGamesPlayed,
          winRate: winnerWinRate,
          playTime: winner.playTime + duration,
          score: Math.floor(newWinnerScore),
          gameHistory: {
            push: gameId,
          },
        },
      });

      // Update loser
      const loserGamesPlayed = loser.gamesPlayed + 1;
      const loserGamesWon = loser.gamesWon;
      const loserWinRate = loserGamesWon / loserGamesPlayed;

      await tx.user.update({
        where: { id: loserId },
        data: {
          gamesLost: loser.gamesLost + 1,
          gamesPlayed: loserGamesPlayed,
          winRate: loserWinRate,
          playTime: loser.playTime + duration,
          score: Math.floor(newLoserScore),
          gameHistory: {
            push: gameId,
          },
        },
      });
    });

    // Update ranks after score changes
    await this.updateRanks();
  }

  private calculateEloScores(winnerRating: number, loserRating: number): [number, number] {
    const K = 32; // K-factor
    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

    const newWinnerRating = winnerRating + K * (1 - expectedWinner);
    const newLoserRating = loserRating + K * (0 - expectedLoser);

    return [newWinnerRating, newLoserRating];
  }

  async updateRanks() {
    const users = await this.prisma.user.findMany({
      where: {
        score: {
          not: 1200, // Exclude users with default score
        },
      },
      orderBy: {
        score: 'desc',
      },
      select: {
        id: true,
      },
    });

    // Update ranks in batches
    const updates = users.map((user, index) =>
      this.prisma.user.update({
        where: { id: user.id },
        data: { rank: index + 1 },
      }),
    );

    await Promise.all(updates);
  }

  async getGameHistory(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gameHistory: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.gameHistory.length === 0) {
      return [];
    }

    const games = await this.prisma.game.findMany({
      where: {
        id: {
          in: user.gameHistory,
        },
      },
      orderBy: {
        endTime: 'desc',
      },
    });

    // Format games from user's perspective
    const formattedGames = await Promise.all(
      games.map(async (game) => {
        const isPlayer1 = game.player1 === userId;
        const opponentId = isPlayer1 ? game.player2 : game.player1;
        const opponent = await this.getUser(opponentId);

        return {
          gameId: game.id,
          opponentId: opponent.id,
          opponentUsername: opponent.username,
          opponentAvatar: opponent.avatar,
          opponentRank: opponent.rank,
          userScore: isPlayer1 ? game.score1 : game.score2,
          opponentScore: isPlayer1 ? game.score2 : game.score1,
          victory: isPlayer1 ? game.score1 > game.score2 : game.score2 > game.score1,
          duration: game.duration,
          playedAt: game.endTime,
        };
      }),
    );

    return formattedGames;
  }
}
