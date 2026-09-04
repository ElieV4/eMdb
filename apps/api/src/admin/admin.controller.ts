import { Controller, Get, Param, Post, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

/**
 * Contrôleur admin – Phase 6.2
 *
 * Endpoints d'administration, réservés aux utilisateurs listés dans
 * ADMIN_EMAILS (fichier .env).
 *
 * Endpoints :
 * - POST /admin/refresh-materialized-views → déclenchement manuel du refresh
 * - GET  /admin/account-requests           → demandes de compte en attente
 * - POST /admin/account-requests/:id/approve
 * - POST /admin/account-requests/:id/reject
 * - GET  /admin/worker/status              → statut du worker BullMQ embarqué
 * - POST /admin/worker/pause               → coupe le worker (économie Redis)
 * - POST /admin/worker/resume              → relance le worker
 */
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * POST /admin/refresh-materialized-views
   *
   * Déclenche manuellement le rafraîchissement des 8 vues matérialisées
   * via un job BullMQ ajouté à la queue `tmdb-cron` (déjà existante dans le worker).
   *
   * @returns jobId et status
   */
  @Post('refresh-materialized-views')
  async refreshMaterializedViews() {
    this.logger.log('Déclenchement manuel du refresh des vues matérialisées');
    return this.adminService.refreshMaterializedViews();
  }

  /**
   * GET /admin/account-requests
   * Liste des demandes de création de compte en attente de validation.
   */
  @Get('account-requests')
  async listAccountRequests() {
    return this.adminService.listAccountRequests();
  }

  /**
   * POST /admin/account-requests/:id/approve
   * Approuve la demande : active le compte et crée ses listes par défaut.
   */
  @Post('account-requests/:id/approve')
  async approveAccountRequest(@Param('id') id: string) {
    return this.adminService.approveAccountRequest(id);
  }

  /**
   * POST /admin/account-requests/:id/reject
   * Refuse la demande : le compte reste bloqué en connexion.
   */
  @Post('account-requests/:id/reject')
  async rejectAccountRequest(@Param('id') id: string) {
    return this.adminService.rejectAccountRequest(id);
  }

  /**
   * GET /admin/worker/status
   * Statut du worker BullMQ embarqué (running/paused/embedEnabled).
   */
  @Get('worker/status')
  async getWorkerStatus() {
    return this.adminService.getWorkerStatus();
  }

  /**
   * POST /admin/worker/pause
   * Coupe le worker embarqué (process tué, connexion Redis fermée) pour
   * stopper immédiatement sa consommation de commandes Redis — à utiliser
   * quand le quota gratuit Upstash (500k commandes/mois) approche de sa
   * limite, pour éviter que le manque de commandes Redis fasse tomber le
   * reste du site.
   */
  @Post('worker/pause')
  async pauseWorker() {
    this.logger.warn('Pause manuelle du worker embarqué (admin)');
    return this.adminService.pauseWorker();
  }

  /**
   * POST /admin/worker/resume
   * Relance le worker embarqué après une pause manuelle.
   */
  @Post('worker/resume')
  async resumeWorker() {
    this.logger.log('Reprise manuelle du worker embarqué (admin)');
    return this.adminService.resumeWorker();
  }
}
