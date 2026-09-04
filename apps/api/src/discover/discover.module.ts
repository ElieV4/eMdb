import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscoverController } from './discover.controller';
import { DiscoverService } from './discover.service';
import { FestivalsService } from './festivals.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiscoverController],
  providers: [DiscoverService, FestivalsService],
})
export class DiscoverModule {}
