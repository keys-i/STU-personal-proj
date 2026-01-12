import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';

type AdapterArgs = { connectionString: string };

describe('PrismaService', () => {
  const connectMock = jest
    .fn<() => Promise<void>>()
    .mockResolvedValue(undefined);
  const disconnectMock = jest
    .fn<() => Promise<void>>()
    .mockResolvedValue(undefined);

  const prismaPgCalls: AdapterArgs[] = [];
  let lastSuperOpts: unknown;

  let PrismaService: typeof import('./prisma.service.js').PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    // register mocks (no await)
    jest.unstable_mockModule('../generated/prisma/client.js', () => ({
      PrismaClient: class {
        public $connect = connectMock;
        public $disconnect = disconnectMock;
        public constructor(opts?: unknown) {
          lastSuperOpts = opts;
        }
      },
    }));

    jest.unstable_mockModule('@prisma/adapter-pg', () => ({
      PrismaPg: class {
        public constructor(opts: AdapterArgs) {
          prismaPgCalls.push(opts);
        }
      },
    }));

    // import after mocks
    ({ PrismaService } = await import('./prisma.service.js'));
  });

  beforeEach(() => {
    connectMock.mockClear();
    disconnectMock.mockClear();
    prismaPgCalls.length = 0;
    lastSuperOpts = undefined;
  });

  it('constructs PrismaClient with PrismaPg adapter', () => {
    const svc = new PrismaService();
    expect(svc).toBeDefined();

    expect(prismaPgCalls).toEqual([
      { connectionString: process.env.DATABASE_URL as string },
    ]);
    expect(lastSuperOpts).toEqual({ adapter: expect.any(Object) });
  });

  it('onModuleInit calls $connect', async () => {
    const svc = new PrismaService();
    await svc.onModuleInit();
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy calls $disconnect', async () => {
    const svc = new PrismaService();
    await svc.onModuleDestroy();
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
