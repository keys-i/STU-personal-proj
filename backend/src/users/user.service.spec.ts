// src/users/users.service.spec.ts
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { UserService } from './users.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, type User } from '../../generated/prisma/client.js';
import type { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/dto.js';
import { UserStatus } from './dto/dto.js';

type PrismaMock = {
  user: {
    findFirst: jest.Mock<any>;
    findMany: jest.Mock<any>;
    findUnique: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    updateMany: jest.Mock<any>;
    count: jest.Mock<any>;
  };
  $transaction: jest.Mock<any>;
};

function makePrismaMock(): PrismaMock {
  return {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

function prismaKnownError(code: string): Prisma.PrismaClientKnownRequestError {
  type Known = Prisma.PrismaClientKnownRequestError & {
    code: string;
    meta: Record<string, unknown>;
    clientVersion: string;
  };

  const err = new Error('prisma error') as Known;
  Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);

  err.code = code;
  err.meta = {};
  err.clientVersion = 'test';

  return err;
}

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'u1',
    name: 'Jane',
    email: 'jane@example.com',
    status: UserStatus.ACTIVE as unknown as User['status'],
    role: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

const updateDto = (p: Omit<UpdateUserDto, '_atLeastOne'>): UpdateUserDto =>
  ({ ...p, _atLeastOne: true }) as UpdateUserDto;

describe('UserService', () => {
  let prisma: PrismaMock;
  let service: UserService;

  beforeEach(() => {
    prisma = makePrismaMock();
    prisma.$transaction.mockImplementation(
      async (ops: Array<Promise<unknown>>) => Promise.all(ops),
    );

    service = new UserService(prisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it.each([
      ['returns user when found', makeUser({ id: 'u-ok' }), undefined],
      ['throws NotFound when missing', null, NotFoundException],
    ] as const)('%s', async (_name, found, expectedErr) => {
      prisma.user.findFirst.mockResolvedValue(found);

      if (!expectedErr) {
        await expect(service.getUser('u-ok')).resolves.toEqual(found);
        expect(prisma.user.findFirst).toHaveBeenCalledWith({
          where: { id: 'u-ok', deletedAt: null },
        });
      } else {
        await expect(service.getUser('missing')).rejects.toBeInstanceOf(
          expectedErr,
        );
      }
    });
  });

  describe('listUsers', () => {
    it.each([
      ['defaults page=1 when page<=0; limit clamps to 1', 0, 0, 2, 1, 1, 0, 1],
      [
        'defaults page=1 and limit=10 when non-finite',
        Number.NaN,
        Number.POSITIVE_INFINITY,
        0,
        1,
        10,
        0,
        10,
      ],
      [
        'floors & clamps limit to 100',
        2.9,
        999.9,
        1,
        1,
        100,
        (2 - 1) * 100,
        100,
      ],
    ] as const)(
      '%s',
      async (
        _name,
        page,
        limit,
        total,
        expPageMeta,
        expLimitMeta,
        expSkip,
        expTake,
      ) => {
        prisma.user.count.mockResolvedValue(total);
        prisma.user.findMany.mockResolvedValue(total ? [makeUser()] : []);

        const res = await service.listUsers(page, limit, undefined);

        expect(prisma.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: expSkip,
            take: expTake,
            orderBy: { createdAt: 'desc' },
          }),
        );

        expect(res.meta.page).toBe(expPageMeta);
        expect(res.meta.limit).toBe(expLimitMeta);
      },
    );

    it('builds where: name/status + both dates, and sets hasPrev/hasNext for middle page', async () => {
      const filter: UserFilterDto = {
        name: 'jo',
        status: UserStatus.INACTIVE,
        fromDate: '2025-01-01T00:00:00.000Z',
        toDate: '2025-01-31T23:59:59.999Z',
      };

      prisma.user.count.mockResolvedValue(25);
      prisma.user.findMany.mockResolvedValue([]);

      const res = await service.listUsers(2, 10, filter);

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deletedAt: null,
          name: { contains: 'jo', mode: 'insensitive' },
          status: UserStatus.INACTIVE,
          createdAt: {
            gte: new Date('2025-01-01T00:00:00.000Z'),
            lte: new Date('2025-01-31T23:59:59.999Z'),
          },
        }),
      });

      expect(res.meta.totalPages).toBe(3);
      expect(res.meta.page).toBe(2);
      expect(res.meta.hasPrev).toBe(true);
      expect(res.meta.hasNext).toBe(true);
    });

    it.each([
      [
        'adds createdAt.gte when only fromDate',
        { fromDate: '2025-01-01T00:00:00.000Z' },
        { gte: new Date('2025-01-01T00:00:00.000Z') },
      ],
      [
        'adds createdAt.lte when only toDate',
        { toDate: '2025-01-31T23:59:59.999Z' },
        { lte: new Date('2025-01-31T23:59:59.999Z') },
      ],
    ] as const)('%s', async (_name, filter, createdAt) => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      await service.listUsers(1, 10, filter);

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deletedAt: null,
          createdAt,
        }),
      });
    });

    it('does not add createdAt when no dates provided', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      await service.listUsers(1, 10, { name: 'jo' });

      const [[arg]] = prisma.user.count.mock.calls as Array<
        [{ where: Prisma.UserWhereInput }]
      >;
      const where = arg.where;

      expect(where).toEqual(
        expect.objectContaining({
          deletedAt: null,
          name: { contains: 'jo', mode: 'insensitive' },
        }),
      );
      expect(where).not.toHaveProperty('createdAt');
    });

    it.each([
      ['throws BadRequest for invalid fromDate', { fromDate: 'not-a-date' }],
      ['throws BadRequest for invalid toDate', { toDate: 'not-a-date' }],
      [
        'throws BadRequest when fromDate > toDate',
        {
          fromDate: '2025-02-01T00:00:00.000Z',
          toDate: '2025-01-01T00:00:00.000Z',
        },
      ],
    ] as const)('%s', async (_name, filter) => {
      await expect(service.listUsers(1, 10, filter)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('clamps meta.page to totalPages when page is too large', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([makeUser({ id: 'u1' })]);

      const res = await service.listUsers(99, 10, undefined);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: (99 - 1) * 10, take: 10 }),
      );
      expect(res.meta.totalPages).toBe(1);
      expect(res.meta.page).toBe(1);
      expect(res.meta.hasPrev).toBe(false);
      expect(res.meta.hasNext).toBe(false);
    });

    it('last page hasPrev true, hasNext false', async () => {
      prisma.user.count.mockResolvedValue(21);
      prisma.user.findMany.mockResolvedValue([]);

      const res = await service.listUsers(3, 10, undefined);

      expect(res.meta.totalPages).toBe(3);
      expect(res.meta.page).toBe(3);
      expect(res.meta.hasPrev).toBe(true);
      expect(res.meta.hasNext).toBe(false);
    });
  });

  describe('createUser', () => {
    it('creates and returns {created:true}', async () => {
      const dto: CreateUserDto = {
        name: 'Jane',
        email: 'jane@example.com',
        status: UserStatus.ACTIVE,
        role: undefined,
      };

      const created = makeUser({
        id: 'u-new',
        email: dto.email,
        name: dto.name,
      });
      prisma.user.create.mockResolvedValue(created);

      await expect(service.createUser(dto)).resolves.toEqual({
        user: created,
        created: true,
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          email: dto.email,
          status: dto.status,
          role: null,
        },
      });
    });

    it.each([
      ['P2002 + existing null => rethrow', 'P2002', null, 'rethrow'],
      [
        'P2002 + existing soft-deleted => Conflict',
        'P2002',
        makeUser({ deletedAt: new Date() }),
        'conflict',
      ],
      [
        'P2002 + existing not deleted => {created:false}',
        'P2002',
        makeUser({ id: 'u-existing', deletedAt: null }),
        'idempotent',
      ],
    ] as const)('%s', async (_name, code, existing, outcome) => {
      prisma.user.create.mockRejectedValue(prismaKnownError(code));
      prisma.user.findUnique.mockResolvedValue(existing);

      const email = existing?.email ?? 'existing@example.com';

      const p = {
        name: 'Jane',
        email,
        status: UserStatus.ACTIVE,
      } as CreateUserDto;

      if (outcome === 'rethrow') {
        await expect(service.createUser(p)).rejects.toBeInstanceOf(
          Prisma.PrismaClientKnownRequestError,
        );
      } else if (outcome === 'conflict') {
        await expect(service.createUser(p)).rejects.toBeInstanceOf(
          ConflictException,
        );
      } else {
        await expect(service.createUser(p)).resolves.toEqual({
          user: existing,
          created: false,
        });
      }
    });

    it('non-P2002 error => rethrow', async () => {
      const boom = new Error('boom');
      prisma.user.create.mockRejectedValue(boom);

      await expect(
        service.createUser({
          name: 'Jane',
          email: 'jane@example.com',
          status: UserStatus.ACTIVE,
        }),
      ).rejects.toBe(boom);
    });
  });

  describe('updateUser', () => {
    it('throws NotFound if existing is missing', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.updateUser('u1', updateDto({ name: 'x' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
      [
        'updates only name',
        updateDto({ name: 'New Name' }),
        { name: 'New Name' },
      ],
      [
        'updates email/status/role',
        updateDto({
          email: 'new@example.com',
          status: UserStatus.SUSPENDED,
          role: 'ADMIN',
        }),
        {
          email: 'new@example.com',
          status: UserStatus.SUSPENDED,
          role: 'ADMIN',
        },
      ],
    ] as const)('%s', async (_name, dto, expectedData) => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      const updated = makeUser({ id: 'u1', ...expectedData });
      prisma.user.update.mockResolvedValue(updated);

      await expect(service.updateUser('u1', dto)).resolves.toEqual(updated);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expectedData,
      });
    });

    it.each([
      ['maps P2002 to Conflict', 'P2002', ConflictException],
      ['maps P2025 to NotFound', 'P2025', NotFoundException],
    ] as const)('%s', async (_name, code, Err) => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockRejectedValue(prismaKnownError(code));

      await expect(
        service.updateUser('u1', updateDto({ name: 'x' })),
      ).rejects.toBeInstanceOf(Err);
    });

    it('rethrows Prisma known errors other than P2002/P2025', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      const err = prismaKnownError('P2016');
      prisma.user.update.mockRejectedValue(err);

      await expect(
        service.updateUser('u1', updateDto({ name: 'x' })),
      ).rejects.toBe(err);
    });

    it('rethrows plain objects (not PrismaClientKnownRequestError instance)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      const err = { code: 'P2002' };
      prisma.user.update.mockRejectedValue(err);

      await expect(
        service.updateUser('u1', updateDto({ email: 'x@y.com' })),
      ).rejects.toBe(err);
    });

    it('rethrows unknown errors', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      const boom = new Error('boom');
      prisma.user.update.mockRejectedValue(boom);

      await expect(
        service.updateUser('u1', updateDto({ name: 'x' })),
      ).rejects.toBe(boom);
    });
  });

  describe('softDeleteUser', () => {
    it.each([
      ['returns when updateMany affects rows', { count: 1 }, null, null],
      [
        'throws NotFound when nothing updated and user missing',
        { count: 0 },
        null,
        NotFoundException,
      ],
      [
        'returns when already soft-deleted (exists)',
        { count: 0 },
        { id: 'u1' },
        null,
      ],
    ] as const)(
      '%s',
      async (_name, updateManyResult, findUniqueResult, Err) => {
        prisma.user.updateMany.mockResolvedValue(updateManyResult);
        prisma.user.findUnique.mockResolvedValue(findUniqueResult);

        const p = service.softDeleteUser('u1');

        if (Err) {
          await expect(p).rejects.toBeInstanceOf(Err);
        } else {
          await expect(p).resolves.toBeUndefined();
        }
      },
    );
  });
});
