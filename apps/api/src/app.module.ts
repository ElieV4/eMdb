import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { TitlesModule } from './titles/titles.module';
import { PeopleModule } from './people/people.module';
import { StudiosModule } from './studios/studios.module';
import { DiscoverModule } from './discover/discover.module';
import { SeasonsEpisodesModule } from './seasons-episodes/seasons-episodes.module';
import { CreditsModule } from './credits/credits.module';
import { DatavizModule } from './dataviz/dataviz.module';
import { WatchesModule } from './watches/watches.module';
import { RatingsModule } from './ratings/ratings.module';
import { ListsModule } from './lists/lists.module';
import { RecommenderModule } from './recommender/recommender.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ImportModule } from './import/import.module';
import { FreeWatchSitesModule } from './settings/free-watch-sites/free-watch-sites.module';
import * as path from 'node:path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(__dirname, '..', '..', '..', '.env')],
    }),
    PrismaModule,
    AdminModule,
    AuthModule,
    UsersModule,
    TitlesModule,
    PeopleModule,
    StudiosModule,
    DiscoverModule,
    SeasonsEpisodesModule,
    CreditsModule,
    DatavizModule,
    WatchesModule,
    RatingsModule,
    ListsModule,
    RecommenderModule,
    NotificationsModule,
    ImportModule,
    FreeWatchSitesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
