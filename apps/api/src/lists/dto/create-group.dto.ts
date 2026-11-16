import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** POST /lists/:listId/groups — crée un sous-groupe (à la racine ou sous `parent_id`). */
export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom!: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;
}
