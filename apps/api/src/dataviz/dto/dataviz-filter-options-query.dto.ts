import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO pour `GET /dataviz/filters/{titles,actors,directors,studios}`.
 *
 * Sans `q` : les 20 entités les plus regardées par l'utilisateur (nombre de
 * visionnages décroissant). Avec `q` : recherche parmi les entités déjà
 * regardées par l'utilisateur (jamais tout le catalogue local) — les menus
 * "Titre"/"Acteur"/"Réalisateur"/"Studio" du module dataviz ne servent qu'à
 * filtrer les propres statistiques de l'utilisateur, pas à parcourir la base.
 */
export class DatavizFilterOptionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
