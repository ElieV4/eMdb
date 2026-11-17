import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, AuthenticatedUser } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { EmailDto } from './dto/email.dto';
import { TokenDto } from './dto/token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// Endpoints qui envoient un email : limite plus stricte que la limite
// globale (100/min) pour ne pas pouvoir bombarder une boîte mail.
const EMAIL_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(EMAIL_THROTTLE)
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.pseudo, body.password);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUserCredentials(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }

    return this.authService.login(user);
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: TokenDto) {
    return this.authService.verifyEmail(body.token);
  }

  @Throttle(EMAIL_THROTTLE)
  @Post('resend-verification')
  async resendVerification(@Body() body: EmailDto) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Throttle(EMAIL_THROTTLE)
  @Post('forgot-password')
  async forgotPassword(@Body() body: EmailDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refreshTokens(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    await this.authService.logout();
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
