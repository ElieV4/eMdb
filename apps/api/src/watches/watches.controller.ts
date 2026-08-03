import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WatchesService } from './watches.service';
import { CreateWatchDto } from './dto/create-watch.dto';
import { ListWatchesFilterDto } from './dto/list-watches-filter.dto';
import { FollowSerieDto } from './dto/follow-serie.dto';
import { MarkWatchedUntilEpisodeDto } from './dto/mark-watched-until-episode.dto';

/**
 * Contrôleur du module watches (Phase 4.1).
 *
 * Tous les endpoints nécessitent une authentification JWT.
 *
 * Endpoints :
 * - POST   /watches                  — marquer vu (titre ou épisode)
 * - POST   /watches/until-episode    — "vu jusqu'ici" (modification M)
 * - DELETE /watches/title/:titleId   — supprimer tous les visionnages d'un titre
 * - DELETE /watches/episode/:episodeId — supprimer tous les visionnages d'un épisode
 * - DELETE /watches/:id              — supprimer un visionnage
 * - GET    /watches                  — liste paginée des visionnages
 * - GET    /titles/:titleId/progress — progression série (fn_progress_serie)
 * - GET    /calendar                 — calendrier épisodes non vus
 * - POST   /follows                  — suivre une série
 * - DELETE /follows/:titleId         — ne plus suivre
 * - GET    /follows                  — liste des séries suivies
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class WatchesController {
  constructor(private readonly watchesService: WatchesService) {}

  /**
   * POST /watches
   * Marque un titre ou un épisode comme vu.
   */
  @Post('watches')
  async createWatch(@CurrentUser() user: any, @Body() dto: CreateWatchDto) {
    return this.watchesService.createWatch(user.id, dto);
  }

  /**
   * POST /watches/until-episode
   * "Vu jusqu'ici" (modification M) : marque comme vus tous les épisodes
   * non encore vus de la série jusqu'à `episode_id` inclus.
   */
  @Post('watches/until-episode')
  async markWatchedUntilEpisode(
    @CurrentUser() user: any,
    @Body() dto: MarkWatchedUntilEpisodeDto,
  ) {
    const count = await this.watchesService.createWatchesUntilEpisode(
      user.id,
      dto.episode_id,
      dto.date_vue ? dto.date_vue.toISOString() : undefined,
    );
    return { count };
  }

  /**
   * DELETE /watches/title/:titleId
   * Supprime tous les visionnages d'un titre pour l'utilisateur connecté.
   */
  @Delete('watches/title/:titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllWatchesByTitle(@CurrentUser() user: any, @Param('titleId') titleId: string): Promise<void> {
    await this.watchesService.deleteAllWatchesByTitle(titleId, user.id);
  }

  /**
   * DELETE /watches/episode/:episodeId
   * Supprime tous les visionnages d'un épisode pour l'utilisateur connecté.
   */
  @Delete('watches/episode/:episodeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllWatchesByEpisode(
    @CurrentUser() user: any,
    @Param('episodeId') episodeId: string,
  ): Promise<void> {
    await this.watchesService.deleteAllWatchesByEpisode(episodeId, user.id);
  }

  /**
   * DELETE /watches/:id
   * Supprime un visionnage (vérifie l'appartenance).
   */
  @Delete('watches/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWatch(@CurrentUser() user: any, @Param('id') id: string): Promise<void> {
    await this.watchesService.deleteWatch(id, user.id);
  }

  /**
   * GET /watches
   * Liste paginée des visionnages avec filtres optionnels.
   */
  @Get('watches')
  async listWatches(@CurrentUser() user: any, @Query() filters: ListWatchesFilterDto) {
    return this.watchesService.listWatches(user.id, filters);
  }

  /**
   * GET /titles/:titleId/progress
   * Progression de visionnage par saison pour une série.
   */
  @Get('titles/:titleId/progress')
  async getSerieProgress(@CurrentUser() user: any, @Param('titleId') titleId: string) {
    return this.watchesService.getSerieProgress(user.id, titleId);
  }

  /**
   * GET /calendar
   * Calendrier des épisodes non vus pour les séries suivies.
   */
  @Get('calendar')
  async getCalendar(@CurrentUser() user: any) {
    return this.watchesService.getCalendar(user.id);
  }

  /**
   * GET /continue-watching
   * Séries suivies avec au moins un épisode restant à voir, triées par
   * MAX(date du dernier épisode vu, date de sortie du dernier épisode)
   * décroissant (modification U).
   */
  @Get('continue-watching')
  async getContinueWatching(@CurrentUser() user: any) {
    return this.watchesService.getContinueWatching(user.id);
  }

  /**
   * POST /follows
   * Suivre une série.
   */
  @Post('follows')
  async follow(@CurrentUser() user: any, @Body() dto: FollowSerieDto) {
    return this.watchesService.follow(user.id, dto.title_id);
  }

  /**
   * DELETE /follows/:titleId
   * Ne plus suivre une série.
   */
  @Delete('follows/:titleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(@CurrentUser() user: any, @Param('titleId') titleId: string): Promise<void> {
    await this.watchesService.unfollow(user.id, titleId);
  }

  /**
   * GET /follows
   * Liste des séries suivies par l'utilisateur.
   */
  @Get('follows')
  async getFollowedSeries(@CurrentUser() user: any) {
    return this.watchesService.getFollowedSeries(user.id);
  }
}
