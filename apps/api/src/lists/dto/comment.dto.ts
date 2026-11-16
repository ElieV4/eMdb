import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * POST /lists/:listId/items/:titleId/comments et PATCH /lists/:listId/comments/:id :
 * texte d'un commentaire partagé (1 à 2000 caractères).
 */
export class CommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  contenu!: string;
}
