import { Test, TestingModule } from '@nestjs/testing';
import { PushService } from './push.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaServiceMock = {
  push_tokens: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('PushService', () => {
  let service: PushService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PushService, { provide: PrismaService, useValue: prismaServiceMock }],
    }).compile();

    service = module.get<PushService>(PushService);
    jest.clearAllMocks();
  });

  const userId = 'user-uuid';
  const token = 'fcm-token-abc';

  describe('registerToken', () => {
    it('upsert le token en le rattachant à l\'utilisateur courant', async () => {
      await service.registerToken(userId, token, 'android');

      expect(prismaServiceMock.push_tokens.upsert).toHaveBeenCalledWith({
        where: { token },
        update: { user_id: userId, platform: 'android', last_seen_at: expect.any(Date) },
        create: { user_id: userId, token, platform: 'android' },
      });
    });
  });

  describe('unregisterToken', () => {
    it("supprime le token pour l'utilisateur courant uniquement", async () => {
      await service.unregisterToken(userId, token);

      expect(prismaServiceMock.push_tokens.deleteMany).toHaveBeenCalledWith({
        where: { token, user_id: userId },
      });
    });
  });
});
