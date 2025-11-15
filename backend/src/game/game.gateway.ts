import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { GameService } from './game.service';
import { MovePaddleDto, JoinPrivateGameDto, GameInvitationDto } from './dto';
import { EventsGateway } from '../events/events/events.gateway';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONT_URL || 'http://localhost:5173',
    credentials: true,
  },
})
@UsePipes(new ValidationPipe())
export class GameGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private gameService: GameService,
    private eventsGateway: EventsGateway,
  ) {}

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    
    if (userId) {
      this.gameService.handleDisconnect(userId);
    }
  }

  // ==================== MATCHMAKING ====================

  @SubscribeMessage('game:join-matchmaking')
  async handleJoinMatchmaking(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    try {
      const playerInfo = await this.gameService.joinMatchmaking(userId);
      return playerInfo;
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  // ==================== PRIVATE GAMES ====================

  @SubscribeMessage('game:create-private')
  async handleCreatePrivate(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    try {
      const playerInfo = await this.gameService.createPrivateGame(userId);
      return playerInfo;
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('game:join-private')
  async handleJoinPrivate(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinPrivateGameDto,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    try {
      const playerInfo = await this.gameService.joinPrivateGame(userId, dto.gameId);
      return playerInfo;
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('game:send-invitation')
  async handleSendInvitation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: GameInvitationDto,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    try {
      // Create private game
      const playerInfo = await this.gameService.createPrivateGame(userId);

      // Send invitation to target user
      this.eventsGateway.emitToUser(dto.targetUserId, 'game-invitation', {
        from: userId,
        gameId: playerInfo.gameId,
        inviterName: playerInfo.playerName,
      });

      return { success: true, gameId: playerInfo.gameId };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  // ==================== GAMEPLAY ====================

  @SubscribeMessage('game:move')
  handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: MovePaddleDto,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    try {
      this.gameService.movePaddle(userId, dto.gameId, dto.direction);
      return { success: true };
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  // ==================== SPECTATING ====================

  @SubscribeMessage('game:spectate')
  async handleSpectate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: number },
  ) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    try {
      const gameState = await this.gameService.spectateGame(data.gameId);
      
      // Join game room as spectator
      this.eventsGateway.addUserToRoom(userId, `game-${data.gameId}`);

      return gameState;
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('game:get-active')
  handleGetActiveGames(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    if (!userId) {
      throw new WsException('Unauthorized');
    }

    return this.gameService.getActiveGames();
  }
}
