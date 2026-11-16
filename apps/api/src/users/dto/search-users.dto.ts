import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** GET /users/search?query= : fragment de pseudo (2 car. min.) ou email exact. */
export class SearchUsersDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  query!: string;
}
