import { IsEnum } from 'class-validator';

/**
 * Met à jour le statut de progression d'un item de la watchlist.
 * Statuts possibles : "en_cours" (défaut), "a_jour", "abandonnee".
 */
export class UpdateItemStatusDto {
  @IsEnum(['en_cours', 'a_jour', 'abandonnee'])
  statut!: 'en_cours' | 'a_jour' | 'abandonnee';
}