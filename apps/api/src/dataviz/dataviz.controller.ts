import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DatavizService } from './dataviz.service';
import { WatchTimeQueryDto } from './dto/watch-time-query.dto';
import { WatchCountQueryDto } from './dto/watch-count-query.dto';
import { DatavizQueryDto } from './dto/dataviz-query.dto';
import { DatavizFilterOptionsQueryDto } from './dto/dataviz-filter-options-query.dto';

/**
 * Contrôleur des endpoints dataviz (Phase 6.1, puis modification W).
 *
 * Tous les endpoints nécessitent une authentification JWT (données personnelles).
 *
 * Endpoints :
 * - GET /dataviz/watch-time?groupBy=genre|period|country|animation&yearFrom=&yearTo= (Phase 6.1)
 * - GET /dataviz/watch-count?groupBy=genre|period|country|animation&yearFrom=&yearTo= (Phase 6.1)
 * - GET /dataviz/query?metric=&aggregation=&groupBy=&... (modification W, menu unifié — cf. `DatavizQueryDto`)
 * - GET /dataviz/filters/titles|actors|directors|studios?q= (groupements "top 20" — cf. `DatavizService.getFilterOptions`)
 */
@UseGuards(JwtAuthGuard)
@Controller('dataviz')
export class DatavizController {
  constructor(private readonly datavizService: DatavizService) {}

  /**
   * GET /dataviz/watch-time
   * Temps total de visionnage (en minutes) groupé par critère.
   *
   * @param query - DTO avec groupBy (required) et yearFrom/yearTo (optionnels)
   * @param user - Utilisateur connecté (extrait du JWT)
   * @returns Tableau de résultats
   */
  @Get('watch-time')
  async getWatchTime(@Query() query: WatchTimeQueryDto, @CurrentUser() user: any) {
    return this.datavizService.getWatchTime(user.id, query);
  }

  /**
   * GET /dataviz/watch-count
   * Nombre total de visionnages groupé par critère.
   *
   * @param query - DTO avec groupBy (required) et yearFrom/yearTo (optionnels)
   * @param user - Utilisateur connecté (extrait du JWT)
   * @returns Tableau de résultats
   */
  @Get('watch-count')
  async getWatchCount(@Query() query: WatchCountQueryDto, @CurrentUser() user: any) {
    return this.datavizService.getWatchCount(user.id, query);
  }

  /**
   * GET /dataviz/query
   * Endpoint unique alimentant les 8 visuels dataviz de la page Profil,
   * chacun avec son propre menu métrique/agrégation/groupement/filtres
   * (cf. `DatavizQueryDto`). Renvoie `{ total, rows }` — `total` est
   * l'agrégat sur l'ensemble des données (non `null` seulement si
   * `groupBy != 'none'`, pour l'affichage "total ET par groupement" des
   * datacards), `rows` la répartition par catégorie du groupement choisi.
   */
  @Get('query')
  async query(@Query() query: DatavizQueryDto, @CurrentUser() user: any) {
    return this.datavizService.query(user.id, query);
  }

  /**
   * GET /dataviz/filters/titles|actors|directors|studios?q=
   * Options des dropdowns "Titre"/"Acteur"/"Réalisateur"/"Studio" (menu "⋮",
   * groupements "top 20") : sans `q`, les 20 entités les plus regardées par
   * l'utilisateur ; avec `q`, une recherche parmi ce qu'il a déjà regardé.
   */
  @Get('filters/titles')
  async filterTitles(@Query() query: DatavizFilterOptionsQueryDto, @CurrentUser() user: any) {
    return this.datavizService.getFilterOptions(user.id, 'title', query.q);
  }

  @Get('filters/actors')
  async filterActors(@Query() query: DatavizFilterOptionsQueryDto, @CurrentUser() user: any) {
    return this.datavizService.getFilterOptions(user.id, 'actor', query.q);
  }

  @Get('filters/directors')
  async filterDirectors(@Query() query: DatavizFilterOptionsQueryDto, @CurrentUser() user: any) {
    return this.datavizService.getFilterOptions(user.id, 'director', query.q);
  }

  @Get('filters/studios')
  async filterStudios(@Query() query: DatavizFilterOptionsQueryDto, @CurrentUser() user: any) {
    return this.datavizService.getFilterOptions(user.id, 'studio', query.q);
  }
}
