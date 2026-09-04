import { IsNotEmpty, IsString } from 'class-validator';

export class UnregisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
