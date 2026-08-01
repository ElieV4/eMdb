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
  async getModule(@Param('module') module: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20;
    return this.discoverService.getModule(module, safeLimit);
  }
}
