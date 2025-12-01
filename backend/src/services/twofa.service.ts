import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { config } from '../config/config';

export class TwoFactorService {
  constructor(private prisma: PrismaClient) {}

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

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return toDataURL(otpauthUrl);
  }

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

  async turnOff2FA(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFA: false, twoFAsecret: null },
    });
  }

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

  verify2FACode(code: string, secret: string): boolean {
    return authenticator.verify({
      token: code,
      secret: secret,
    });
  }
}
