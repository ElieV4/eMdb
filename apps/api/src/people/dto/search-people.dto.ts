import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour GET /people/search?q=&page=
 * Recherche une personne via TMDB + résultats locaux, fusionnés.
 */
export class SearchPeopleDto {
  @IsString()
  @IsNotEmpty()
  q!: string;

  // Transmis directement à TMDB (search/person — 1 page TMDB = ~20
  // résultats) pour le scroll infini sur /search.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
