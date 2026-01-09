# STU Backend (stu-backend)

CRUD backend for practicing modern JS/TS backend patterns with NestJS, Prisma, Postgres, and Swagger.

- Framework: NestJS (Fastify)
- ORM: Prisma
- DB: Postgres (via Docker)
- Docs: Swagger OpenAPI at `/api`
- Core module: `users` (pagination, filtering, soft-delete exclusion)

## Backend structure

This README lives in `backend/`, so paths below are relative to `backend/` unless stated otherwise.

```
backend/
├── .actrc
├── .gitignore
├── .prettierrc
├── Dockerfile.backend
├── eslint.config.ts
├── examples
│   └── example.env
├── generated
├── nest-cli.json
├── package-lock.json
├── package.json
├── prisma
│   ├── migrations
│   │   ├── 20260108082712_init
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── prisma.module.ts
│   ├── prisma.service.ts
│   └── schema.prisma
├── prisma.config.ts
├── src
│   ├── app.controller.spec.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   ├── main.ts
│   ├── models
│   │   ├── user.model.ts
│   │   └── user.seed.json
│   └── users
│       ├── dto
│       │   ├── create-user.dto.ts
│       │   ├── dto.ts
│       │   ├── id-param.dto.ts
│       │   ├── list-users.dto.ts
│       │   ├── update-user.dto.ts
│       │   ├── user-filter.dto.ts
│       │   └── user-status.enum.ts
│       ├── users.controller.ts
│       ├── users.module.ts
│       └── users.service.ts
├── test
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── tsconfig.build.json
├── tsconfig.json
└── webpack-hmr.config.ts
```

> Notes:
>
> - `src/` holds all NestJS code (modules, controllers, services, DTOs).
> - `prisma/` holds Prisma schema + migrations.
> - DTOs use `class-validator` and `class-transformer` to enforce the API spec.

## Running

### Locallly

From `backend/`:

```bash
npm ci
npx prisma generate
npx migrate dev
npm run build
npm run start
```

Swagger docs:

- [http://localhost:3000/api](http://localhost:3000/api)

### Docker

From repo root:

```bash
docker compose up --build
```

Rebuild backend without cached layers:

```bash
docker compose build --no-cache backend
docker compose up --force-create
```

## Database and Prisma

Apply migrations inside Docker:

```bash
docker compose exec backend npx prisma migrate deploy
```

Create a new migration during dev (local):

```bash
cd backend
npx prisma migrate dev --name <migration-name>
```

Open Prisma Studio:

```bash
cd backend
npx prisma studio
```

## API Overview

## Environment variables

Backend reads config from `backend/.env`. For Docker Compose, the DB host should be the **service name** (usually `db`).

Example:

```env
POSTGRES_DB=stu
POSTGRES_USER=stu
POSTGRES_PASSWORD=stu_password
POSTGRES_PORT=5432
POSTGRES_HOST=db
```

If you use `DATABASE_URL`, set it directly (avoid `${VAR}` expansion inside `.env`):

```env
DATABASE_URL=postgresql://stu:stu_password@db:5432/stu?schema=public
```

> ## Notes
>
> - Keep modules focused (Users module owns `/users` routes + logic).
> - Keep validation at the edges (DTOs in controllers).
> - Keep DB logic in services (Prisma queries).
> - Prefer migrations over manual DB changes.
