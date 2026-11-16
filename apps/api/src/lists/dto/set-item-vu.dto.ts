import { IsBoolean } from 'class-validator';

/**
 * PATCH /lists/:listId/items/:titleId/vu — marque un titre comme vu (ou non)
 * dans le cadre de la liste. Un seul état partagé par tous les membres.
 */
export class SetItemVuDto {
  @IsBoolean()
  vu!: boolean;
}
