import { Controller, Get, Param, Query } from '@nestjs/common';
import { DiscoverService } from './discover.service';

/**
 * Contrôleur pour la page "Découvrir" (modification G).
 *
 * Endpoint : GET /discover/:module?limit=
 * `:module` ∈ tendances | populaires | attendus | sorties
 */
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  @Get(':module')
  async getModule(
    @Param('module') module: string,
    @Query('limit') limit?: string,
    @Query('appreciesFr') appreciesFr?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    // Plafond relevé à 100 (au lieu de 50) pour la page dédiée /discover/:module
    // (grille), qui révèle désormais ce lot progressivement au scroll côté
    // client plutôt que de tout afficher d'un coup.
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const isAppreciesFr = appreciesFr === '1' || appreciesFr === 'true';
    return this.discoverService.getModule(module, safeLimit, isAppreciesFr);
  }
}
