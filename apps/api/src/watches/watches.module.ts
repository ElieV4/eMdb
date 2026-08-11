import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ListsModule } from '../lists/lists.module';
import { WatchesController } from './watches.controller';
import { WatchesService } from './watches.service';

@Module({
  imports: [PrismaModule, ListsModule],
  controllers: [WatchesController],
  providers: [WatchesService],
  exports: [WatchesService],
})
export class WatchesModule {}
