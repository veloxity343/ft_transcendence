import { Body, Controller, Get, Post, Query, Param, ParseIntPipe } from '@nestjs/common';
import { CurrentUserId } from '../common/decorators';
import { UserService } from './user.service';
import {
  UpdateUsernameDto,
  UpdateEmailDto,
  UpdatePasswordDto,
  UserRelationshipDto,
} from './dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  // ==================== PROFILE ====================

  @Get('me')
  getMe(@CurrentUserId() userId: number) {
    return this.userService.getUser(userId);
  }

  @Get('search')
  searchUsers(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.userService.searchUsers(query, limit);
  }

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: number) {
    return this.userService.getLeaderboard(limit);
  }

  @Get(':id')
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUser(id);
  }

  @Post('update-username')
  updateUsername(
    @CurrentUserId() userId: number,
    @Body() dto: UpdateUsernameDto,
  ) {
    return this.userService.updateUsername(userId, dto.username);
  }

  @Post('update-email')
  updateEmail(
    @CurrentUserId() userId: number,
    @Body() dto: UpdateEmailDto,
  ) {
    return this.userService.updateEmail(userId, dto.email);
  }

  @Post('update-password')
  updatePassword(
    @CurrentUserId() userId: number,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.userService.updatePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // ==================== FRIENDS ====================

  @Get('friends/list')
  getFriends(@CurrentUserId() userId: number) {
    return this.userService.getFriends(userId);
  }

  @Get('friends/pending-sent')
  getPendingSent(@CurrentUserId() userId: number) {
    return this.userService.getPendingSent(userId);
  }

  @Get('friends/pending-received')
  getPendingReceived(@CurrentUserId() userId: number) {
    return this.userService.getPendingReceived(userId);
  }

  @Post('friends/add')
  addFriend(
    @CurrentUserId() userId: number,
    @Body() dto: UserRelationshipDto,
  ) {
    return this.userService.addFriend(userId, dto.targetUserId);
  }

  @Post('friends/remove')
  removeFriend(
    @CurrentUserId() userId: number,
    @Body() dto: UserRelationshipDto,
  ) {
    return this.userService.removeFriend(userId, dto.targetUserId);
  }

  @Post('friends/cancel')
  cancelFriendRequest(
    @CurrentUserId() userId: number,
    @Body() dto: UserRelationshipDto,
  ) {
    return this.userService.cancelFriendRequest(userId, dto.targetUserId);
  }

  @Post('friends/deny')
  denyFriendRequest(
    @CurrentUserId() userId: number,
    @Body() dto: UserRelationshipDto,
  ) {
    return this.userService.denyFriendRequest(userId, dto.targetUserId);
  }

  @Get('friends/is-friend/:targetId')
  isFriend(
    @CurrentUserId() userId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    return this.userService.isFriend(userId, targetId);
  }

  // ==================== BLOCKING ====================

  @Get('blocks/list')
  getBlockedUsers(@CurrentUserId() userId: number) {
    return this.userService.getBlockedUsers(userId);
  }

  @Post('blocks/block')
  blockUser(
    @CurrentUserId() userId: number,
    @Body() dto: UserRelationshipDto,
  ) {
    return this.userService.blockUser(userId, dto.targetUserId);
  }

  @Post('blocks/unblock')
  unblockUser(
    @CurrentUserId() userId: number,
    @Body() dto: UserRelationshipDto,
  ) {
    return this.userService.unblockUser(userId, dto.targetUserId);
  }

  @Get('blocks/is-blocked/:targetId')
  isBlocked(
    @CurrentUserId() userId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    return this.userService.isBlocked(userId, targetId);
  }

  // ==================== GAME STATS ====================

  @Get('game-history')
  getGameHistory(@CurrentUserId() userId: number) {
    return this.userService.getGameHistory(userId);
  }

  @Get('game-history/:userId')
  getUserGameHistory(@Param('userId', ParseIntPipe) userId: number) {
    return this.userService.getGameHistory(userId);
  }
}
