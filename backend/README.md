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
