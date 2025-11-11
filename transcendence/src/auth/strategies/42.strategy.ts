import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-42';

export interface Profile42 {
  id: number;
  username: string;
  email: string;
  avatar: string;
}

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
  constructor(private config: ConfigService) {
    super({
      clientID: config.get('oauth42.clientId'),
      clientSecret: config.get('oauth42.clientSecret'),
      callbackURL: config.get('oauth42.callbackUrl'),
      profileFields: {
        id: 'id',
        username: 'login',
        email: 'email',
        avatar: 'image.link',
      },
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile42,
  ): Promise<Profile42> {
    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      avatar: profile.avatar,
    };
  }
}
