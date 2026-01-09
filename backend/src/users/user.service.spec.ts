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
  return new Prisma.PrismaClientKnownRequestError('prisma error', {
    code,
    clientVersion: 'test',
    meta: {},
  });
}

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'u1',
    name: 'Jane',
    email: 'jane@example.com' as string,
    status: UserStatus.ACTIVE as unknown as User['status'],
    role: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

// required phantom marker helper (keeps tests readable)
const updateDto = (p: Omit<UpdateUserDto, '_atLeastOne'>): UpdateUserDto =>
  ({ ...p, _atLeastOne: true }) as UpdateUserDto;

describe('UserService', () => {
  let prisma: PrismaMock;
  let service: UserService;

  beforeEach(() => {
    prisma = makePrismaMock();

    // Emulate PrismaClient.$transaction([promise1, promise2])
    prisma.$transaction.mockImplementation(
      async (ops: Array<Promise<unknown>>) => Promise.all(ops),
    );

    service = new UserService(prisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('returns user when found and not soft-deleted', async () => {
      const u = makeUser({ id: 'u-ok' });
      prisma.user.findFirst.mockResolvedValue(u);

      await expect(service.getUser('u-ok')).resolves.toEqual(u);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'u-ok', deletedAt: null },
      });
    });

    it('throws NotFound when missing/soft-deleted', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getUser('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listUsers', () => {
    it('defaults page=1 when page is <=0, clamps limit to [1..100], floors both', async () => {
      prisma.user.count.mockResolvedValue(2);
      prisma.user.findMany.mockResolvedValue([
        makeUser({ id: 'u1' }),
        makeUser({ id: 'u2' }),
      ]);

      // page 0 -> 1, limit 0 -> 1
      const res = await service.listUsers(0, 0, undefined);

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 1,
        orderBy: { createdAt: 'desc' },
      });

      expect(res.meta.page).toBe(1);
      expect(res.meta.limit).toBe(1);
    });

    it('defaults page=1 and limit=10 when non-finite', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      const res = await service.listUsers(
        Number.NaN,
        Number.POSITIVE_INFINITY,
        undefined,
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(res.meta.page).toBe(1);
      expect(res.meta.limit).toBe(10);
      expect(res.meta.totalPages).toBe(1); // total=0 still yields 1
    });

    it('floors fractional page/limit and clamps limit to 100', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([makeUser({ id: 'u1' })]);

      // page 2.9 -> 2, limit 999.9 -> 100
      const res = await service.listUsers(2.9, 999.9, undefined);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: (2 - 1) * 100, take: 100 }),
      );
      expect(res.meta.limit).toBe(100);
    });

    it('builds where: name/status + both dates, and sets hasPrev/hasNext for middle page', async () => {
      const filter: UserFilterDto = {
        name: 'jo',
        status: UserStatus.INACTIVE,
        fromDate: '2025-01-01T00:00:00.000Z',
        toDate: '2025-01-31T23:59:59.999Z',
      };

      prisma.user.count.mockResolvedValue(25); // limit 10 => totalPages 3
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

    it('adds createdAt.gte when only fromDate provided', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      await service.listUsers(1, 10, {
        fromDate: '2025-01-01T00:00:00.000Z',
      });

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deletedAt: null,
          createdAt: { gte: new Date('2025-01-01T00:00:00.000Z') },
        }),
      });
    });

    it('adds createdAt.lte when only toDate provided', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      await service.listUsers(1, 10, {
        toDate: '2025-01-31T23:59:59.999Z',
      });

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deletedAt: null,
          createdAt: { lte: new Date('2025-01-31T23:59:59.999Z') },
        }),
      });
    });

    it('does not add createdAt when no dates provided', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      await service.listUsers(1, 10, { name: 'jo' });

      const where = (
        prisma.user.count.mock.calls[0][0] as { where: Prisma.UserWhereInput }
      ).where;

      expect(where).toEqual(
        expect.objectContaining({
          deletedAt: null,
          name: { contains: 'jo', mode: 'insensitive' },
        }),
      );
      expect(where).not.toHaveProperty('createdAt');
    });

    it('throws BadRequest for invalid fromDate', async () => {
      await expect(
        service.listUsers(1, 10, { fromDate: 'not-a-date' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest for invalid toDate', async () => {
      await expect(
        service.listUsers(1, 10, { toDate: 'not-a-date' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when fromDate > toDate', async () => {
      await expect(
        service.listUsers(1, 10, {
          fromDate: '2025-02-01T00:00:00.000Z',
          toDate: '2025-01-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('clamps meta.page to totalPages when page is too large', async () => {
      prisma.user.count.mockResolvedValue(1); // limit 10 => totalPages 1
      prisma.user.findMany.mockResolvedValue([makeUser({ id: 'u1' })]);

      const res = await service.listUsers(99, 10, undefined);

      // note: query uses skip from safePage, but meta clamps
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: (99 - 1) * 10, take: 10 }),
      );
      expect(res.meta.totalPages).toBe(1);
      expect(res.meta.page).toBe(1);
      expect(res.meta.hasPrev).toBe(false);
      expect(res.meta.hasNext).toBe(false);
    });

    it('last page hasPrev true, hasNext false', async () => {
      prisma.user.count.mockResolvedValue(21); // totalPages 3 (limit 10)
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

    it('P2002 + existing null => rethrow original error', async () => {
      const err = prismaKnownError('P2002');
      prisma.user.create.mockRejectedValue(err);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createUser({
          name: 'Jane',
          email: 'jane@example.com',
          status: UserStatus.ACTIVE,
        }),
      ).rejects.toBe(err);
    });

    it('P2002 + existing soft-deleted => Conflict', async () => {
      prisma.user.create.mockRejectedValue(prismaKnownError('P2002'));
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ deletedAt: new Date('2025-01-01T00:00:00.000Z') }),
      );

      await expect(
        service.createUser({
          name: 'Jane',
          email: 'jane@example.com',
          status: UserStatus.ACTIVE,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('P2002 + existing not deleted => {created:false}', async () => {
      prisma.user.create.mockRejectedValue(prismaKnownError('P2002'));
      const existing = makeUser({ id: 'u-existing', deletedAt: null });
      prisma.user.findUnique.mockResolvedValue(existing);

      await expect(
        service.createUser({
          name: 'Jane',
          email: existing.email ?? 'existing@example.com',
          status: UserStatus.ACTIVE,
        }),
      ).resolves.toEqual({ user: existing, created: false });
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

    it('updates only name (other fields absent => false branches)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      const updated = makeUser({ id: 'u1', name: 'New Name' });
      prisma.user.update.mockResolvedValue(updated);

      const dto = updateDto({ name: 'New Name' });
      await expect(service.updateUser('u1', dto)).resolves.toEqual(updated);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { name: 'New Name' },
      });
    });

    it('updates email/status/role (name absent => false branch for name)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      const updated = makeUser({
        id: 'u1',
        email: 'new@example.com',
        status: UserStatus.SUSPENDED,
        role: 'ADMIN',
      });
      prisma.user.update.mockResolvedValue(updated);

      const role = 'ADMIN' as UpdateUserDto['role'];
      const dto = updateDto({
        email: 'new@example.com',
        status: UserStatus.SUSPENDED,
        role,
      });

      await expect(service.updateUser('u1', dto)).resolves.toEqual(updated);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          email: 'new@example.com',
          status: UserStatus.SUSPENDED,
          role,
        },
      });
    });

    it('maps Prisma P2002 to Conflict', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockRejectedValue(prismaKnownError('P2002'));

      await expect(
        service.updateUser('u1', updateDto({ email: 'dup@example.com' })),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps Prisma P2025 to NotFound', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockRejectedValue(prismaKnownError('P2025'));

      await expect(
        service.updateUser('u1', updateDto({ name: 'x' })),
      ).rejects.toBeInstanceOf(NotFoundException);
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
      const err = { code: 'P2002' }; // not an instance => should not be mapped
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
    it('returns when updateMany affects rows', async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.softDeleteUser('u1')).resolves.toBeUndefined();

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'u1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFound when nothing updated and user does not exist', async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.softDeleteUser('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('does not throw when nothing updated because already soft-deleted', async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await expect(service.softDeleteUser('u1')).resolves.toBeUndefined();
    });
  });
});
