import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service métier pour l'enregistrement des tokens push (FCM) des devices
 * de l'app Android Capacitor.
 *
 * L'envoi effectif des notifications se fait côté apps/worker (là où
 * tournent les crons qui détectent les nouveautés), pas ici — ce module ne
 * fait qu'enregistrer/désenregistrer les tokens.
 */
@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {}

  async registerToken(userId: string, token: string, platform: string): Promise<void> {
    await this.prisma.push_tokens.upsert({
      where: { token },
      update: { user_id: userId, platform, last_seen_at: new Date() },
      create: { user_id: userId, token, platform },
    });
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.prisma.push_tokens.deleteMany({ where: { token, user_id: userId } });
  }
}
