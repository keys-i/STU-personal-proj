// users.controller.spec.ts
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { UsersController } from './users.controller.js';
import { UserService, type Paginated } from './users.service.js';
import {
  type CreateUserDto,
  type ListUsersQueryDto,
  type IdParamDto,
  type UpdateUserDto,
  UserStatus,
} from './dto/dto.js';
import type { User } from '../../generated/prisma/client.js';

type UsersServiceSubset = Pick<
  UserService,
  'listUsers' | 'getUser' | 'createUser' | 'updateUser' | 'softDeleteUser'
>;

const makeReplyStub = (): Pick<FastifyReply, 'code'> & {
  code: jest.Mock<(c: number) => unknown>;
} => ({
  code: jest.fn<(c: number) => any>().mockReturnThis(),
});

const makeUpdateDto = (p: Omit<UpdateUserDto, '_atLeastOne'>): UpdateUserDto =>
  ({ ...p, _atLeastOne: true }) as UpdateUserDto;

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Jane',
    email: 'jane@example.com',
    status: UserStatus.ACTIVE,
    role: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function makePaginated<T>(
  data: T[],
  page = 1,
  limit = 10,
  total = data.length,
): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageClamped = Math.min(Math.max(1, page), totalPages);

  return {
    data,
    meta: {
      page: pageClamped,
      limit,
      total,
      totalPages,
      hasNext: pageClamped < totalPages,
      hasPrev: pageClamped > 1,
    },
  };
}

describe('UsersController', () => {
  let controller: UsersController;
  let usersSvc: jest.Mocked<UsersServiceSubset>;

  beforeEach(async () => {
    usersSvc = {
      listUsers: jest.fn<UserService['listUsers']>(),
      getUser: jest.fn<UserService['getUser']>(),
      createUser: jest.fn<UserService['createUser']>(),
      updateUser: jest.fn<UserService['updateUser']>(),
      softDeleteUser: jest.fn<UserService['softDeleteUser']>(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UserService, useValue: usersSvc }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    const cases: Array<[string, ListUsersQueryDto]> = [
      [
        'calls service with page/limit/filter',
        {
          page: 1,
          limit: 10,
          filter: {
            name: 'jo',
            status: UserStatus.INACTIVE,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-31T23:59:59.999Z',
          },
        },
      ],
      [
        'passes undefined filter through',
        {
          page: 1,
          limit: 10,
          filter: undefined,
        },
      ],
    ];

    it.each<[string, ListUsersQueryDto]>(cases)('%s', async (_name, q) => {
      const u1 = makeUser({ id: 'u1' });
      const result = makePaginated<User>([u1], q.page, q.limit, 1);

      usersSvc.listUsers.mockResolvedValue(result);

      await expect(controller.getAllUsers(q)).resolves.toEqual(result);
      expect(usersSvc.listUsers).toHaveBeenCalledTimes(1);
      expect(usersSvc.listUsers).toHaveBeenCalledWith(
        q.page,
        q.limit,
        q.filter,
      );
    });
  });

  describe('getUser', () => {
    it('calls service with id and returns User', async () => {
      const p = { id: 'u1' } satisfies IdParamDto;
      const user = makeUser({ id: p.id });

      usersSvc.getUser.mockResolvedValue(user);

      await expect(controller.getUser(p)).resolves.toEqual(user);
      expect(usersSvc.getUser).toHaveBeenCalledTimes(1);
      expect(usersSvc.getUser).toHaveBeenCalledWith(p.id);
    });
  });

  describe('createUser', () => {
    const cases: Array<[string, CreateUserDto, number, boolean, string]> = [
      [
        'sets 201 when created=true',
        {
          name: 'Jane',
          email: 'jane@example.com',
          status: UserStatus.ACTIVE,
          role: undefined,
        },
        HttpStatus.CREATED,
        true,
        'u-created',
      ],
      [
        'sets 200 when created=false',
        {
          name: 'Jane',
          email: 'jane@example.com',
          status: UserStatus.ACTIVE,
          role: undefined,
        },
        HttpStatus.OK,
        false,
        'u-existing',
      ],
    ];

    it.each<[string, CreateUserDto, number, boolean, string]>(cases)(
      '%s',
      async (_name, body, expectedCode, created, id) => {
        const reply = makeReplyStub();
        const user = makeUser({
          id,
          name: body.name,
          email: body.email,
          status: body.status,
        });

        usersSvc.createUser.mockResolvedValue({ user, created });

        await expect(
          controller.createUser(body, reply as unknown as FastifyReply),
        ).resolves.toEqual(user);

        expect(usersSvc.createUser).toHaveBeenCalledTimes(1);
        expect(usersSvc.createUser).toHaveBeenCalledWith(body);
        expect(reply.code).toHaveBeenCalledWith(expectedCode);
      },
    );
  });

  describe('updateUser', () => {
    it('calls service with id + body and returns updated User', async () => {
      const p = { id: 'u1' } satisfies IdParamDto;
      const body = makeUpdateDto({ name: 'New Name' });

      const updatedUser = makeUser({ id: p.id, name: body.name ?? 'New Name' });
      usersSvc.updateUser.mockResolvedValue(updatedUser);

      await expect(controller.updateUser(p, body)).resolves.toEqual(
        updatedUser,
      );
      expect(usersSvc.updateUser).toHaveBeenCalledTimes(1);
      expect(usersSvc.updateUser).toHaveBeenCalledWith(p.id, body);
    });
  });

  describe('deleteUser', () => {
    it('returns void and calls softDeleteUser', async () => {
      const p = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      } satisfies IdParamDto;

      usersSvc.softDeleteUser.mockResolvedValue(undefined);

      const res = await controller.deleteUser(p);

      expect(res).toBeUndefined();
      expect(usersSvc.softDeleteUser).toHaveBeenCalledTimes(1);
      expect(usersSvc.softDeleteUser).toHaveBeenCalledWith(p.id);
    });
  });
});
