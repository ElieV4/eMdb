import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';

export interface WorkerStatus {
  embedEnabled: boolean;
  running: boolean;
  paused: boolean;
}

/**
 * Gère le cycle de vie du worker BullMQ embarqué (process enfant lancé par
 * apps/api quand EMBED_WORKER=true, cf. wiki/Déploiement).
 *
 * Permet de le stopper/relancer à la demande (endpoints admin) sans
 * redéploiement : utile pour couper la consommation de commandes Redis en
 * urgence quand le quota gratuit Upstash (500k commandes/mois) approche de
 * sa limite, plutôt que de subir un service down faute de commandes Redis
 * disponibles pour l'API elle-même.
 *
 * Tuer le process enfant ferme sa connexion Redis : consommation nulle côté
 * worker pendant la pause. L'état "paused" ne survit pas à un redémarrage
 * du service (redeploy Render) — au reboot, EMBED_WORKER seul décide, ce
 * qui est le comportement sûr par défaut (on ne veut pas qu'une pause
 * d'urgence oubliée bloque le worker indéfiniment).
 */
@Injectable()
export class WorkerManagerService {
  private readonly logger = new Logger(WorkerManagerService.name);
  private child: ChildProcess | null = null;
  private paused = false;

  get embedEnabled(): boolean {
    return process.env.EMBED_WORKER === 'true';
  }

  get isRunning(): boolean {
    return this.child !== null && !this.child.killed;
  }

  getStatus(): WorkerStatus {
    return {
      embedEnabled: this.embedEnabled,
      running: this.isRunning,
      paused: this.paused,
    };
  }

  /** Lancé une seule fois au bootstrap de l'API (main.ts). */
  autoStart(): void {
    if (this.embedEnabled) {
      this.start();
    }
  }

  private start(): void {
    if (this.isRunning) return;

    const workerDir = path.resolve(process.cwd(), '..', 'worker');
    this.child = spawn('npx', ['ts-node', '--transpile-only', 'src/index.ts'], {
      cwd: workerDir,
      // Le process enfant hérite de l'env de l'API, dont DATABASE_URL
      // pointe vers le rôle restreint emdb_app (soumis au RLS, cf. migration
      // enable_rls_user_scoped_tables) — mais le worker doit rester sur le
      // rôle BYPASSRLS (jobs transverses à tous les utilisateurs). Surchargé
      // ici via WORKER_DATABASE_URL si définie (repli sur DATABASE_URL si
      // absente : environnement pas encore migré vers deux rôles distincts).
      env: { ...process.env, DATABASE_URL: process.env.WORKER_DATABASE_URL || process.env.DATABASE_URL },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    this.child.on('exit', (code) => {
      this.logger.error(`worker embarqué arrêté (code ${code})`);
      this.child = null;
    });
    this.logger.log('worker BullMQ embarqué démarré');
  }

  private stop(): void {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }

  pause(): WorkerStatus {
    this.paused = true;
    this.stop();
    this.logger.warn('worker embarqué mis en pause manuellement (admin)');
    return this.getStatus();
  }

  resume(): WorkerStatus {
    this.paused = false;
    if (this.embedEnabled) {
      this.start();
    }
    this.logger.log('worker embarqué relancé manuellement (admin)');
    return this.getStatus();
  }
}
