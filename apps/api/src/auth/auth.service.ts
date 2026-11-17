import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ListsService } from '../lists/lists.service';
import { MailService } from '../mail/mail.service';
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

export interface MessageResponse {
  message: string;
}

/**
 * Jetons envoyés par email (confirmation d'adresse, mot de passe oublié).
 * Signés avec un secret dérivé de JWT_SECRET propre à chaque usage : sinon
 * JwtStrategy accepterait un lien reçu par email comme jeton d'accès.
 */
type EmailTokenPurpose = 'verify-email' | 'reset-password';

interface EmailTokenPayload {
  sub: string;
  purpose: EmailTokenPurpose;
  /** reset-password uniquement : empreinte du hash courant (lien à usage unique). */
  pwd?: string;
}

const EMAIL_TOKEN_TTL: Record<EmailTokenPurpose, '48h' | '1h'> = {
  'verify-email': '48h',
  'reset-password': '1h',
};

const FORGOT_PASSWORD_MESSAGE =
  'Si un compte existe pour cet email, un lien de réinitialisation vient de vous être envoyé.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly listsService: ListsService,
    private readonly mailService: MailService,
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
      if (user.status === 'unverified') {
        throw new UnauthorizedException(
          "Votre compte n'est pas encore validé : confirmez votre adresse email via le lien qui vous a été envoyé.",
        );
      }
      if (user.status === 'pending') {
        throw new UnauthorizedException(
          "Votre compte n'est pas encore validé par l'administrateur.",
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
    const { password_hash } = await this.prisma.users.findUniqueOrThrow({
      where: { id: user.id },
      select: { password_hash: true },
    });

    return {
      user,
      accessToken: await this.signAccessToken(user),
      refreshToken: await this.signRefreshToken(user, password_hash),
    };
  }

  async register(
    email: string,
    pseudo: string,
    password: string,
  ): Promise<PendingRegistrationResponse> {
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
    // Les autres démarrent en 'unverified' : ils confirment d'abord leur
    // adresse email (lien reçu), ce qui les passe en 'pending' et prévient
    // l'admin — cf. verifyEmail.
    const isAdmin = this.isAdminEmail(email);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.users.create({
      data: {
        email,
        pseudo,
        password_hash: passwordHash,
        status: isAdmin ? 'active' : 'unverified',
      },
    });

    if (isAdmin) {
      return {
        status: 'pending',
        message: 'Compte administrateur créé, vous pouvez vous connecter directement.',
      };
    }

    await this.sendVerificationEmail(user);

    return {
      status: 'pending',
      message:
        "Un email de confirmation vient de vous être envoyé. Cliquez sur le lien qu'il contient : votre demande sera alors transmise à l'administrateur.",
    };
  }

  /** Renvoie le lien de confirmation — réponse identique que le compte existe ou non. */
  async resendVerificationEmail(email: string): Promise<MessageResponse> {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (user?.status === 'unverified') {
      await this.sendVerificationEmail(user);
    }
    return {
      message:
        "Si ce compte attend une confirmation d'email, un nouveau lien vient de vous être envoyé.",
    };
  }

  /**
   * Lien du mail de confirmation : 'unverified' → 'pending', puis la demande
   * part chez l'admin. Rejouer le lien ne renotifie pas l'admin.
   */
  async verifyEmail(token: string): Promise<MessageResponse> {
    const payload = await this.verifyEmailToken(token, 'verify-email');
    const user = await this.prisma.users.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new BadRequestException('Lien de confirmation invalide ou expiré.');
    }

    // updateMany conditionnel : deux clics simultanés ne notifient qu'une fois.
    const { count } = await this.prisma.users.updateMany({
      where: { id: user.id, status: 'unverified' },
      data: { status: 'pending' },
    });

    if (count === 1) {
      await this.notifyAdmin(
        'account_request',
        user.id,
        `${user.pseudo} (${user.email}) demande la création d'un compte.`,
      );
      return {
        message:
          "Adresse email confirmée. Votre demande a été transmise à l'administrateur : vous pourrez vous connecter une fois votre compte validé.",
      };
    }

    if (user.status === 'active') {
      return { message: 'Adresse email déjà confirmée, vous pouvez vous connecter.' };
    }
    if (user.status === 'rejected') {
      return {
        message: 'Adresse email déjà confirmée, mais votre demande de compte a été refusée.',
      };
    }
    return {
      message:
        "Adresse email déjà confirmée. Votre compte est en attente de validation par l'administrateur.",
    };
  }

  async forgotPassword(email: string): Promise<MessageResponse> {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    const token = await this.signEmailToken({
      sub: user.id,
      purpose: 'reset-password',
      pwd: this.passwordFingerprint(user.password_hash),
    });

    try {
      await this.mailService.send({
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe eMDB',
        intro: `Bonjour ${user.pseudo}, une réinitialisation du mot de passe de votre compte eMDB a été demandée.`,
        buttonLabel: 'Choisir un nouveau mot de passe',
        buttonUrl: `${this.mailService.webAppUrl()}/reset-password?token=${encodeURIComponent(token)}`,
        footer:
          "Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.",
      });
    } catch (error) {
      this.logger.error(`Échec de l'envoi du mail de réinitialisation : ${error}`);
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(token: string, password: string): Promise<MessageResponse> {
    const payload = await this.verifyEmailToken(token, 'reset-password');
    const user = await this.prisma.users.findUnique({ where: { id: payload.sub } });

    // L'empreinte ne correspond plus dès que le mot de passe a changé :
    // le lien ne sert qu'une fois.
    if (!user || payload.pwd !== this.passwordFingerprint(user.password_hash)) {
      throw new BadRequestException('Lien de réinitialisation invalide ou déjà utilisé.');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { password_hash: await bcrypt.hash(password, 10) },
    });

    return { message: 'Mot de passe modifié. Vous pouvez maintenant vous connecter.' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<MessageResponse & Omit<AuthResponse, 'user'>> {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // 400 et non 401 : côté front, un 401 déclencherait un refresh puis une
    // déconnexion, alors que l'utilisateur a juste mal tapé son mot de passe.
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new BadRequestException('Mot de passe actuel incorrect.');
    }

    const updated = await this.prisma.users.update({
      where: { id: user.id },
      data: { password_hash: await bcrypt.hash(newPassword, 10) },
    });

    // Les jetons de rafraîchissement portent l'empreinte du mot de passe :
    // toutes les autres sessions sont déconnectées, celle-ci reçoit de
    // nouveaux jetons pour rester connectée.
    const safeUser = this.sanitizeUser(updated);
    return {
      message: 'Mot de passe modifié. Vos autres sessions ont été déconnectées.',
      accessToken: await this.signAccessToken(safeUser),
      refreshToken: await this.signRefreshToken(safeUser, updated.password_hash),
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        pseudo: string;
        pwd?: string;
      }>(refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });

      const user = await this.prisma.users.findUnique({ where: { id: payload.sub } });
      // Empreinte du mot de passe : un changement ou une réinitialisation du
      // mot de passe invalide toutes les sessions ouvertes.
      if (!user || payload.pwd !== this.passwordFingerprint(user.password_hash)) {
        throw new UnauthorizedException('Jeton de rafraîchissement invalide');
      }

      const safeUser = this.sanitizeUser(user);
      return {
        user: safeUser,
        accessToken: await this.signAccessToken(safeUser),
        refreshToken: await this.signRefreshToken(safeUser, user.password_hash),
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

  private async signRefreshToken(user: AuthenticatedUser, passwordHash: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        pseudo: user.pseudo,
        pwd: this.passwordFingerprint(passwordHash),
      },
      {
        secret: this.getRefreshTokenSecret(),
        expiresIn: '7d',
      },
    );
  }

  /**
   * Secret des jetons de rafraîchissement. Sans JWT_REFRESH_SECRET, il est
   * dérivé de JWT_SECRET (obligatoire) : jamais de valeur par défaut connue,
   * qui permettrait à n'importe qui de forger un jeton pour n'importe quel
   * compte.
   */
  private getRefreshTokenSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      `${this.configService.getOrThrow<string>('JWT_SECRET')}:refresh`
    );
  }

  private async sendVerificationEmail(user: UserRecord): Promise<void> {
    const token = await this.signEmailToken({ sub: user.id, purpose: 'verify-email' });
    try {
      await this.mailService.send({
        to: user.email,
        subject: 'Confirmez votre adresse email eMDB',
        intro: `Bonjour ${user.pseudo}, merci pour votre inscription sur eMDB. Confirmez votre adresse email pour transmettre votre demande de compte à l'administrateur.`,
        buttonLabel: 'Confirmer mon adresse email',
        buttonUrl: `${this.mailService.webAppUrl()}/verify-email?token=${encodeURIComponent(token)}`,
        footer:
          "Ce lien est valable 48 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.",
      });
    } catch (error) {
      // Le compte reste créé : l'utilisateur peut redemander le lien depuis
      // la page de connexion (resend-verification).
      this.logger.error(`Échec de l'envoi du mail de confirmation : ${error}`);
    }
  }

  private emailTokenSecret(purpose: EmailTokenPurpose): string {
    return `${this.configService.getOrThrow<string>('JWT_SECRET')}:${purpose}`;
  }

  private signEmailToken(payload: EmailTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.emailTokenSecret(payload.purpose),
      expiresIn: EMAIL_TOKEN_TTL[payload.purpose],
    });
  }

  private async verifyEmailToken(
    token: string,
    purpose: EmailTokenPurpose,
  ): Promise<EmailTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<EmailTokenPayload>(token, {
        secret: this.emailTokenSecret(purpose),
      });
      if (payload.purpose !== purpose) {
        throw new Error('purpose mismatch');
      }
      return payload;
    } catch {
      throw new BadRequestException(
        purpose === 'verify-email'
          ? 'Lien de confirmation invalide ou expiré.'
          : 'Lien de réinitialisation invalide ou expiré.',
      );
    }
  }

  private passwordFingerprint(passwordHash: string): string {
    return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
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

      // Ecrit une notification pour l'admin depuis la requête d'un AUTRE
      // utilisateur (inscription/connexion) — jamais "pour soi-même" :
      // bypass RLS explicite plutôt que forUser(relatedUserId), qui
      // écrirait par erreur une notification appartenant à ce dernier.
      await this.prisma.asSystem((tx) =>
        tx.notifications.create({
          data: {
            user_id: adminId,
            related_user_id: relatedUserId,
            type,
            message,
          },
        }),
      );
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
