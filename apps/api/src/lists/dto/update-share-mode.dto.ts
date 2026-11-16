import { IsIn } from 'class-validator';
import { SHARE_MODES, ShareMode } from '../list-permissions';

/**
 * DTO pour changer le mode de partage d'une liste
 * (PATCH /lists/:listId/share-mode).
 *
 * - lecture : les membres voient la liste
 * - collaboratif : les membres peuvent aussi réordonner, changer les statuts et renommer
 * - ouvert : les membres peuvent aussi ajouter et retirer des titres
 */
export class UpdateShareModeDto {
  @IsIn(SHARE_MODES)
  share_mode!: ShareMode;
}
