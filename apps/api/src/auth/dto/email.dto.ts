import { IsEmail } from 'class-validator';

/** Corps des endpoints qui ne prennent qu'un email (mot de passe oublié, renvoi de confirmation). */
export class EmailDto {
  @IsEmail()
  email!: string;
}
