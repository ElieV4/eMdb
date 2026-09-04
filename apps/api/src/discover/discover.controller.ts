import { Controller, Get, Param, Query } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { FestivalsService } from './festivals.service';

/**
 * Contrôleur pour la page "Découvrir" (modification G).
 *
 * Endpoint : GET /discover/:module?limit=
 * `:module` ∈ tendances | populaires | attendus | sorties
 *
 * Les routes `festivals` (module "Sélection") sont déclarées AVANT la route
 * générique `:module` — NestJS matche les routes dans l'ordre de
 * déclaration, sinon `/discover/festivals` serait capturé par `:module`.
 */
@Controller('discover')
export class DiscoverController {
  constructor(
    private readonly discoverService: DiscoverService,
    private readonly festivalsService: FestivalsService,
  ) {}

  @Get('festivals')
  async getFestivalEditions() {
    return this.festivalsService.getEditions();
  }

  @Get('festivals/:editionId')
  async getFestivalSelection(@Param('editionId') editionId: string) {
    return this.festivalsService.getSelection(editionId);
  }

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
