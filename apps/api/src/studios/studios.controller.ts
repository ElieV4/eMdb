import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StudiosService } from './studios.service';
import { SearchStudiosDto } from './dto/search-studios.dto';

/**
 * Contrôleur des endpoints studios.
 *
 * Endpoints :
 * - GET    /studios/search?q=         — recherche locale par nom
 * - GET    /studios/followed          — studios suivis (authentifié)
 * - GET    /studios/:id               — détail d'un studio
 * - GET    /studios/:id/filmography   — filmographie groupée par type (Films/Séries)
 * - GET    /studios/:id/people        — personnes les plus associées au studio
 * - POST   /studios/:id/filmography/refresh — réimporte les titres manquants depuis TMDB (authentifié)
 * - POST   /studios/:id/follow        — suivre (authentifié)
 * - DELETE /studios/:id/follow        — ne plus suivre (authentifié)
 */
@Controller('studios')
export class StudiosController {
  constructor(private readonly studiosService: StudiosService) {}

  /**
   * GET /studios/search?q=&page=
   * Placé avant `:id` pour ne pas être intercepté par ce paramètre générique.
   */
  @Get('search')
  async search(@Query() query: SearchStudiosDto) {
    return this.studiosService.search(query.q, query.page);
  }

  /**
   * GET /studios/followed
   * Placé avant `:id` pour ne pas être intercepté par ce paramètre générique.
   */
  @Get('followed')
  @UseGuards(JwtAuthGuard)
  async getFollowed(@CurrentUser() user: any) {
    return this.studiosService.getFollowedStudios(user.id);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.studiosService.getById(id);
  }

  @Get(':id/filmography')
  async getFilmography(@Param('id') id: string) {
    return this.studiosService.getFilmography(id);
  }

  @Get(':id/people')
  async getRelatedPeople(@Param('id') id: string) {
    return this.studiosService.getRelatedPeople(id);
  }

  @Post(':id/filmography/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshFilmography(@Param('id') id: string) {
    return this.studiosService.refreshFilmography(id);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  async follow(@CurrentUser() user: any, @Param('id') id: string) {
    return this.studiosService.followStudio(user.id, id);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  async unfollow(@CurrentUser() user: any, @Param('id') id: string): Promise<void> {
    await this.studiosService.unfollowStudio(user.id, id);
  }
}
