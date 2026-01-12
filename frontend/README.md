# STU Frontend (stu-frontend)

React + Vite frontend for managing Users with a clean CRUD UI: search, advanced filters, pagination, create, edit, and soft-delete.
| Framework | React + Vite + TypeScript |
| Styling | CSS (`App.css`, `features/users/users.css`) |
| Data | Axios client with typed API wrappers |
| Testing | Vitest + React Testing Library + `jest-dom` |
| Core view | `UsersView` (search debounce, advanced filters, create morph, edit modal, confetti) |

## Frontend structure

This README lives in `frontend/`, so paths below are relative to `frontend/` unless stated otherwise.

```bash
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.ts
├── .prettierrc
├── index.html
└── src
├── App.css
├── main.tsx
├── views
│ ├── UsersView.tsx
│ └── UsersView.test.tsx
├── features
│ └── users
│ ├── users.css
│ ├── api.ts
│ ├── api.test.ts
│ ├── types.ts
│ ├── hooks
│ │ ├── useUsers.tsx
│ │ └── useUsers.test.tsx
│ └── components
│ ├── UsersTable.tsx
│ ├── UsersTable.test.tsx
│ ├── UsersFilters.tsx
│ ├── UsersFilters.test.tsx
│ ├── CreateUserForm.tsx
│ ├── CreateUserForm.test.tsx
│ ├── EditUserModal.tsx
│ ├── EditUserModal.test.tsx
│ ├── CreateUserMorph.tsx
│ ├── CreateUserMorph.test.tsx
│ └── EmptyUsersState.tsx
└── shared
├── components
│ ├── Icons.tsx
│ ├── ThemeToggle.tsx
│ ├── ConfettiBurst.tsx
│ └── ...
├── hooks
│ ├── useTheme.tsx
│ └── useTheme.test.tsx
└── utils
├── date.ts
└── date.test.ts
```

> Notes:
>
> - features/users/ is feature-first: API, types, hooks, and UI components live together.
> - shared/ contains reusable UI and utilities (icons, theme, date formatting).
> - Tests are colocated next to the code they cover.

## Running

### Locally

From `frontend/`:

```sh
npm ci
npm run dev
```

Vite will print the local URL (usually `http://localhost:5173`).

### With Docker Compose

If your repo has a root Docker Compose setup, run from repo root:

```bash
docker compose up --build
```

### Environment variables

Frontend uses `VITE_API_BASE_URL` to target the backend.

| Variable          | Default | Example                   | Notes                                                                       |
| ----------------- | ------- | ------------------------- | --------------------------------------------------------------------------- |
| VITE_API_BASE_URL | /api    | http://localhost:3000/api | Use /api for proxy-style dev; set full URL when backend is hosted elsewhere |

If you are using a Vite dev proxy (common), keep the default `/api` and configure proxy rules in `vite.config.ts`.

## UI overview

| Area                   | Behavior                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Search (top bar)       | Controlled draft input, debounced into `filterState.name` (no `useEffect` for debounce)                              |
| Enter in search        | Commits immediately and cancels the pending debounce                                                                 |
| Advanced filters panel | Status, date range, limit                                                                                            |
| Apply button           | Triggers `refresh()`                                                                                                 |
| Table                  | Limit input (clamped `1–100`) with a draft while editing                                                             |
| Row actions            | Edit and soft-delete                                                                                                 |
| Create flow            | “New” uses `CreateUserMorph` (morph animation from button anchor), submits via `CreateUserForm`, confetti on success |
| Edit flow              | Lazy-loaded modal (`EditUserModal`) via `React.lazy` + `Suspense`                                                    |

## Scripts

```sh
npm run dev          # start Vite dev server
npm run build        # typecheck build + bundle
npm run preview      # preview production build
npm run test         # vitest (watch mode)
npm run test:run     # vitest run (CI style)
npm run test:ui      # vitest UI
npm run lint         # eslint
npm run lint:check   # eslint with max warnings = 0
npm run typecheck    # tsc -b --noEmit
npm run format       # prettier write
npm run format:check # prettier check
```

## Testing notes

- Test runner: Vitest
- DOM: jsdom (via RTL)
- Common setup:
  - @testing-library/jest-dom/vitest
  - deterministic requestAnimationFrame / cancelAnimationFrame polyfill for components using rAF
  - cleanup() after each test

If a test uses timers (debounce, rAF, animations):

- use vi.useFakeTimers()
- wrap vi.advanceTimersByTime(...) in act(...)
- optionally flush pending microtasks after awaited async handlers

## Conventions

- Keep API concerns in features/users/api.ts (query params, error mapping, typed responses)
  - Keep view logic in views/UsersView.tsx and pass handlers down
  - Keep components “dumb” where possible (state lifted into view or hooks)
  - Prefer feature-first layout over a global components dump
