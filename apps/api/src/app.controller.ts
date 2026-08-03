import { Controller, Get, Query } from '@nestjs/common';

const ALLOWED_WATCH_LINK_HOSTS = new Set([
  'www.watchtv.click',
  'watchtv.click',
  'www.hydraflix.cc',
  'hydraflix.cc',
  'www.moviedb.wiki',
  'moviedb.wiki',
]);

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'emdb-api' };
  }

  @Get('watch-links/validate')
  async validateWatchLink(@Query('url') url: string) {
    if (!url) {
      return { valid: false, status: 400 };
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { valid: false, status: 400 };
    }

    const host = parsed.hostname.toLowerCase();
    const isAllowed = [...ALLOWED_WATCH_LINK_HOSTS].some(
      (allowedHost) =>
        host === allowedHost || host.endsWith(`.${allowedHost}`),
    );

    if (!isAllowed) {
      return { valid: false, status: 403 };
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
      });
      return { valid: response.ok, status: response.status };
    } catch {
      return { valid: false, status: 0 };
    }
  }
}
