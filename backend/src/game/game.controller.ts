import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { GameService } from './game.service';
import { CurrentUserId } from '../common/decorators';

@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  @Get('active')
  getActiveGames() {
    return this.gameService.getActiveGames();
  }

  @Get('spectate/:gameId')
  spectateGame(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.gameService.spectateGame(gameId);
  }
}
