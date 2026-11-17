import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional } from 'class-validator';

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
/**
 * Tags d'émotion (évaluation par émotion), dans l'ordre d'affichage. Mêmes
 * valeurs, emojis et couleurs côté front (apps/web/src/lib/watchContext.ts).
 */
export const WATCH_EMOTIONS = [
  { value: 'joie', emoji: '😄', label: 'Joie' },
  { value: 'rire', emoji: '😂', label: 'Rire' },
  { value: 'emerveillement', emoji: '✨', label: 'Émerveillement' },
  { value: 'tendresse', emoji: '🥹', label: 'Tendresse' },
  { value: 'nostalgie', emoji: '🕰️', label: 'Nostalgie' },
  { value: 'tristesse', emoji: '😢', label: 'Tristesse' },
  { value: 'choc', emoji: '🤯', label: 'Choc' },
  { value: 'fascination', emoji: '🧠', label: 'Fascination' },
  { value: 'tension', emoji: '😬', label: 'Tension' },
  { value: 'peur', emoji: '😱', label: 'Peur' },
  { value: 'revolte', emoji: '😡', label: 'Révolte' },
  { value: 'malaise', emoji: '🤢', label: 'Malaise' },
] as const;

export const WATCH_EMOTION_VALUES = WATCH_EMOTIONS.map((e) => e.value);

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

  /** Corriger la date/heure du visionnage (ISO 8601, pas dans le futur). */
  @IsOptional()
  @IsDateString()
  date_vue?: string;
}
