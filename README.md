# Users CRUD App (Full Stack)

A full-stack Users CRUD application with a REST API backend and a React frontend. It supports creating, reading, updating, and soft-deleting users, plus server-side pagination and filtering. Includes input validation and Swagger/OpenAPI documentation for the API.

## Features

- Users CRUD (create, list, view, update, soft delete)
- Server-side pagination (`page`, `limit`)
- Server-side filtering via bracket-style query params (e.g. `filter[name]`)
- Form validation and consistent error responses
- Swagger/OpenAPI docs for exploring the REST API
- React UI with search, filters, pagination, and edit flows

## Repository Structure

| Path        | What it contains                                |
| ----------- | ----------------------------------------------- |
| `backend/`  | NestJS REST API + Prisma + PostgreSQL + Swagger |
| `frontend/` | React + Vite + TypeScript UI                    |

## Tech Stack

| Layer    | Tech                                  |
| -------- | ------------------------------------- |
| Backend  | NestJS (REST), Prisma ORM, PostgreSQL |
| API docs | Swagger / OpenAPI                     |
| Frontend | React, Vite, TypeScript               |

## Prerequisites

| Requirement | Notes                           |
| ----------- | ------------------------------- |
| Node.js     | LTS recommended                 |
| npm         | Comes with Node                 |
| PostgreSQL  | Local install or run via Docker |

## Quick Start

### 1) Backend (REST API)

```bash
cd backend
cp examples/example.env .env
npm ci
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Minimum required environment variable:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public
```

##### Swagger UI:

- GET `/api`

### 2. Frontend (React)

```bash
cd frontend
cp examples/example.env .env
npm ci
npm run dev
```

#### Frontend environment:

```env
# Base URL used by the frontend HTTP client (axios wrapper).
VITE_API_BASE_URL=/api

# Vite dev proxy target (vite.config.ts forwards /api/\* here).
VITE_API_PROXY_TARGET=http://localhost:3000
```

## REST API Overview

### List users (paginated + filtered)

Example:

```REST
GET /users?page=1&limit=10&filter[name]=jo&filter[status]=ACTIVE
```

#### Supported filters:

| Query            | param      | Type                            | Meaning  |
| ---------------- | ---------- | ------------------------------- | -------- | --------- |
| filter[name]     | string     | Partial match, case-insensitive |
| filter[status]   | enum       | ACTIVE                          | INACTIVE | SUSPENDED |
| filter[fromDate] | ISO string | Start date                      |
| filter[toDate]   | ISO string | End date                        |

### Get by id

```
GET /users/:id
```

### Create

```
POST /users
```

```json
{
  "name": "Jane",
  "email": "jane@example.com",
  "status": "ACTIVE",
  "role": "ADMIN"
}
```

### Update

```
PATCH /users/:id
```

### Soft delete

```
DELETE /users/:id
```

## Scripts

### Backend

```bash
cd backend
npm run lint:check
npm run format:check
npm run test
```

### Frontend

```bash
cd frontend
npm test
# or
npx vitest
npm run build
```

> Notes
> In development, the UI calls /api/\* and Vite proxies requests to the backend.
> Pagination is controlled via page + limit.
> Filtering uses bracket-style query params like filter[name]=....
