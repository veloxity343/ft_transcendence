import { Body, Controller, Get, Post, Req, Res, UseGuards, InternalServerErrorException } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CurrentUser, CurrentUserId, Public } from '../common/decorators';
import { AuthService } from './auth.service';
import { SignInDto, SignUpDto, AuthTokensDto } from './dto';
import { FortyTwoGuard, JwtRefreshGuard } from './guards';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Post('signup')
  signup(@Body() dto: SignUpDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('signin')
  signin(@Body() dto: SignInDto) {
    return this.authService.signin(dto);
  }

  @Post('signout')
  async signout(@CurrentUserId() userId: number) {
    await this.authService.signout(userId);
    return { message: 'Signed out successfully' };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refreshTokens(
    @CurrentUserId() userId: number,
    @CurrentUser('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Public()
  @UseGuards(FortyTwoGuard)
  @Get('42')
  signin42() {
    // Guard handles redirect
  }

  @Public()
  @UseGuards(FortyTwoGuard)
  @Get('42/callback')
  async callback42(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.signin42(req.user);

    const front = this.config.get<string>('frontUrl');
    if (!front) {
      throw new InternalServerErrorException('Missing frontUrl configuration');
    }

    // 2FA Required Flow
    if ('requires2FA' in result && result.requires2FA) {
      const url = new URL(front);
      url.pathname = '/2fa';
      url.searchParams.append('username', result.username);
      return res.redirect(url.toString());
    }

    // Normal Auth Token Flow (type is narrowed to AuthTokensDto)
    const tokens = result as AuthTokensDto;
    const url = new URL(front);
    url.pathname = '/auth';
    url.searchParams.append('access_token', tokens.access_token);
    return res.redirect(url.toString());
  }

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return user;
  }
}
