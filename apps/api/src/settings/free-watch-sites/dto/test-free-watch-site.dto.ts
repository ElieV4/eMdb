import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour POST /settings/free-watch-sites/test — lance l'algo sur une
 * config (pas forcément déjà enregistrée : sert autant à tester un
 * brouillon en cours de saisie qu'un site déjà sauvegardé) et un titre
 * d'exemple.
 */
export class TestFreeWatchSiteDto {
  @IsString()
  @IsNotEmpty()
  url_recherche!: string;

  @IsOptional()
  @IsString()
  url_directe?: string;

  @IsOptional()
  @IsString()
  selecteur_resultat?: string;

  @IsString()
  @IsNotEmpty()
  titreVo!: string;

  @IsEnum(['film', 'serie'])
  type!: 'film' | 'serie';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  anneeSortie?: number;
}
