import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour GET /studios/search?q=&page=
 * Recherche locale uniquement (studios.nom) — contrairement aux titres/
 * personnes, les studios ne sont jamais recherchés/importés à la volée
 * depuis TMDB dans cette app : la table `studios` n'est peuplée que
 * passivement (production companies des titres déjà importés).
 */
export class SearchStudiosDto {
  @IsString()
  @IsNotEmpty()
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
