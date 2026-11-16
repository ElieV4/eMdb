import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO pour l'ajout d'un membre à une liste (POST /lists/:listId/shares).
 *
 * Les droits du membre ne se choisissent pas ici : ils découlent du mode de
 * partage de la liste (user_lists.share_mode, cf. PATCH /lists/:listId/share-mode).
 */
export class ShareListDto {
  @IsUUID()
  @IsNotEmpty()
  shared_with_user_id!: string;
}
