import { ArrayMinSize, IsArray, IsEnum, IsOptional } from 'class-validator';

/**
 * Contexte de visionnage — saisi uniquement a posteriori (jamais à la
 * création du watch, cf. WatchesController), modifiable/effaçable ensuite.
 * Mêmes valeurs à répliquer côté front (apps/web/src/lib/watchContext.ts).
 *
 * `support`/`compagnie` : un seul choix par visionnage. `emotion` : plusieurs
 * choix possibles (tableau, `user_watches.emotion TEXT[]`) — un visionnage
 * peut avoir été à la fois "émouvant" et "enthousiasmant".
 */
export const WATCH_SUPPORT_VALUES = ['ordinateur', 'tv', 'telephone', 'cinema'] as const;
export const WATCH_COMPAGNIE_VALUES = ['seul', 'accompagne'] as const;
export const WATCH_EMOTION_VALUES = [
  'content',
  'triste',
  'emu',
  'enthousiaste',
  'decu',
  'tendu',
  'effraye',
  'neutre',
] as const;

export class UpdateWatchContextDto {
  @IsOptional()
  @IsEnum(WATCH_SUPPORT_VALUES)
  support?: string | null;

  @IsOptional()
  @IsEnum(WATCH_COMPAGNIE_VALUES)
  compagnie?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WATCH_EMOTION_VALUES, { each: true })
  emotion?: string[] | null;
}
