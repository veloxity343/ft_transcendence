import { IsNotEmpty, IsNumber, IsString, IsEnum } from 'class-validator';
import { UserStatus } from '../types';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  roomName: string;
}

export class LeaveRoomDto {
  @IsString()
  @IsNotEmpty()
  roomName: string;
}

export class UpdateStatusDto {
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;
}

export class SendMessageDto {
  @IsNumber()
  @IsNotEmpty()
  targetUserId?: number;

  @IsString()
  @IsNotEmpty()
  roomName?: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
