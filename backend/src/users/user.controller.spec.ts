// users.controller.spec.ts
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { UsersController } from './users.controller.js';
import { UserService } from './users.service.js';
import {
  CreateUserDto,
  ListUsersQueryDto,
  IdParamDto,
  UpdateUserDto,
  UserStatus,
} from './dto/dto.js';

type UsersServiceSubset = Pick<
  UserService,
  'listUsers' | 'getUser' | 'createUser' | 'updateUser' | 'softDeleteUser'
>;

type CreateUserServiceResult = Awaited<ReturnType<UserService['createUser']>>;
type ListUsersServiceResult = Awaited<ReturnType<UserService['listUsers']>>;
type GetUserServiceResult = Awaited<ReturnType<UserService['getUser']>>;
type UpdateUserServiceResult = Awaited<ReturnType<UserService['updateUser']>>;

function makeReplyStub() {
  // Only the method used by the controller
  const reply = {
    code: jest.fn<(statusCode: number) => FastifyReply>().mockReturnThis(),
  };
  return reply;
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
    it('calls service with page/limit/filter and returns service result', async () => {
      const q = {
        page: 1,
        limit: 10,
        filter: {
          name: 'jo',
          status: UserStatus.INACTIVE,
          fromDate: '2025-01-01T00:00:00.000Z',
          toDate: '2025-01-31T23:59:59.999Z',
        },
      } satisfies ListUsersQueryDto;

      // Keep return type aligned with your service definition
      const listResult = {
        items: [],
        page: q.page,
        limit: q.limit,
        total: 0,
      } as unknown as ListUsersServiceResult;

      usersSvc.listUsers.mockResolvedValue(listResult);

      await expect(controller.getAllUsers(q)).resolves.toBe(listResult);
      expect(usersSvc.listUsers).toHaveBeenCalledTimes(1);
      expect(usersSvc.listUsers).toHaveBeenCalledWith(
        q.page,
        q.limit,
        q.filter,
      );
    });

    it('passes through undefineds when optional query fields are missing', async () => {
      const q = {
        page: 1,
        limit: 10,
        filter: undefined,
      } satisfies ListUsersQueryDto;

      const listResult = {
        items: [],
        page: 1,
        limit: 10,
        total: 0,
      } as unknown as ListUsersServiceResult;

      usersSvc.listUsers.mockResolvedValue(listResult);

      await expect(controller.getAllUsers(q)).resolves.toBe(listResult);
      expect(usersSvc.listUsers).toHaveBeenCalledWith(
        q.page,
        q.limit,
        q.filter,
      );
    });
  });

  describe('getUser', () => {
    it('calls service with id and returns user', async () => {
      const p = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      } satisfies IdParamDto;

      const user = {
        id: p.id,
        name: 'Jane',
        email: 'jane@example.com',
        status: 'ACTIVE',
      } as unknown as GetUserServiceResult;

      usersSvc.getUser.mockResolvedValue(user);

      await expect(controller.getUser(p)).resolves.toBe(user);
      expect(usersSvc.getUser).toHaveBeenCalledTimes(1);
      expect(usersSvc.getUser).toHaveBeenCalledWith(p.id);
    });
  });

  describe('createUser', () => {
    it('sets 201 and returns user when created=true', async () => {
      const body = {
        name: 'Jane',
        email: 'jane@example.com',
        status: 'ACTIVE',
      } satisfies CreateUserDto;

      const reply = makeReplyStub();

      const createdUser = {
        id: 'u1',
        name: body.name,
        email: body.email,
        status: body.status,
      } as unknown as CreateUserServiceResult['user'];

      const serviceResult = {
        user: createdUser,
        created: true,
      } satisfies CreateUserServiceResult;

      usersSvc.createUser.mockResolvedValue(serviceResult);

      await expect(
        controller.createUser(body, reply as unknown as FastifyReply),
      ).resolves.toBe(createdUser);

      expect(usersSvc.createUser).toHaveBeenCalledTimes(1);
      expect(usersSvc.createUser).toHaveBeenCalledWith(body);
      expect(reply.code).toHaveBeenCalledTimes(1);
      expect(reply.code).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('sets 200 and returns user when created=false (idempotent)', async () => {
      const body = {
        name: 'Jane',
        email: 'jane@example.com',
        status: 'ACTIVE',
      } satisfies CreateUserDto;

      const reply = makeReplyStub();

      const existingUser = {
        id: 'u1',
        name: body.name,
        email: body.email,
        status: body.status,
      } as unknown as CreateUserServiceResult['user'];

      const serviceResult = {
        user: existingUser,
        created: false,
      } satisfies CreateUserServiceResult;

      usersSvc.createUser.mockResolvedValue(serviceResult);

      await expect(
        controller.createUser(body, reply as unknown as FastifyReply),
      ).resolves.toBe(existingUser);

      expect(usersSvc.createUser).toHaveBeenCalledTimes(1);
      expect(usersSvc.createUser).toHaveBeenCalledWith(body);
      expect(reply.code).toHaveBeenCalledTimes(1);
      expect(reply.code).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });

  describe('updateUser', () => {
    it('calls service with id + body and returns updated user', async () => {
      const p = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      } satisfies IdParamDto;

      const body = {
        name: 'New Name',
        _atLeastOne: true,
      } as unknown as UpdateUserDto;

      const updatedUser = {
        id: p.id,
        name: body.name,
        email: 'jane@example.com',
        status: 'ACTIVE',
      } as unknown as UpdateUserServiceResult;

      usersSvc.updateUser.mockResolvedValue(updatedUser);

      await expect(controller.updateUser(p, body)).resolves.toBe(updatedUser);
      expect(usersSvc.updateUser).toHaveBeenCalledTimes(1);
      expect(usersSvc.updateUser).toHaveBeenCalledWith(p.id, body);
    });
  });

  describe('deleteUser', () => {
    it('calls service softDeleteUser and returns void', async () => {
      const p = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      } satisfies IdParamDto;

      usersSvc.softDeleteUser.mockResolvedValue(undefined);

      await expect(controller.deleteUser(p)).resolves.toBeUndefined();
      expect(usersSvc.softDeleteUser).toHaveBeenCalledTimes(1);
      expect(usersSvc.softDeleteUser).toHaveBeenCalledWith(p.id);
    });
  });
});
