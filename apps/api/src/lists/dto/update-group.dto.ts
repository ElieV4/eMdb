import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** PATCH /lists/:listId/groups/:groupId — renomme un sous-groupe. */
export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom?: string;

  /** Emoji affiché devant le nom (facultatif ; chaîne vide ou null = aucun). */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  emoji?: string | null;
}
