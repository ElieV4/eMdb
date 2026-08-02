import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/**
 * Filtres "type header" (genre/pays/studio/année de sortie/note IMDB/
 * listes) repris depuis la sidebar Filtres globale et intégrés au menu "⋮"
 * de chaque visuel dataviz, à la place du header (le header ne s'affiche
 * plus sur la page Profil).
 *
 * "Statut" (vu/non vu) et "Type" (film/série) du header n'ont pas de sens
 * ici sous cette forme : `user_watches` ne contient par nature que des
 * titres déjà vus (statut absent), et "Type" existe dans le module dataviz
 * sous deux formes distinctes et plus riches — filtre `mediaType` et
 * groupement `mediaType` (cf. `dataviz-query.dto.ts`).
 *
 * Hérité par `DatavizQueryDto` (endpoint unique `GET /dataviz/query`) — les
 * ids sont validés en UUID car interpolés tels quels dans le SQL brut du
 * service (mêmes garanties que `userId`, extrait du JWT).
 */
export class DatavizFilterQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsUUID('4', { each: true })
  genreIds?: string[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsUUID('4', { each: true })
  countryIds?: string[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsUUID('4', { each: true })
  studioIds?: string[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsUUID('4', { each: true })
  listIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  releaseYearMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  releaseYearMax?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  noteImdbMin?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  noteImdbMax?: number;
}
