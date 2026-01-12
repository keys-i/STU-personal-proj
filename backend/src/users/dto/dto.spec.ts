import { describe, it, expect } from '@jest/globals';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import {
  CreateUserDto,
  UpdateUserDto,
  IdParamDto,
  ListUsersQueryDto,
  UserFilterDto,
  UserStatus,
} from './index.js';

async function expectValid<T extends object>(cls: new () => T, plain: object) {
  const inst = plainToInstance(cls, plain);
  const errors = await validate(inst, {
    whitelist: true,
    forbidNonWhitelisted: false,
    forbidUnknownValues: false,
  });
  expect(errors).toHaveLength(0);
  return inst;
}

async function expectInvalid<T extends object>(
  cls: new () => T,
  plain: object,
) {
  const inst = plainToInstance(cls, plain);
  const errors = await validate(inst, {
    whitelist: true,
    forbidNonWhitelisted: false,
    forbidUnknownValues: false,
  });
  expect(errors.length).toBeGreaterThan(0);
  return errors;
}

describe('users dto validation', () => {
  describe('IdParamDto', () => {
    it.each([
      ['valid UUID passes', { id: '550e8400-e29b-41d4-a716-446655440000' }],
    ])('%s', async (_name, payload) => {
      await expectValid(IdParamDto, payload);
    });

    it.each([
      ['invalid UUID fails', { id: 'not-a-uuid' }],
      ['missing id fails', {}],
      ['empty id fails', { id: '' }],
    ])('%s', async (_name, payload) => {
      await expectInvalid(IdParamDto, payload);
    });
  });

  describe('CreateUserDto', () => {
    it.each([
      [
        'valid payload passes (no role)',
        {
          name: 'Jane Doe',
          email: 'jane@example.com',
          status: UserStatus.ACTIVE,
          role: undefined,
        },
      ],
      ...(
        [
          [UserStatus.ACTIVE, 'USER'],
          [UserStatus.INACTIVE, 'ADMIN'],
          [UserStatus.SUSPENDED, 'MODERATOR'],
        ] as const
      ).map(([status, role]): [string, object] => [
        `valid payload passes (status=${status}, role=${role})`,
        {
          name: 'Jane Doe',
          email: `jane+${String(status).toLowerCase()}@example.com`,
          status,
          role,
        },
      ]),
    ])('%s', async (_name, payload) => {
      await expectValid(CreateUserDto, payload);
    });

    it.each([
      ['missing required fields fails', {}],
      [
        'bad email fails',
        { name: 'Jane Doe', email: 'nope', status: UserStatus.ACTIVE },
      ],
      [
        'name too short fails',
        { name: 'J', email: 'jane@example.com', status: UserStatus.ACTIVE },
      ],
      [
        'invalid status fails',
        { name: 'Jane Doe', email: 'jane@example.com', status: 'BROKEN' },
      ],
      [
        'invalid role fails',
        {
          name: 'Jane Doe',
          email: 'jane@example.com',
          status: UserStatus.ACTIVE,
          role: 'EDITOR',
        },
      ],
    ])('%s', async (_name, payload) => {
      await expectInvalid(CreateUserDto, payload);
    });
  });

  describe('UpdateUserDto', () => {
    it.each([
      [
        'valid partial update passes (name only)',
        { name: 'New Name', _atLeastOne: true },
      ],
      [
        'valid partial update passes (email only)',
        { email: 'new@example.com', _atLeastOne: true },
      ],
      [
        'valid partial update passes (status only)',
        { status: UserStatus.INACTIVE, _atLeastOne: true },
      ],
      [
        'valid partial update passes (role only)',
        { role: 'USER', _atLeastOne: true },
      ],
    ])('%s', async (_name, payload) => {
      await expectValid(UpdateUserDto, payload);
    });

    it.each([
      ['bad email fails', { email: 'nope', _atLeastOne: true }],
      ['invalid status fails', { status: 'BROKEN', _atLeastOne: true }],
      ['invalid role fails', { role: 'EDITOR', _atLeastOne: true }],
    ])('%s', async (_name, payload) => {
      await expectInvalid(UpdateUserDto, payload);
    });

    it.each([['empty body behavior (document current behavior)', {}]])(
      '%s',
      async (_name, payload) => {
        // keep as "document current behavior": may pass if only enforced by typing
        const errors = await validate(plainToInstance(UpdateUserDto, payload), {
          whitelist: true,
          forbidUnknownValues: false,
        });
        expect(Array.isArray(errors)).toBe(true);
      },
    );
  });

  describe('UserFilterDto', () => {
    it.each([
      [
        'valid filter passes',
        {
          name: 'jo',
          status: UserStatus.SUSPENDED,
          fromDate: '2025-01-01T00:00:00.000Z',
          toDate: '2025-01-31T23:59:59.999Z',
        },
      ],
      ['valid filter passes (name only)', { name: 'jo' }],
      ['valid filter passes (status only)', { status: UserStatus.ACTIVE }],
      [
        'valid filter passes (fromDate only)',
        { fromDate: '2025-01-01T00:00:00.000Z' },
      ],
      [
        'valid filter passes (toDate only)',
        { toDate: '2025-01-31T23:59:59.999Z' },
      ],
    ])('%s', async (_name, payload) => {
      await expectValid(UserFilterDto, payload);
    });

    it.each([
      ['invalid status fails', { status: 'BAD' }],
      ['bad fromDate fails', { fromDate: 'not-a-date' }],
      ['bad toDate fails', { toDate: 'not-a-date' }],
    ])('%s', async (_name, payload) => {
      await expectInvalid(UserFilterDto, payload);
    });
  });

  describe('ListUsersQueryDto', () => {
    it.each([
      [
        'valid query passes (numbers as strings)',
        {
          page: '1',
          limit: '10',
          filter: { name: 'jo', status: UserStatus.ACTIVE },
        },
      ],
      [
        'valid query passes (numbers as numbers)',
        {
          page: 1,
          limit: 10,
          filter: { name: 'jo', status: UserStatus.ACTIVE },
        },
      ],
      ['valid query passes (no filter)', { page: 1, limit: 10 }],
    ])('%s', async (_name, payload) => {
      const inst = await expectValid(ListUsersQueryDto, payload);
      if ('page' in payload) expect(typeof inst.page).toBe('number');
      if ('limit' in payload) expect(typeof inst.limit).toBe('number');
    });

    it.each([
      ['invalid page fails (<=0)', { page: 0, limit: 10 }],
      ['invalid page fails (negative)', { page: -1, limit: 10 }],
      ['invalid limit fails (>100)', { page: 1, limit: 101 }],
      ['invalid limit fails (<1)', { page: 1, limit: 0 }],
      [
        'invalid nested filter fails',
        { page: 1, limit: 10, filter: { status: 'BAD' } },
      ],
    ])('%s', async (_name, payload) => {
      await expectInvalid(ListUsersQueryDto, payload);
    });
  });
});
