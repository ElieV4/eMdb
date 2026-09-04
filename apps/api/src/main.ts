import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { WorkerManagerService } from './admin/worker-manager.service';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '..', '..', '.env') });
console.log('[main] DATABASE_URL =', process.env.DATABASE_URL ? '[set]' : '[MISSING]');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());

  // CORS : origines autorisées configurables via env (prod = URL Vercel),
  // par défaut le frontend Next.js en local.
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);

  // Déploiement cloud : un seul service gratuit (pas de background worker
  // Render payant) héberge à la fois l'API et les workers BullMQ, en lançant
  // apps/worker comme process enfant (même mécanisme ts-node que
  // `start:dev` en local, cf. apps/worker/package.json > start:prod).
  // Le cycle de vie de ce process enfant est délégué à WorkerManagerService,
  // qui expose aussi pause()/resume() (endpoints /admin/worker/*) pour le
  // stopper à la demande sans redéploiement — cf. commentaire dans ce
  // service pour le contexte (quota Upstash 500k commandes/mois).
  app.get(WorkerManagerService).autoStart();
}

bootstrap();
