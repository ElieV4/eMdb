import { Controller, Get, Param } from '@nestjs/common';
import { StudiosService } from './studios.service';

/**
 * Contrôleur des endpoints studios.
 *
 * Endpoints :
 * - GET /studios/:id               — détail d'un studio
 * - GET /studios/:id/filmography   — filmographie groupée par type (Films/Séries)
 * - GET /studios/:id/people        — personnes les plus associées au studio
 */
@Controller('studios')
export class StudiosController {
  constructor(private readonly studiosService: StudiosService) {}

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
}
