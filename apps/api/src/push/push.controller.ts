import { Body, Controller, Delete, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PushService } from './push.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';

/**
 * Endpoints d'enregistrement des tokens push (app Android Capacitor).
 *
 * - POST   /push/register   — enregistre/rafraîchit le token FCM du device courant
 * - DELETE /push/register   — désenregistre un token (logout / désinstall)
 */
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('register')
  @HttpCode(200)
  async register(@CurrentUser() user: any, @Body() dto: RegisterPushTokenDto): Promise<{ success: boolean }> {
    await this.pushService.registerToken(user.id, dto.token, dto.platform);
    return { success: true };
  }

  @Delete('register')
  async unregister(@CurrentUser() user: any, @Body() dto: UnregisterPushTokenDto): Promise<{ success: boolean }> {
    await this.pushService.unregisterToken(user.id, dto.token);
    return { success: true };
  }
}
