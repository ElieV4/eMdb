import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

const mockPrismaService = {
  $queryRawUnsafe: jest.fn(),
};

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = moduleRef.get<AppController>(AppController);
  });

  it('renvoie un statut ok sur /health', () => {
    expect(controller.health()).toEqual({ status: 'ok', service: 'emdb-api' });
  });

  it('renvoie un statut ok sur /health/db', async () => {
    mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([{ '?column?': 1 }]);
    await expect(controller.healthDb()).resolves.toEqual({
      status: 'ok',
      service: 'emdb-api',
      db: 'ok',
    });
  });
});
