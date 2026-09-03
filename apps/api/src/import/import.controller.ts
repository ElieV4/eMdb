import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import AdmZip from 'adm-zip';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ImportService } from './import.service';

/**
 * Fichiers repères d'un export Trakt — au moins un doit être présent dans
 * le zip pour qu'on le considère valide (évite de lancer un job sur un zip
 * quelconque envoyé par erreur).
 */
const TRAKT_MARKER_FILES = [
  'user-profile.json',
  'user-settings.json',
  'watched-movies-1.json',
  'watched-history-1.json',
  'ratings-movies.json',
  'lists-watchlist.json',
];

/**
 * Dossier où le zip est uploadé/extrait, PUIS lu par le worker BullMQ
 * (`trakt-import.worker.ts`) pour traiter les fichiers JSON — API et worker
 * tournent dans des containers Docker distincts, donc `os.tmpdir()` seul
 * pointerait vers deux filesystèmes différents : le worker ne trouverait
 * jamais les fichiers que l'API vient d'extraire (job qui se termine en
 * silence avec 0 résultat, aucun fichier repère détecté). `IMPORT_TMP_DIR`
 * doit pointer vers un volume monté aux deux containers au même chemin (cf.
 * docker-compose.yml, service `import-tmp`) ; à défaut (dev natif hors
 * Docker, API et worker sur la même machine), `os.tmpdir()` suffit.
 */
const IMPORT_TMP_DIR = process.env.IMPORT_TMP_DIR || os.tmpdir();
fs.mkdirSync(IMPORT_TMP_DIR, { recursive: true });

/**
 * Endpoints d'import Trakt (bug #55/#56) — bouton "Importer depuis Trakt"
 * de la page Profil. Accessibles à tout utilisateur connecté (import de ses
 * propres données, pas une opération admin).
 */
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  private readonly logger = new Logger(ImportController.name);

  constructor(private readonly importService: ImportService) {}

  /**
   * POST /import/trakt
   * Reçoit un export Trakt au format .zip (champ `file`), le dézippe dans
   * un dossier temporaire, puis planifie un job d'import en tâche de fond
   * (potentiellement long : des dizaines de minutes selon le volume de
   * titres absents du catalogue local).
   *
   * Champ optionnel `sinceDate` (form-data, ISO "YYYY-MM-DD") : limite
   * l'import aux visionnages (historique + films vus) à partir de cette
   * date — réimport incrémental pour ne récupérer que l'historique récent
   * sans reparcourir des années de données à chaque fois (cf.
   * trakt-import.worker.ts pour le détail du filtrage).
   */
  @Post('trakt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: IMPORT_TMP_DIR,
        filename: (_req, _file, cb) => cb(null, `trakt-upload-${randomUUID()}.zip`),
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.originalname.toLowerCase().endsWith('.zip')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Seul un fichier .zip est accepté.'), false);
        }
      },
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 Mo max
    }),
  )
  async importTrakt(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('sinceDate') sinceDate?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    if (sinceDate && Number.isNaN(new Date(sinceDate).getTime())) {
      throw new BadRequestException('sinceDate invalide.');
    }

    const extractDir = path.join(IMPORT_TMP_DIR, `trakt-import-${randomUUID()}`);

    try {
      const zip = new AdmZip(file.path);
      zip.extractAllTo(extractDir, true);
    } catch (error: any) {
      this.cleanup(file.path, extractDir);
      throw new BadRequestException(`Impossible de lire le fichier zip : ${error?.message ?? 'erreur inconnue'}.`);
    }

    // Le zip a pu contenir un sous-dossier (ex. "trakt-export-emdb/...json")
    // plutôt que les fichiers directement à la racine — on cherche le
    // dossier qui contient réellement les fichiers repères.
    const resolvedDir = this.findExportRoot(extractDir);

    if (!resolvedDir) {
      this.cleanup(file.path, extractDir);
      throw new BadRequestException(
        "Ce fichier ne ressemble pas à un export Trakt (aucun des fichiers attendus n'a été trouvé dans le zip).",
      );
    }

    // Fichier zip uploadé lui-même : plus nécessaire une fois extrait.
    this.safeUnlink(file.path);

    this.logger.log(
      `Import Trakt démarré pour l'utilisateur ${user.id} (dossier ${resolvedDir})` +
        (sinceDate ? ` depuis ${sinceDate}` : ''),
    );
    return this.importService.startTraktImport(user.id, resolvedDir, sinceDate);
  }

  /**
   * GET /import/trakt/:jobId/status
   * État courant du job : `status` (waiting/active/completed/failed/...),
   * `progress` (`{ imported, total }` une fois le job démarré), `result`
   * (stats finales une fois `completed`).
   */
  @Get('trakt/:jobId/status')
  async getStatus(@Param('jobId') jobId: string) {
    return this.importService.getJobStatus(jobId);
  }

  /**
   * POST /import/credits
   * Bouton "Importer les credits" de la page Profil — importe le casting
   * (acteurs + réalisateurs) de tous les titres avec lesquels l'utilisateur
   * a interagi (watches/ratings/listes), en tâche de fond. Complète un
   * import Trakt fait sans casting (`withCredits: false`, pour rester rapide
   * sur un gros export).
   */
  @Post('credits')
  async importCredits(@CurrentUser() user: any) {
    return this.importService.startCreditsImport(user.id);
  }

  /** GET /import/credits/:jobId/status — même contrat que /import/trakt/:jobId/status. */
  @Get('credits/:jobId/status')
  async getCreditsStatus(@Param('jobId') jobId: string) {
    return this.importService.getCreditsJobStatus(jobId);
  }

  /** Cherche récursivement (1 niveau) le dossier contenant les fichiers repères Trakt. */
  private findExportRoot(dir: string): string | null {
    if (this.hasMarkerFile(dir)) return dir;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const sub = path.join(dir, entry.name);
        if (this.hasMarkerFile(sub)) return sub;
      }
    }
    return null;
  }

  private hasMarkerFile(dir: string): boolean {
    return TRAKT_MARKER_FILES.some((f) => fs.existsSync(path.join(dir, f)));
  }

  private safeUnlink(filePath: string) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // non bloquant
    }
  }

  private cleanup(zipPath: string, extractDir: string) {
    this.safeUnlink(zipPath);
    try {
      fs.rmSync(extractDir, { recursive: true, force: true });
    } catch {
      // non bloquant
    }
  }
}
