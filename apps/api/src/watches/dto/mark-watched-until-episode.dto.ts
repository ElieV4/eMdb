import { IsDate, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour "Vu jusqu'ici" (modification M) : marque comme vus tous les
 * épisodes non encore vus d'une série jusqu'à `episode_id` inclus.
 */
export class MarkWatchedUntilEpisodeDto {
  @IsUUID()
  @IsNotEmpty()
  episode_id!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_vue?: Date;
}
