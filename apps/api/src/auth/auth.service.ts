import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ListsService } from '../lists/lists.service';
import * as bcrypt from 'bcrypt';

type UserRecord = NonNullable<Awaited<ReturnType<PrismaService['users']['findUnique']>>>;
export type AuthenticatedUser = Omit<UserRecord, 'password_hash'>;

export interface AuthResponse {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export interface PendingRegistrationResponse {
  status: 'pending';
  message: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly listsService: ListsService,
  ) {}

  async validateUserCredentials(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    // Un compte admin (ADMIN_EMAILS) doit toujours pouvoir se connecter,
    // quel que soit son statut — sinon un admin dont le compte redevient
    // 'pending' (ex: recréé après reset de la base) se bloque lui-même :
    // plus personne ne peut approuver de demande, y compris la sienne.
    if (!this.isAdminEmail(user.email)) {
      if (user.status === 'pending') {
        throw new UnauthorizedException(
          "Votre compte est en attente de validation par l'administrateur.",
        );
      }
      if (user.status === 'rejected') {
        throw new UnauthorizedException('Votre demande de compte a été refusée.');
      }
    }

    return this.sanitizeUser(user);
  }

  async login(user: AuthenticatedUser): Promise<AuthResponse> {
    await this.notifyAdminOfLogin(user);

    return {
      user,
      accessToken: await this.signAccessToken(user),
      refreshToken: await this.signRefreshToken(user),
    };
  }

  async register(email: string, pseudo: string, password: string): Promise<PendingRegistrationResponse> {
    const existingByEmail = await this.prisma.users.findUnique({ where: { email } });
    if (existingByEmail) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }

    const existingByPseudo = await this.prisma.users.findUnique({ where: { pseudo } });
    if (existingByPseudo) {
      throw new ConflictException('Ce pseudo est déjà utilisé.');
    }

    // Un compte admin (ADMIN_EMAILS) n'a pas besoin de sa propre validation —
    // sans ça, un admin qui doit se réinscrire (ex: base réinitialisée) reste
    // bloqué en 'pending' sans personne pour l'approuver.
    const isAdmin = this.isAdminEmail(email);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.users.create({
      data: {
        email,
        pseudo,
        password_hash: passwordHash,
        status: isAdmin ? 'active' : 'pending',
      },
    });

    if (isAdmin) {
      return {
        status: 'pending',
        message: 'Compte administrateur créé, vous pouvez vous connecter directement.',
      };
    }

    await this.notifyAdmin(
      'account_request',
      user.id,
      `${pseudo} (${email}) demande la création d'un compte.`,
    );

    return {
      status: 'pending',
      message: 'Votre demande a été envoyée. Vous pourrez vous connecter une fois validée.',
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        pseudo: string;
      }>(refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });

      const user = await this.prisma.users.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('Jeton de rafraîchissement invalide');
      }

      const safeUser = this.sanitizeUser(user);
      return {
        user: safeUser,
        accessToken: await this.signAccessToken(safeUser),
        refreshToken: await this.signRefreshToken(safeUser),
      };
    } catch {
      throw new UnauthorizedException('Jeton de rafraîchissement invalide');
    }
  }

  async logout(): Promise<void> {
    return;
  }

  private async signAccessToken(user: AuthenticatedUser): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id, email: user.email, pseudo: user.pseudo });
  }

  private async signRefreshToken(user: AuthenticatedUser): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email, pseudo: user.pseudo },
      {
        secret: this.getRefreshTokenSecret(),
        expiresIn: '7d',
      },
    );
  }

  private getRefreshTokenSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET', 'emdb_default_refresh_secret');
  }

  private sanitizeUser(user: UserRecord): AuthenticatedUser {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  /** Même logique que AdminGuard : email présent dans ADMIN_EMAILS (.env). */
  private isAdminEmail(email: string): boolean {
    const adminEmailsEnv = this.configService.get<string>('ADMIN_EMAILS', '');
    const adminEmails = adminEmailsEnv
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    return adminEmails.includes(email.toLowerCase());
  }

  /**
   * Premier email de ADMIN_EMAILS (même source que AdminGuard) — c'est le
   * compte qui reçoit les notifs du flux de validation des inscriptions.
   */
  private async resolveAdminUserId(): Promise<string | null> {
    const adminEmailsEnv = this.configService.get<string>('ADMIN_EMAILS', '');
    const adminEmail = adminEmailsEnv
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean)[0];

    if (!adminEmail) {
      return null;
    }

    const admin = await this.prisma.users.findUnique({ where: { email: adminEmail } });
    return admin?.id ?? null;
  }

  private async notifyAdmin(
    type: 'account_request' | 'account_login',
    relatedUserId: string,
    message: string,
  ): Promise<void> {
    try {
      const adminId = await this.resolveAdminUserId();
      if (!adminId) {
        return;
      }

      await this.prisma.notifications.create({
        data: {
          user_id: adminId,
          related_user_id: relatedUserId,
          type,
          message,
        },
      });
    } catch (error) {
      // Une notif ratée ne doit jamais faire échouer l'inscription/connexion.
      this.logger.warn(`Échec de la notification admin (${type}): ${error}`);
    }
  }

  private async notifyAdminOfLogin(user: AuthenticatedUser): Promise<void> {
    const adminId = await this.resolveAdminUserId();
    // Pas de notif quand l'admin se connecte lui-même.
    if (!adminId || adminId === user.id) {
      return;
    }

    await this.notifyAdmin('account_login', user.id, `${user.pseudo} vient de se connecter.`);
  }
}
