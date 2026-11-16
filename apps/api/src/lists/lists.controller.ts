import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { AddItemDto } from './dto/add-item.dto';
import { ReorderDto } from './dto/reorder.dto';
import { ShareListDto } from './dto/share-list.dto';
import { UpdateShareModeDto } from './dto/update-share-mode.dto';
import { SetItemVuDto } from './dto/set-item-vu.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { SetItemGroupsDto } from './dto/set-item-groups.dto';
import { CommentDto } from './dto/comment.dto';

/**
 * Contrôleur du module lists (Phase 4.3).
 *
 * Tous les endpoints nécessitent une authentification JWT.
 *
 * Endpoints user_lists (5) :
 * - POST   /lists                       — Créer une liste
 * - GET    /lists                       — Liste des listes de l'utilisateur
 * - GET    /lists/:id                   — Détail d'une liste avec ses items
 * - PATCH  /lists/:id                   — Modifier nom/description
 * - DELETE /lists/:id                   — Supprimer une liste
 *
 * Endpoints list_items (3) :
 * - POST   /lists/:listId/items         — Ajouter un titre
 * - DELETE /lists/:listId/items/:titleId — Retirer un titre
 * - PATCH  /lists/:listId/items/reorder — Réordonnancement batch
 *
 * Endpoints "vu" et sous-groupes (5) — mêmes droits que le contenu :
 * - PATCH  /lists/:listId/items/:titleId/vu      — Vu / pas vu (partagé par tous les membres)
 * - PUT    /lists/:listId/items/:titleId/groups  — Ranger un titre dans des sous-groupes
 * - POST   /lists/:listId/groups                 — Créer un sous-groupe
 * - PATCH  /lists/:listId/groups/:groupId        — Renommer un sous-groupe
 * - DELETE /lists/:listId/groups/:groupId        — Supprimer un sous-groupe (et ses enfants)
 *
 * Endpoints commentaires partagés (4) — lecture : tout membre ; écriture :
 * créateur ou membre en collaboratif/ouvert ; le créateur peut supprimer
 * tout commentaire :
 * - GET    /lists/:listId/items/:titleId/comments
 * - POST   /lists/:listId/items/:titleId/comments
 * - PATCH  /lists/:listId/comments/:commentId
 * - DELETE /lists/:listId/comments/:commentId
 *
 * Endpoints partage (6) — droits des membres selon user_lists.share_mode,
 * cf. list-permissions.ts :
 * - PATCH  /lists/:listId/share-mode                — Changer le mode de partage (créateur)
 * - POST   /lists/:listId/shares                    — Ajouter un membre (créateur)
 * - GET    /lists/:listId/shares                    — Liste des membres (créateur)
 * - DELETE /lists/:listId/shares/:sharedWithUserId  — Retirer un membre (créateur)
 * - GET    /shared-lists                            — Listes partagées avec moi
 * - DELETE /shared-lists/:listId                    — Quitter une liste partagée
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  // ======================================================================
  // USER_LISTS
  // ======================================================================

  /**
   * POST /lists
   * Crée une nouvelle liste.
   */
  @Post('lists')
  async createList(@CurrentUser() user: any, @Body() dto: CreateListDto) {
    return this.listsService.createList(user.id, dto);
  }

  /**
   * GET /lists
   * Liste des listes de l'utilisateur connecté.
   * Peut accepter ?title_id=xxx pour vérifier si le titre est dans chaque liste.
   */
  @Get('lists')
  async getUserLists(@CurrentUser() user: any, @Query('title_id') titleId?: string) {
    if (titleId) {
      return this.listsService.getUserListsWithTitleCheck(user.id, titleId);
    }
    return this.listsService.getUserLists(user.id);
  }

  /**
   * GET /lists/:id
   * Détail d'une liste avec ses items (titles).
   */
  @Get('lists/:id')
  async getListDetail(@CurrentUser() user: any, @Param('id') id: string) {
    return this.listsService.getListDetail(id, user.id);
  }

  /**
   * PATCH /lists/:id
   * Modifie le nom et/ou la description d'une liste.
   */
  @Patch('lists/:id')
  async updateList(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateListDto) {
    return this.listsService.updateList(id, user.id, dto);
  }

  /**
   * DELETE /lists/:id
   * Supprime une liste (cascade).
   */
  @Delete('lists/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteList(@CurrentUser() user: any, @Param('id') id: string): Promise<void> {
    await this.listsService.deleteList(id, user.id);
  }

  // ======================================================================
  // LIST_ITEMS
  // ======================================================================

  /**
   * POST /lists/:listId/items
   * Ajoute un titre à une liste.
   */
  @Post('lists/:listId/items')
  async addItem(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Body() dto: AddItemDto,
  ) {
    return this.listsService.addItem(listId, user.id, dto.title_id);
  }

  /**
   * DELETE /lists/:listId/items/:titleId
   * Retire un titre d'une liste.
   */
  @Delete('lists/:listId/items/:titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('titleId') titleId: string,
  ): Promise<void> {
    await this.listsService.removeItem(listId, user.id, titleId);
  }

  /**
   * PATCH /lists/:listId/items/:titleId/statut
   * Met à jour le statut de progression d'un item de la watchlist
   * ("en_cours" / "a_jour" / "abandonnee").
   */
  @Patch('lists/:listId/items/:titleId/statut')
  async updateItemStatus(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('titleId') titleId: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.listsService.updateItemStatus(listId, user.id, titleId, dto);
  }

  /**
   * PATCH /lists/:listId/items/reorder
   * Réordonnancement batch des items.
   */
  @Patch('lists/:listId/items/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderItems(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Body() dto: ReorderDto,
  ): Promise<void> {
    await this.listsService.reorderItems(listId, user.id, dto);
  }

  // ======================================================================
  // VU DANS LA LISTE & SOUS-GROUPES
  // ======================================================================

  @Patch('lists/:listId/items/:titleId/vu')
  async setItemVu(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('titleId') titleId: string,
    @Body() dto: SetItemVuDto,
  ) {
    return this.listsService.setItemVu(listId, user.id, titleId, dto);
  }

  @Put('lists/:listId/items/:titleId/groups')
  async setItemGroups(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('titleId') titleId: string,
    @Body() dto: SetItemGroupsDto,
  ) {
    return this.listsService.setItemGroups(listId, user.id, titleId, dto);
  }

  @Post('lists/:listId/groups')
  async createGroup(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.listsService.createGroup(listId, user.id, dto);
  }

  @Patch('lists/:listId/groups/:groupId')
  async renameGroup(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.listsService.renameGroup(listId, user.id, groupId, dto);
  }

  @Delete('lists/:listId/groups/:groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('groupId') groupId: string,
  ): Promise<void> {
    await this.listsService.deleteGroup(listId, user.id, groupId);
  }

  // ======================================================================
  // COMMENTAIRES PARTAGÉS
  // ======================================================================

  @Get('lists/:listId/items/:titleId/comments')
  async getItemComments(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('titleId') titleId: string,
  ) {
    return this.listsService.getItemComments(listId, user.id, titleId);
  }

  @Post('lists/:listId/items/:titleId/comments')
  async addItemComment(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('titleId') titleId: string,
    @Body() dto: CommentDto,
  ) {
    return this.listsService.addItemComment(listId, user.id, titleId, dto);
  }

  @Patch('lists/:listId/comments/:commentId')
  async updateItemComment(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CommentDto,
  ) {
    return this.listsService.updateItemComment(listId, user.id, commentId, dto);
  }

  @Delete('lists/:listId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItemComment(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    await this.listsService.deleteItemComment(listId, user.id, commentId);
  }

  // ======================================================================
  // PARTAGE
  // ======================================================================

  /**
   * PATCH /lists/:listId/share-mode
   * Change le mode de partage (lecture / collaboratif / ouvert).
   */
  @Patch('lists/:listId/share-mode')
  async updateShareMode(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Body() dto: UpdateShareModeDto,
  ) {
    return this.listsService.updateShareMode(listId, user.id, dto);
  }

  /**
   * POST /lists/:listId/shares
   * Ajoute un membre à une liste.
   */
  @Post('lists/:listId/shares')
  async shareList(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Body() dto: ShareListDto,
  ) {
    return this.listsService.shareList(listId, user.id, dto);
  }

  /**
   * GET /lists/:listId/shares
   * Membres d'une liste.
   */
  @Get('lists/:listId/shares')
  async getShares(@CurrentUser() user: any, @Param('listId') listId: string) {
    return this.listsService.getShares(listId, user.id);
  }

  /**
   * DELETE /lists/:listId/shares/:sharedWithUserId
   * Retire un membre.
   */
  @Delete('lists/:listId/shares/:sharedWithUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeShare(
    @CurrentUser() user: any,
    @Param('listId') listId: string,
    @Param('sharedWithUserId') sharedWithUserId: string,
  ): Promise<void> {
    await this.listsService.removeShare(listId, user.id, sharedWithUserId);
  }

  /**
   * GET /shared-lists
   * Listes partagées avec l'utilisateur connecté.
   */
  @Get('shared-lists')
  async getSharedLists(@CurrentUser() user: any) {
    return this.listsService.getSharedLists(user.id);
  }

  /**
   * DELETE /shared-lists/:listId
   * Quitter une liste partagée avec moi.
   */
  @Delete('shared-lists/:listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveSharedList(@CurrentUser() user: any, @Param('listId') listId: string): Promise<void> {
    await this.listsService.leaveSharedList(listId, user.id);
  }
}
