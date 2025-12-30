/**
 * Authentication Service
 * Handles user authentication, password hashing, and refresh token management
 * Uses Argon2 for secure password hashing (resistant to GPU attacks)
 */
import { PrismaClient } from '@prisma/client';
import * as argon from 'argon2';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Register a new user
   * Hashes password with Argon2 before storage
   * @throws Error if email or username already exists (P2002 unique constraint violation)
   */
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

  /**
   * Authenticate user with credentials
   * Supports login with either email or username
   * Returns partial object if 2FA is required, full user object otherwise
   * @throws Error if user doesn't exist or password is invalid
   */
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

  /**
   * Sign out user by invalidating their refresh token
   * This prevents the refresh token from being used again
   */
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

  /**
   * Store hashed refresh token for user
   * Called when issuing new tokens
   */
  async updateRefreshToken(userId: number, refreshToken: string) {
    const hash = await argon.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRtoken: hash },
    });
  }

  /**
   * Verify refresh token and return user for token refresh
   * Validates that the provided token matches the stored hash
   * @throws Error if token is invalid or user has no stored token
   */
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
