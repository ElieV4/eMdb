import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListsService } from '../lists/lists.service';
import { MailService } from '../mail/mail.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const prismaServiceMock = {
  forUser: jest.fn((_userId: string, fn: any) => fn(prismaServiceMock)),
  asSystem: jest.fn((fn: any) => fn(prismaServiceMock)),
  users: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  notifications: {
    create: jest.fn(),
  },
};

const listsServiceMock = {};

const mailServiceMock = {
  send: jest.fn(),
  webAppUrl: jest.fn(() => 'https://emdb.test'),
};

/** Extrait le jeton du lien envoyé dans le dernier email. */
function lastMailToken(): string {
  const { buttonUrl } = mailServiceMock.send.mock.calls.at(-1)[0];
  return decodeURIComponent(new URL(buttonUrl).searchParams.get('token')!);
}

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const mockUser: any = {
    id: 'user-id',
    email: 'test@example.com',
    pseudo: 'testuser',
    password_hash: 'hashed-password',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    avatar_url: null,
    status: 'active',
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'admin@example.com';
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '15m' } }),
      ],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: ListsService,
          useValue: listsServiceMock,
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('validateUserCredentials returns user for valid credentials', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const validated = await service.validateUserCredentials('test@example.com', 'password');

    expect(validated).toMatchObject({
      id: 'user-id',
      email: 'test@example.com',
      pseudo: 'testuser',
    });
  });

  it('validateUserCredentials returns null for invalid password', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const validated = await service.validateUserCredentials('test@example.com', 'wrong-password');

    expect(validated).toBeNull();
  });

  it('validateUserCredentials rejects a user who has not confirmed their email', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      status: 'unverified',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(service.validateUserCredentials('test@example.com', 'password')).rejects.toThrow(
      /confirmez votre adresse email/,
    );
  });

  it('validateUserCredentials rejects a user awaiting admin approval', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      status: 'pending',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.validateUserCredentials('test@example.com', 'password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('register creates an unverified user and emails a confirmation link, without notifying the admin', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (prismaServiceMock.users.create as jest.Mock).mockImplementation(({ data }) => ({
      ...mockUser,
      ...data,
    }));

    await service.register('test@example.com', 'testuser', 'password123');

    expect(prismaServiceMock.users.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'unverified' }) }),
    );
    expect(mailServiceMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        buttonUrl: expect.stringContaining('https://emdb.test/verify-email?token='),
      }),
    );
    expect(prismaServiceMock.notifications.create).not.toHaveBeenCalled();
  });

  it('verifyEmail moves the user to pending and notifies the admin once', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaServiceMock.users.create as jest.Mock).mockResolvedValue({
      ...mockUser,
      status: 'unverified',
    });
    await service.register('test@example.com', 'testuser', 'password123');
    const token = lastMailToken();

    (prismaServiceMock.users.findUnique as jest.Mock).mockImplementation(({ where }) =>
      where.email === 'admin@example.com'
        ? { id: 'admin-id', email: 'admin@example.com' }
        : { ...mockUser, status: 'unverified' },
    );
    (prismaServiceMock.users.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    await service.verifyEmail(token);

    expect(prismaServiceMock.users.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-id', status: 'unverified' },
      data: { status: 'pending' },
    });
    expect(prismaServiceMock.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user_id: 'admin-id', type: 'account_request' }),
      }),
    );

    // Lien rejoué : plus rien à mettre à jour, pas de nouvelle notif.
    (prismaServiceMock.users.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prismaServiceMock.notifications.create as jest.Mock).mockClear();
    await service.verifyEmail(token);
    expect(prismaServiceMock.notifications.create).not.toHaveBeenCalled();
  });

  it('verifyEmail rejects a password-reset token', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
    await service.forgotPassword('test@example.com');

    await expect(service.verifyEmail(lastMailToken())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forgotPassword answers the same way for an unknown email and sends nothing', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(null);

    const unknown = await service.forgotPassword('nobody@example.com');

    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
    const known = await service.forgotPassword('test@example.com');

    expect(unknown).toEqual(known);
    expect(mailServiceMock.send).toHaveBeenCalledTimes(1);
  });

  it('resetPassword updates the password, and the link cannot be reused', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
    await service.forgotPassword('test@example.com');
    const token = lastMailToken();
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    await service.resetPassword(token, 'new-password');

    expect(prismaServiceMock.users.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { password_hash: 'new-hash' },
    });

    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      password_hash: 'new-hash',
    });
    await expect(service.resetPassword(token, 'other-password')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('changePassword refuses a wrong current password with a 400', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.changePassword('user-id', 'wrong', 'new-password')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaServiceMock.users.update).not.toHaveBeenCalled();
  });

  it('changePassword stores the new hash', async () => {
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    (prismaServiceMock.users.update as jest.Mock).mockResolvedValue({
      ...mockUser,
      password_hash: 'new-hash',
    });

    const result = await service.changePassword('user-id', 'password', 'new-password');

    expect(prismaServiceMock.users.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { password_hash: 'new-hash' },
    });
    // Nouveaux jetons pour la session courante, liés au nouveau mot de passe.
    (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      password_hash: 'new-hash',
    });
    await expect(service.refreshTokens(result.refreshToken)).resolves.toMatchObject({
      user: { id: 'user-id' },
    });
  });

  describe('sessions et mot de passe', () => {
    const loginRefreshToken = async () => {
      (prismaServiceMock.users.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        password_hash: 'hashed-password',
      });
      const { refreshToken } = await service.login({
        id: 'user-id',
        email: 'test@example.com',
        pseudo: 'testuser',
      } as any);
      return refreshToken;
    };

    it('un jeton de rafraîchissement reste valide tant que le mot de passe ne change pas', async () => {
      const refreshToken = await loginRefreshToken();
      (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.refreshTokens(refreshToken)).resolves.toMatchObject({
        user: { id: 'user-id' },
      });
    });

    it('changer ou réinitialiser le mot de passe invalide les sessions ouvertes', async () => {
      const refreshToken = await loginRefreshToken();
      (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        password_hash: 'another-hash',
      });

      await expect(service.refreshTokens(refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("refuse un jeton signé avec l'ancien secret par défaut", async () => {
      const { JwtService } = await import('@nestjs/jwt');
      const forged = await new JwtService().signAsync(
        { sub: 'user-id', email: 'test@example.com', pseudo: 'testuser' },
        { secret: 'emdb_default_refresh_secret', expiresIn: '7d' },
      );
      (prismaServiceMock.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.refreshTokens(forged)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
