import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** PATCH /lists/:listId/groups/:groupId — renomme un sous-groupe. */
export class UpdateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom!: string;
}
