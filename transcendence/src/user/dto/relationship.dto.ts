import { IsNotEmpty, IsNumber } from 'class-validator';

export class UserRelationshipDto {
  @IsNumber()
  @IsNotEmpty()
  targetUserId: number;
}
