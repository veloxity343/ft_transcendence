import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, CurrentUserId } from '../../common/decorators';
import { TwoFactorDto, VerifyTwoFactorDto } from '../dto';
import { TwoFactorService } from './2fa.service';
import { Public } from '../../common/decorators';

@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private twoFAService: TwoFactorService) {}

  @Get('generate')
  async generate(@CurrentUserId() userId: number, @Res() res: Response) {
    const { otpauthUrl } = await this.twoFAService.generate2FA(userId);
    const qrCode = await this.twoFAService.generateQRCode(otpauthUrl);
    return res.json({ qrCode });
  }

  @Post('turn-on')
  async turnOn(
    @CurrentUserId() userId: number,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    return this.twoFAService.turnOn2FA(userId, dto.twoFAcode);
  }

  @Post('turn-off')
  async turnOff(@CurrentUserId() userId: number) {
    return this.twoFAService.turnOff2FA(userId);
  }

  @Public()
  @Post('authenticate')
  async authenticate(@Body() dto: TwoFactorDto) {
    return this.twoFAService.authenticate2FA(dto.username, dto.twoFAcode);
  }
}
