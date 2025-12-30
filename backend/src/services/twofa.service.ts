/**
 * Two-Factor Authentication Service
 * Implements TOTP (Time-based One-Time Password) for 2FA
 * Uses otplib for token generation and validation
 * Compatible with authenticator apps like Google Authenticator, Authy, etc.
 */
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { config } from '../config/config';

export class TwoFactorService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a new 2FA secret for user
   * Secret is stored but 2FA is not enabled until verified
   * @returns Secret and otpauth URL for QR code generation
   */
  async generate2FA(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      user.email,
      config.twoFA.appName,
      secret,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFAsecret: secret },
    });

    return { secret, otpauthUrl };
  }

  /**
   * Generate QR code image for 2FA setup
   * Returns base64 data URL that can be displayed directly in img tags
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    return toDataURL(otpauthUrl);
  }

  /**
   * Enable 2FA after verifying the code
   * Requires valid code to prove user has correctly set up their authenticator
   * @throws Error if code is invalid or 2FA not configured
   */
  async turnOn2FA(userId: number, twoFAcode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFAsecret) {
      throw new Error('2FA not configured');
    }

    const isValid = this.verify2FACode(twoFAcode, user.twoFAsecret);

    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFA: true },
    });

    return user;
  }

  /**
   * Disable 2FA and remove secret
   * User will need to set up 2FA again if they want to re-enable
   */
  async turnOff2FA(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFA: false, twoFAsecret: null },
    });
  }

  /**
   * Authenticate user with 2FA code during login
   * Called after username/password verification when 2FA is enabled
   * @throws Error if code is invalid
   */
  async authenticate2FA(username: string, twoFAcode: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: username }, { username: username }],
      },
    });

    if (!user || !user.twoFAsecret) {
      throw new Error('Invalid credentials');
    }

    const isValid = this.verify2FACode(twoFAcode, user.twoFAsecret);

    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    return user;
  }

  /**
   * Verify a 2FA code against a secret
   * Uses time-based algorithm with 30-second window
   * @returns true if code is valid, false otherwise
   */
  verify2FACode(code: string, secret: string): boolean {
    return authenticator.verify({
      token: code,
      secret: secret,
    });
  }
}
