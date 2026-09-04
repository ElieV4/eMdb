const sendEachForMulticastMock = jest.fn();
const initializeAppMock = jest.fn(() => ({ messaging: () => ({ sendEachForMulticast: sendEachForMulticastMock }) }));
const certMock = jest.fn((x: unknown) => x);

jest.mock('firebase-admin', () => ({
  initializeApp: () => initializeAppMock(),
  credential: { cert: (x: unknown) => certMock(x) },
}));

const prismaMock = {
  push_tokens: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('@emdb/db', () => ({
  prisma: prismaMock,
}));

const asMock = (fn: any) => fn as any;

describe('sendPushToUsers', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("ne fait rien si la liste d'utilisateurs est vide", async () => {
    const { sendPushToUsers } = require('./index');
    const result = await sendPushToUsers([], { title: 't', body: 'b' });
    expect(result).toEqual({ sent: 0 });
    expect(prismaMock.push_tokens.findMany).not.toHaveBeenCalled();
  });

  it('ignore silencieusement si FIREBASE_SERVICE_ACCOUNT_JSON est absent', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const { sendPushToUsers } = require('./index');
    const result = await sendPushToUsers(['u1'], { title: 't', body: 'b' });
    expect(result).toEqual({ sent: 0 });
    expect(initializeAppMock).not.toHaveBeenCalled();
  });

  it("n'appelle pas FCM si aucun token trouvé pour ces users", async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = Buffer.from('{"project_id":"x"}').toString('base64');
    asMock(prismaMock.push_tokens.findMany).mockResolvedValue([]);
    const { sendPushToUsers } = require('./index');
    const result = await sendPushToUsers(['u1'], { title: 't', body: 'b' });
    expect(result).toEqual({ sent: 0 });
    expect(sendEachForMulticastMock).not.toHaveBeenCalled();
  });

  it('envoie aux tokens trouvés et purge les tokens invalides', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = Buffer.from('{"project_id":"x"}').toString('base64');
    asMock(prismaMock.push_tokens.findMany).mockResolvedValue([{ token: 'tok-valid' }, { token: 'tok-stale' }]);
    sendEachForMulticastMock.mockResolvedValue({
      successCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });

    const { sendPushToUsers } = require('./index');
    const result = await sendPushToUsers(['u1', 'u2'], { title: 't', body: 'b', data: { title_id: 'x' } });

    expect(result).toEqual({ sent: 1 });
    expect(sendEachForMulticastMock).toHaveBeenCalledWith(
      expect.objectContaining({ tokens: ['tok-valid', 'tok-stale'] }),
    );
    expect(prismaMock.push_tokens.deleteMany).toHaveBeenCalledWith({ where: { token: { in: ['tok-stale'] } } });
  });
});
