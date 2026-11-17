import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

/**
 * POST /titles/table-info : titres affichés dans une vue tableau (liste,
 * watchlist, recommandés...), pour compléter leurs colonnes.
 */
export class TableInfoDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  title_ids!: string[];
}
