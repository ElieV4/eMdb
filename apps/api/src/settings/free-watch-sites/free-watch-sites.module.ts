import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FreeWatchSitesController } from './free-watch-sites.controller';
import { FreeWatchSitesService } from './free-watch-sites.service';

@Module({
  imports: [PrismaModule],
  controllers: [FreeWatchSitesController],
  providers: [FreeWatchSitesService],
})
export class FreeWatchSitesModule {}
