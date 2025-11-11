import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto, SignUpDto, AuthTokensDto } from './dto';
import { Profile42 } from './strategies/42.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: SignUpDto): Promise<AuthTokensDto> {
    const hash = await argon.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          hash,
        },
      });

      const tokens = await this.signTokens(user.id, user.email);
      await this.updateRefreshToken(user.id, tokens.refresh_token);

      return tokens;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ForbiddenException('Credentials already exist');
      }
      throw error;
    }
  }

  async signin(dto: SignInDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.username }, { username: dto.username }],
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }

    const pwMatches = await argon.verify(user.hash, dto.password);

    if (!pwMatches) {
      throw new ForbiddenException('Invalid credentials');
    }

    // If 2FA is enabled, return indication that 2FA is required
    if (user.twoFA) {
      return {
        requires2FA: true,
        username: user.username,
      };
    }

    const tokens = await this.signTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async signout(userId: number): Promise<void> {
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

  async refreshTokens(userId: number, refreshToken: string): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRtoken) {
      throw new ForbiddenException('Access denied');
    }

    const rtMatches = await argon.verify(user.hashedRtoken, refreshToken);

    if (!rtMatches) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.signTokens(user.id, user.email, user.twoFA);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async signin42(profile: Profile42) {
    let user = await this.prisma.user.findUnique({
      where: { id42: profile.id },
    });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-16);
      const hash = await argon.hash(randomPassword);

      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          username: profile.username,
          hash,
          id42: profile.id,
          avatar: profile.avatar,
        },
      });
    }

    // If 2FA is enabled, return indication
    if (user.twoFA) {
      return {
        requires2FA: true,
        username: user.username,
      };
    }

    const tokens = await this.signTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async signTokens(userId: number, email: string, is2FA = false): Promise<AuthTokensDto> {
    const payload = {
      sub: userId,
      email,
      is2FA,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        expiresIn: this.config.get('jwt.accessExpiration'),
        secret: this.config.get('jwt.secret'),
      }),
      this.jwt.signAsync(payload, {
        expiresIn: this.config.get('jwt.refreshExpiration'),
        secret: this.config.get('jwt.secret'),
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async updateRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const hash = await argon.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRtoken: hash },
    });
  }
}
