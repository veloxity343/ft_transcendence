import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: number;
  email: string;
  is2FA: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // User is logged out
    if (!user.hashedRtoken) {
      throw new UnauthorizedException('User is logged out');
    }

    // 2FA check
    if (user.twoFA && !payload.is2FA) {
      throw new UnauthorizedException('2FA required');
    }

    // Remove sensitive data
    const { hash, hashedRtoken, twoFAsecret, ...userWithoutSensitive } = user;

    return userWithoutSensitive;
  }
}
