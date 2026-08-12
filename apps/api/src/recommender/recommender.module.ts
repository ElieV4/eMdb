import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RecommenderController } from './recommender.controller';
import { UserRecommendationsController } from './user-recommendations.controller';
import { RecommenderService } from './recommender.service';
import { AdminModule } from '../admin/admin.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, AdminModule],
  controllers: [RecommenderController, UserRecommendationsController],
  providers: [RecommenderService],
  exports: [RecommenderService],
})
export class RecommenderModule {}
