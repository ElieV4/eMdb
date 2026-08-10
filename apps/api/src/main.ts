import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import dotenv from 'dotenv';
import path from 'node:path';
import { spawn } from 'node:child_process';

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
  if (process.env.EMBED_WORKER === 'true') {
    const workerDir = path.resolve(process.cwd(), '..', 'worker');
    const worker = spawn('npx', ['ts-node', '--transpile-only', 'src/index.ts'], {
      cwd: workerDir,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    worker.on('exit', (code) => {
      // eslint-disable-next-line no-console
      console.error(`[api] worker embarqué arrêté (code ${code})`);
    });
    // eslint-disable-next-line no-console
    console.log('[api] worker BullMQ embarqué démarré (EMBED_WORKER=true)');
  }
}

bootstrap();
