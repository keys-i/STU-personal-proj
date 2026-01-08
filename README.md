# STU-personal-proj

A CRUD app around using JS/TS frameworks and basic infra hosting

## Database and Prisma

### Apply migrations in Docker

```bash
docker compose exec backend npx prisma migrate deploy
```

### Create a new migration (dev)

```bash
cd backend
npx prisma migrate dev --name init
```

### Prisma Studio

```bash
cd backend
npx prisma studio
```

## API Overview

## Environment variables

Backend reads config from `backend/.env`. For Docker Compose, the DB host should be the service name (usually `db`):

Example:

```env
POSTGRES_DB=stu
POSTGRES_USER=stu
POSTGRES_PASSWORD=stu_password
POSTGRES_PORT=5432
POSTGRES_HOST=db
```

If you use `DATABASE_URL`, prefer setting it directly (avoid `${VAR}` expansion inside `.env`):

```env
DATABASE_URL=postgresql://stu:stu_password@db:5432/
```

> ## notes
>
> - Keep modules focused (Users module owns `/users` routes + logic).
> - Keep validation at the edges (DTOs in controllers).
> - Keep DB logic in services (Prisma queries).
> - Prefer migrations over manual DB changes.

```

```
