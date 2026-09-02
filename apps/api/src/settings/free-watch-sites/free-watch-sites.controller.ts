import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FreeWatchSitesService } from './free-watch-sites.service';
import { CreateFreeWatchSiteDto } from './dto/create-free-watch-site.dto';
import { UpdateFreeWatchSiteDto } from './dto/update-free-watch-site.dto';
import { TestFreeWatchSiteDto } from './dto/test-free-watch-site.dto';

/**
 * CRUD de la whitelist des sites "gratuits" (paramètres/profil, formulaire
 * eMDB) — table unique partagée par tous les utilisateurs, pas de scoping
 * par user (simple JwtAuthGuard, pas besoin d'AdminGuard ici).
 */
@UseGuards(JwtAuthGuard)
@Controller('settings/free-watch-sites')
export class FreeWatchSitesController {
  constructor(private readonly service: FreeWatchSitesService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Post()
  async create(@Body() dto: CreateFreeWatchSiteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFreeWatchSiteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }

  @Post('test')
  async test(@Body() dto: TestFreeWatchSiteDto) {
    return this.service.test(dto);
  }
}
