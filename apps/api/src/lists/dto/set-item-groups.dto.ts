import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

/**
 * PUT /lists/:listId/items/:titleId/groups — remplace les sous-groupes dans
 * lesquels un titre est rangé (tableau vide = rangé nulle part).
 */
export class SetItemGroupsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  group_ids!: string[];
}
