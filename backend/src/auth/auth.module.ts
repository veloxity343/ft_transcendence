import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy, JwtRefreshStrategy, FortyTwoStrategy } from './strategies';
import { TwoFactorController } from './2fa/2fa.controller';
import { TwoFactorService } from './2fa/2fa.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, TwoFactorController],
  providers: [
    AuthService,
    TwoFactorService,
    JwtStrategy,
    JwtRefreshStrategy,
    FortyTwoStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}

