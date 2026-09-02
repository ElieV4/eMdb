import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** DTO pour PATCH /settings/free-watch-sites/:id. */
export class UpdateFreeWatchSiteDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  url_recherche?: string;

  @IsOptional()
  @IsString()
  url_directe?: string;

  @IsOptional()
  @IsString()
  selecteur_resultat?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
