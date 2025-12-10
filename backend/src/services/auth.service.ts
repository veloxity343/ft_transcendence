import { PrismaClient } from '@prisma/client';
import * as argon from 'argon2';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async signup(email: string, username: string, password: string) {
    const hash = await argon.hash(password);

    try {
      const user = await this.prisma.user.create({
        data: { email, username, hash },
      });

      return {
        id: user.id,
        email: user.email,
        username: user.username,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Credentials already exist');
      }
      throw error;
    }
  }

  async signin(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: username }, { username: username }],
      },
    });

    if (!user) {
      throw new Error('Unknown user');
    }

    const pwMatches = await argon.verify(user.hash, password);

    if (!pwMatches) {
      throw new Error('Invalid credentials');
    }

    if (user.twoFA) {
      return { requires2FA: true, username: user.username };
    }

    return user;
  }

  async signout(userId: number) {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRtoken: { not: null },
      },
      data: {
        hashedRtoken: null,
      },
    });
  }

  async updateRefreshToken(userId: number, refreshToken: string) {
    const hash = await argon.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRtoken: hash },
    });
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRtoken) {
      throw new Error('Access denied');
    }

    const rtMatches = await argon.verify(user.hashedRtoken, refreshToken);

    if (!rtMatches) {
      throw new Error('Access denied');
    }

    return user;
  }
}
