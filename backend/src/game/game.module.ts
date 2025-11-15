import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { UserModule } from '../user/user.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [UserModule, EventsModule],
  controllers: [GameController],
  providers: [GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
