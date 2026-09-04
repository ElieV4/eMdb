import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PushController } from './push.controller';
import { PushService } from './push.service';

/**
 * Module NestJS pour l'enregistrement des tokens push FCM de l'app
 * Android Capacitor. L'envoi des notifications se fait côté apps/worker
 * (cf. @emdb/push), ce module ne gère que le CRUD des tokens.
 */
@Module({
  imports: [PrismaModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
