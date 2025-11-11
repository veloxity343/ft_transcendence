import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  async generate2FA(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const secret = authenticator.generateSecret();
    const appName = this.config.get<string>('twoFA.appName');
    if (!appName) {
        throw new Error('Missing twoFA.appName in config');
    }

    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFAsecret: secret },
    });

    return {
      secret,
      otpauthUrl,
    };
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return toDataURL(otpauthUrl);
  }

  async turnOn2FA(userId: number, twoFAcode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFAsecret) {
      throw new UnauthorizedException('2FA not configured');
    }

    const isValid = this.verify2FACode(twoFAcode, user.twoFAsecret);

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFA: true },
    });

    return this.authService.signTokens(userId, user.email, true);
  }

  async turnOff2FA(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFA: false, twoFAsecret: null },
    });

    return this.authService.signTokens(userId, user.email, false);
  }

  async authenticate2FA(username: string, twoFAcode: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: username }, { username: username }],
      },
    });

    if (!user || !user.twoFAsecret) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = this.verify2FACode(twoFAcode, user.twoFAsecret);

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    const tokens = await this.authService.signTokens(user.id, user.email, true);
    await this.authService.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  verify2FACode(code: string, secret: string): boolean {
    return authenticator.verify({
      token: code,
      secret: secret,
    });
  }
}
