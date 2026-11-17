import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailMessage {
  to: string;
  subject: string;
  /** Texte d'intro affiché au-dessus du bouton. */
  intro: string;
  buttonLabel: string;
  buttonUrl: string;
  /** Petite ligne grise sous le bouton (expiration, "ignorez si..."). */
  footer?: string;
}

/**
 * Envoi des emails transactionnels (confirmation d'adresse, mot de passe
 * oublié) via l'API HTTP d'un fournisseur — pas de SMTP : Render (hébergeur
 * de l'API) bloque les ports SMTP sortants sur l'offre gratuite.
 *
 * Fournisseur choisi par MAIL_PROVIDER :
 * - `resend` : RESEND_API_KEY (expéditeur sur un domaine vérifié chez Resend)
 * - `brevo`  : BREVO_API_KEY (un simple expéditeur vérifié suffit, pas
 *   besoin de domaine)
 * - absent   : aucun envoi, le lien est écrit dans les logs (dev local).
 *
 * MAIL_FROM : adresse expéditrice, ex. "eMDB <no-reply@mondomaine.fr>".
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  /** URL publique du front, utilisée pour construire les liens des emails. */
  webAppUrl(): string {
    const explicit = this.configService.get<string>('WEB_APP_URL');
    const fromCors = this.configService.get<string>('CORS_ORIGIN')?.split(',')[0]?.trim();
    return (explicit || fromCors || 'http://localhost:3000').replace(/\/+$/, '');
  }

  async send(message: MailMessage): Promise<void> {
    const provider = this.configService.get<string>('MAIL_PROVIDER', '').toLowerCase();
    const html = this.renderHtml(message);
    const text = `${message.intro}\n\n${message.buttonLabel} : ${message.buttonUrl}${
      message.footer ? `\n\n${message.footer}` : ''
    }`;

    if (provider === 'resend') {
      await this.post(
        'https://api.resend.com/emails',
        {
          Authorization: `Bearer ${this.configService.getOrThrow<string>('RESEND_API_KEY')}`,
        },
        {
          from: this.from(),
          to: [message.to],
          subject: message.subject,
          html,
          text,
        },
      );
      return;
    }

    if (provider === 'brevo') {
      const { name, email } = this.parseFrom(this.from());
      await this.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          'api-key': this.configService.getOrThrow<string>('BREVO_API_KEY'),
        },
        {
          sender: name ? { name, email } : { email },
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: html,
          textContent: text,
        },
      );
      return;
    }

    this.logger.warn(
      `MAIL_PROVIDER non configuré — email "${message.subject}" pour ${message.to} non envoyé. Lien : ${message.buttonUrl}`,
    );
  }

  private from(): string {
    return this.configService.get<string>('MAIL_FROM', 'eMDB <no-reply@emdb.local>');
  }

  /** "eMDB <a@b.c>" → { name: 'eMDB', email: 'a@b.c' } ; "a@b.c" → { email }. */
  private parseFrom(from: string): { name?: string; email: string } {
    const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    return match ? { name: match[1] || undefined, email: match[2] } : { email: from.trim() };
  }

  private async post(url: string, headers: Record<string, string>, body: unknown): Promise<void> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Envoi d'email échoué (${res.status}) : ${detail}`);
    }
  }

  private renderHtml({ intro, buttonLabel, buttonUrl, footer }: MailMessage): string {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td style="font-size:24px;font-weight:bold;text-align:center;padding-bottom:24px">eMDB</td></tr>
      <tr><td style="font-size:15px;line-height:1.5;padding-bottom:24px">${esc(intro)}</td></tr>
      <tr><td align="center" style="padding-bottom:24px">
        <a href="${esc(buttonUrl)}" style="display:inline-block;background:#e50914;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px">${esc(buttonLabel)}</a>
      </td></tr>
      <tr><td style="font-size:12px;line-height:1.5;color:#71717a">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="${esc(buttonUrl)}" style="color:#71717a;word-break:break-all">${esc(buttonUrl)}</a>
        ${footer ? `<br><br>${esc(footer)}` : ''}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  }
}
