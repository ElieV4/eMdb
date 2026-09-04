import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsIn(['android'])
  platform!: string;
}
