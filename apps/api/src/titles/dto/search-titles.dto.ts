import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour GET /titles/search?q=&type=film|serie&page=
 * Recherche un titre via TMDB + résultats locaux, fusionnés.
 */
export class SearchTitlesDto {
  @IsString()
  @IsNotEmpty()
  q!: string;

  @IsOptional()
  @IsEnum(['film', 'serie'])
  type?: 'film' | 'serie';

  // Transmis directement à TMDB (search/movie, search/tv — 1 page TMDB =
  // ~20 résultats par source) pour le scroll infini sur /search.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
