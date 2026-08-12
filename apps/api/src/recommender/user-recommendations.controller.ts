import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecommenderService } from './recommender.service';

/**
 * Recommandations personnalisées pour l'utilisateur connecté ("Titres
 * recommandés"), distinct de RecommenderController (déclenchement admin du
 * calcul batch) — endpoint public authentifié, pas de garde admin.
 */
@Controller('recommendations')
export class UserRecommendationsController {
  constructor(private readonly recommenderService: RecommenderService) {}

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserRecommendations(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('appreciesFr') appreciesFr?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20;

    return this.recommenderService.getUserRecommendations(user.id, {
      limit: safeLimit,
      appreciesFr: appreciesFr === '1' || appreciesFr === 'true',
    });
  }
}
