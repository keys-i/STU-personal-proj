import { Test, type TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import qs from 'qs';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

type UserShape = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type Paginated<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const iso = (d: Date) => d.toISOString();

function uniqEmail(prefix = 'e2e') {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

async function createUser(
  app: NestFastifyApplication,
  body: { name: string; email: string; status: UserStatus; role?: string },
): Promise<UserShape> {
  const res = await request(app.getHttpServer())
    .post('/users')
    .send(body)
    .expect((r) => {
      if (![200, 201].includes(r.status)) {
        throw new Error(
          `Expected 200/201, got ${r.status}: ${JSON.stringify(r.body)}`,
        );
      }
    });

  // supertest body is `any`, so cast ONCE here (no extra helpers)
  return res.body as UserShape;
}

describe('UsersController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        // enables filter[fromDate] -> { filter: { fromDate: ... } }
        querystringParser: (str) => qs.parse(str),
      }),
    );

    // ensure DTO validation runs in e2e (requires DTOs to be CLASSES, not `type`)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users (Paginated<User>)', () => {
    it('returns { data, meta } with expected meta fields', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');

      const body = res.body as Paginated<UserShape>;
      expect(Array.isArray(body.data)).toBe(true);

      // no expect.any(...)
      expect(typeof body.meta).toBe('object');

      expect(Number.isInteger(body.meta.page)).toBe(true);
      expect(body.meta.page).toBeGreaterThanOrEqual(1);

      expect(Number.isInteger(body.meta.limit)).toBe(true);
      expect(body.meta.limit).toBeGreaterThanOrEqual(1);
      expect(body.meta.limit).toBeLessThanOrEqual(100);

      expect(Number.isInteger(body.meta.total)).toBe(true);
      expect(body.meta.total).toBeGreaterThanOrEqual(0);

      expect(Number.isInteger(body.meta.totalPages)).toBe(true);
      expect(body.meta.totalPages).toBeGreaterThanOrEqual(1);

      expect(typeof body.meta.hasNext).toBe('boolean');
      expect(typeof body.meta.hasPrev).toBe('boolean');

      // basic sanity on returned rows
      for (const u of body.data) {
        expect(u.id).toMatch(UUID_RE);
        expect(typeof u.name).toBe('string');
        expect(typeof u.email).toBe('string');
        expect(['ACTIVE', 'INACTIVE', 'SUSPENDED']).toContain(u.status);
      }
    });

    it('clamps/normalizes page+limit at service layer (accept 200 or 400 depending on DTO)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .query({ page: -999, limit: 9999 })
        .expect((r) => {
          if (![200, 400].includes(r.status)) {
            throw new Error(`Expected 200/400, got ${r.status}`);
          }
        });

      if (res.status === 200) {
        const body = res.body as Paginated<UserShape>;
        expect(body.meta.page).toBeGreaterThanOrEqual(1);
        expect(body.meta.limit).toBeGreaterThanOrEqual(1);
        expect(body.meta.limit).toBeLessThanOrEqual(100);
      }
    });

    it('rejects bad ISO date filters (400) and fromDate > toDate (400)', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .query({ 'filter[fromDate]': 'not-a-date' })
        .expect(400);

      await request(app.getHttpServer())
        .get('/users')
        .query({ 'filter[toDate]': 'also-not-a-date' })
        .expect(400);

      await request(app.getHttpServer())
        .get('/users')
        .query({
          'filter[fromDate]': '2025-02-01T00:00:00.000Z',
          'filter[toDate]': '2025-01-01T00:00:00.000Z',
        })
        .expect(400);
    });

    it('filters by name/status and createdAt range', async () => {
      const email1 = uniqEmail('filter1');
      const email2 = uniqEmail('filter2');

      const u1 = await createUser(app, {
        name: 'Jo Filter',
        email: email1,
        status: 'ACTIVE',
      });

      await new Promise((r) => setTimeout(r, 15));

      const u2 = await createUser(app, {
        name: 'Alex Other',
        email: email2,
        status: 'INACTIVE',
      });

      const from = new Date(new Date(u1.createdAt).getTime() - 1000);
      const to = new Date(new Date(u2.createdAt).getTime() + 1000);

      const res = await request(app.getHttpServer())
        .get('/users')
        .query({
          page: 1,
          limit: 50,
          'filter[name]': 'jo',
          'filter[status]': 'ACTIVE',
          'filter[fromDate]': iso(from),
          'filter[toDate]': iso(to),
        })
        .expect(200);

      const body = res.body as Paginated<UserShape>;
      expect(Array.isArray(body.data)).toBe(true);

      const emails = body.data.map((u) => u.email);
      expect(emails).toContain(email1);
      expect(emails).not.toContain(email2);

      for (const u of body.data) {
        expect(u.deletedAt).toBeNull();
        expect(u.status).toBe('ACTIVE');
        expect(u.name.toLowerCase()).toContain('jo');

        const createdAt = new Date(u.createdAt).getTime();
        expect(createdAt).toBeGreaterThanOrEqual(from.getTime());
        expect(createdAt).toBeLessThanOrEqual(to.getTime());
      }
    });
  });

  describe('POST /users (idempotent by email + soft-deleted conflict)', () => {
    it('creates first time (201) then returns existing (200) for same email', async () => {
      const email = uniqEmail('idempotent');
      const payload = {
        name: 'John Idempotent',
        email,
        status: 'ACTIVE' as const,
        role: 'USER',
      };

      const createdRes = await request(app.getHttpServer())
        .post('/users')
        .send(payload)
        .expect(201);

      const user1 = createdRes.body as UserShape;
      expect(user1.id).toMatch(UUID_RE);
      expect(user1).toEqual(
        expect.objectContaining({
          name: payload.name,
          email: payload.email,
          status: payload.status,
          role: payload.role,
          deletedAt: null,
        }),
      );

      const existingRes = await request(app.getHttpServer())
        .post('/users')
        .send(payload)
        .expect(200);

      const user2 = existingRes.body as UserShape;
      expect(user2.id).toBe(user1.id);
      expect(user2.email).toBe(payload.email);
    });

    it('returns 409 if email exists but user is soft-deleted', async () => {
      const email = uniqEmail('softdel-conflict');

      const created = await createUser(app, {
        name: 'Soft Delete Me',
        email,
        status: 'ACTIVE',
      });

      const id = created.id;

      await request(app.getHttpServer()).delete(`/users/${id}`).expect(204);

      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Recreate Attempt',
          email,
          status: 'ACTIVE',
        })
        .expect(409);
    });

    it('rejects invalid body (400)', async () => {
      await request(app.getHttpServer()).post('/users').send({}).expect(400);

      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'a',
          email: 'not-an-email',
          status: 'ACTIVE',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Valid Name',
          email: uniqEmail('bad-status'),
          status: 'BROKEN',
        })
        .expect(400);
    });
  });

  describe('GET /users/:id (not found excludes soft-deleted)', () => {
    it('rejects non-uuid (400)', async () => {
      await request(app.getHttpServer()).get('/users/not-a-uuid').expect(400);
    });

    it('404 for missing id', async () => {
      await request(app.getHttpServer())
        .get('/users/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);
    });

    it('200 for existing, then 404 after soft delete', async () => {
      const email = uniqEmail('get-soft');

      const created = await createUser(app, {
        name: 'Get Then Delete',
        email,
        status: 'ACTIVE',
      });

      const id = created.id;

      const gotRes = await request(app.getHttpServer())
        .get(`/users/${id}`)
        .expect(200);

      const got = gotRes.body as UserShape;
      expect(got.email).toBe(email);

      await request(app.getHttpServer()).delete(`/users/${id}`).expect(204);

      await request(app.getHttpServer()).get(`/users/${id}`).expect(404);
    });
  });

  describe('PATCH /users/:id (update + conflict + not found)', () => {
    it('updates user fields (200)', async () => {
      const email = uniqEmail('patch');

      const created = await createUser(app, {
        name: 'Patch Me',
        email,
        status: 'ACTIVE',
      });

      const id = created.id;

      const updatedRes = await request(app.getHttpServer())
        .patch(`/users/${id}`)
        .send({ name: 'Patched Name', status: 'INACTIVE' })
        .expect(200);

      const u = updatedRes.body as UserShape;

      expect(u).toEqual(
        expect.objectContaining({
          id,
          email,
          name: 'Patched Name',
          status: 'INACTIVE',
          deletedAt: null,
        }),
      );
    });

    it('rejects non-uuid (400)', async () => {
      await request(app.getHttpServer())
        .patch('/users/not-a-uuid')
        .send({ name: 'X' })
        .expect(400);
    });

    it('404 when user is missing (service findFirst deletedAt=null)', async () => {
      await request(app.getHttpServer())
        .patch('/users/550e8400-e29b-41d4-a716-446655440000')
        .send({ name: 'Nope' })
        .expect(404);
    });

    it('409 when updating email to an existing active user email (P2002)', async () => {
      const email1 = uniqEmail('conflict-a');
      const email2 = uniqEmail('conflict-b');

      const u1 = await createUser(app, {
        name: 'AA',
        email: email1,
        status: 'ACTIVE',
      });

      const u2 = await createUser(app, {
        name: 'BB',
        email: email2,
        status: 'ACTIVE',
      });

      await request(app.getHttpServer())
        .patch(`/users/${u2.id}`)
        .send({ email: u1.email })
        .expect(409);
    });

    it('404 if updating a soft-deleted user (service checks deletedAt=null)', async () => {
      const email = uniqEmail('patch-softdel');

      const created = await createUser(app, {
        name: 'To Be Deleted',
        email,
        status: 'ACTIVE',
      });

      const id = created.id;

      await request(app.getHttpServer()).delete(`/users/${id}`).expect(204);

      await request(app.getHttpServer())
        .patch(`/users/${id}`)
        .send({ name: 'Should 404' })
        .expect(404);
    });
  });

  describe('DELETE /users/:id (soft delete semantics)', () => {
    it('204 when deleting existing, then 204 again (already soft-deleted)', async () => {
      const email = uniqEmail('del-twice');

      const created = await createUser(app, {
        name: 'Delete Twice',
        email,
        status: 'ACTIVE',
      });

      const id = created.id;

      await request(app.getHttpServer()).delete(`/users/${id}`).expect(204);
      await request(app.getHttpServer()).delete(`/users/${id}`).expect(204);
    });

    it('404 when id does not exist at all', async () => {
      await request(app.getHttpServer())
        .delete('/users/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);
    });

    it('rejects non-uuid (400)', async () => {
      await request(app.getHttpServer())
        .delete('/users/not-a-uuid')
        .expect(400);
    });

    it('soft-deleted users are excluded from listUsers where deletedAt=null', async () => {
      const email = uniqEmail('list-exclude');

      const created = await createUser(app, {
        name: 'Exclude Me',
        email,
        status: 'ACTIVE',
      });

      const id = created.id;

      await request(app.getHttpServer()).delete(`/users/${id}`).expect(204);

      const res = await request(app.getHttpServer()).get('/users').expect(200);
      const body = res.body as Paginated<UserShape>;

      const foundById = body.data.some((u) => u.id === id);
      const foundByEmail = body.data.some((u) => u.email === email);

      expect(foundById).toBe(false);
      expect(foundByEmail).toBe(false);
    });
  });
});
