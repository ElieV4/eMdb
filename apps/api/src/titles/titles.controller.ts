import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TitlesService } from './titles.service';
import { SearchTitlesDto } from './dto/search-titles.dto';
import { ListTitlesFilterDto } from './dto/list-titles-filter.dto';

@Controller('titles')
export class TitlesController {
  constructor(private readonly titlesService: TitlesService) {}

  @Get('search')
  async search(@Query() query: SearchTitlesDto) {
    return this.titlesService.searchTitles(query.q, query.type);
  }

  /**
   * GET /titles/genres, GET /titles/countries, GET /titles/studios
   * Liste de référence (public) pour les menus de filtre.
   * Placés avant `:id` pour ne pas être interceptés par ce paramètre générique.
   */
  @Get('genres')
  async listGenres() {
    return this.titlesService.listGenres();
  }

  @Get('countries')
  async listCountries() {
    return this.titlesService.listCountries();
  }

  @Get('studios')
  async listStudios() {
    return this.titlesService.listStudios();
  }

  @Get('tmdb/:tmdbId')
  async getOrImport(@Param('tmdbId') tmdbId: string, @Query('type') type: 'film' | 'serie') {
    const id = parseInt(tmdbId, 10);
    if (isNaN(id) || id < 1) {
      throw new NotFoundException('ID TMDB invalide.');
    }
    const titleType = type ?? 'film';
    return this.titlesService.getOrImportByTmdbId(id, titleType);
  }

  @Get(':id')
  async getDetail(@Param('id') id: string) {
    return this.titlesService.getTitleDetail(id);
  }

  @Get()
  async list(@Query() filters: ListTitlesFilterDto) {
    return this.titlesService.listTitles(filters);
  }

  @Get(':id/recommendations')
  async getRecommendations(@Param('id') id: string) {
    return this.titlesService.getRecommendations(id);
  }

  @Patch(':id/refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@Param('id') id: string) {
    return this.titlesService.refreshTitle(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.titlesService.deleteIfOrphan(id);
  }
}
