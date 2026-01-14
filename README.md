# Backend (REST API)

NestJS REST API for the Users CRUD app, backed by Prisma + PostgreSQL. Includes pagination + filtering, validation, and Swagger docs.

## Stack

- NestJS (REST)
- Prisma ORM
- PostgreSQL
- Swagger/OpenAPI

## Requirements

- Node.js
- npm
- PostgreSQL (or Docker)

## Setup

```bash
cd backend
cp examples/example.env .env
npm ci
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

## Environment

Minimum required:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public
```

## API

### Swagger
-	GET `/api` (Swagger UI)

### List users (paginated + filtered)

GET /users?page=1&limit=10&filter[name]=jo&filter[status]=ACTIVE

Filters:
	•	filter[name] (partial match, case-insensitive)
	•	filter[status] (ACTIVE | INACTIVE | SUSPENDED)
	•	filter[fromDate] (ISO)
	•	filter[toDate] (ISO)

Get by id

GET /users/:id

Create

POST /users

{
  "name": "Jane",
  "email": "jane@example.com",
  "status": "ACTIVE",
  "role": "ADMIN"
}

Update

PATCH /users/:id

Soft delete

DELETE /users/:id

Scripts

Common ones (depends on your package.json):

npm run lint:check
npm run format:check
npm run test

---

# Frontend (React)

React + Vite UI for the Users CRUD app. Supports search, filters, pagination, editing, and soft-delete.

## Stack

- React
- Vite
- TypeScript

## Requirements

- Node.js
- npm

## Setup

```bash
cd frontend
cp examples/example.env .env
npm ci
npm run dev

Environment

# Base URL used by the frontend HTTP client (axios wrapper).
VITE_API_BASE_URL=/api

# Vite dev proxy target (vite.config.ts forwards /api/* here).
VITE_API_PROXY_TARGET=http://localhost:3000

Development

Run tests

npm test
# or
npx vitest

Build

npm run build

Notes
	•	In dev, the UI calls /api/* and Vite proxies it to the backend.
	•	Pagination is controlled by page + limit.
	•	Filters are passed as bracket-style query params (e.g. filter[name]=...).
