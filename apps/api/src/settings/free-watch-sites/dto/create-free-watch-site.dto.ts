import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO pour POST /settings/free-watch-sites.
 *
 * `url_recherche` est le seul champ technique requis (avec `nom`) : template
 * avec `{query}` (titre à chercher, encodé automatiquement), ex.
 * `https://exemple.com/?s={query}`.
 *
 * `url_directe`/`selecteur_resultat` sont optionnels ("avancé") — cf.
 * apps/api/src/watch-links.util.ts pour le détail de leur usage par l'algo.
 * `url_directe` supporte `{slug}` (titre slugifié) et `{type}` ("movie" ou
 * "series"), ex. `https://exemple.com/{type}/{slug}/`.
 */
export class CreateFreeWatchSiteDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsString()
  @IsNotEmpty()
  url_recherche!: string;

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
