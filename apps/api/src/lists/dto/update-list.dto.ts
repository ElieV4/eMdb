import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO pour la modification d'une liste (PATCH /lists/:id).
 *
 * Seuls nom et description sont modifiables (le type est figé).
 */
export class UpdateListDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Emoji affiché devant le nom (facultatif ; chaîne vide ou null = aucun). */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  emoji?: string | null;
}
