# EntConnect — Documentation

This directory holds the supporting documentation for **EntConnect**, a management platform built for the dance school **Ent'artes** as a university group project (Software Development Project course).

## About the project

EntConnect centralizes the day-to-day management of the dance school for three types of users:

- **Coordinator / Manager** — manages finances (billing), studios/rooms, coaching sessions, events, inventory, and users.
- **Professors (teachers)** — set their availability and check their own schedule/agenda.
- **Students** — check professors' availability, view their debts/payments, and see upcoming events.

The platform also includes a marketplace module and reporting/statistics dashboards for the coordinator.

## Repository structure

```
EntConnect/
├── Backend/    # NestJS REST API
├── Frontend/   # React Router (v7) web app
└── Docs/       # Project documentation (this folder)
```

## Tech stack

| Layer      | Technology                                                            |
| ---------- | ---------------------------------------------------------------------|
| Backend    | [NestJS](https://nestjs.com/) (TypeScript), [Prisma ORM](https://www.prisma.io/) |
| Database   | Microsoft SQL Server                                                 |
| Auth       | JWT (`@nestjs/jwt`, `passport-jwt`, `passport-local`), bcrypt         |
| API docs   | Swagger / OpenAPI (`@nestjs/swagger`)                                 |
| Frontend   | [React 19](https://react.dev/) + [React Router 7](https://reactrouter.com/) (SSR), Vite |
| Styling    | Tailwind CSS + Sass                                                   |
| Charts     | Recharts                                                              |
| File storage | Azure Blob Storage (`@azure/storage-blob`)                          |
| Monitoring | Azure Application Insights                                           |
| Testing    | Jest (Backend)                                                       |

## Backend modules

Located in `Backend/src`, organized as NestJS modules:

- `auth` — authentication (login, JWT issuing/validation)
- `utilizador` — users (coordinators, professors, students, guardians)
- `calendario` — calendar of classes/sessions
- `horarios` — schedules and professor availability
- `coaching` — coaching sessions and requests
- `eventos` — school events
- `faturacao` — billing, payments and debts
- `salas` — studios/rooms management
- `Infraestrutura` — physical infrastructure management
- `marketplace` — marketplace of items/articles (sale/rental)
- `estatistica` — statistics and reports for the coordinator
- `mail` — email notifications
- `prisma` — Prisma service/module (DB access layer)
- `common` / `utils` — shared interceptors, guards, helpers

The database schema (SQL Server) is defined with Prisma in `Backend/prisma/schema.prisma`, with migrations under `Backend/prisma/migrations`.

## Frontend structure

Located in `Frontend/app`:

- `routes` — route definitions
- `views` — page-level views: `dashboard`, `utilizadores`, `coaching`, `eventos`, `educandos`, `infraestrutura`, `inventario`, `marketplace`, `relatorios`, `perfil`, `login`, etc.
- `components` — reusable UI components (button, card, input, table, checkbox, toast, selectbox, textarea, theme-toggle, ...)
- `structure` — layout building blocks (header, navigation menu)
- `services` — API client calls to the Backend
- `models` — TypeScript interfaces/types shared across the app
- `config` / `utils` / `types` — configuration, helpers and shared types

## Getting started

### Prerequisites

- Node.js (LTS) and npm
- A Microsoft SQL Server instance (local or remote)

### Backend

```bash
cd Backend
npm install
```

Create a `.env` file in `Backend/` with at least:

```env
DATABASE_URL="sqlserver://<host>:<port>;database=<db>;user=<user>;password=<password>;encrypt=true;trustServerCertificate=true"
FRONTEND_URL="http://localhost:5173"
PORT=3000
# Optional:
# APPINSIGHTS_CONNECTION_STRING=
```

Apply Prisma migrations and generate the client, then start the API:

```bash
npx prisma migrate deploy   # or: npx prisma migrate dev
npx prisma generate
npm run start:dev
```

- API base URL: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/api-docs`

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

- App URL: `http://localhost:5173`

Refer to `Backend/README.md` and `Frontend/README.md` for framework-specific commands (build, tests, deployment).

## Documentation contents

This `Docs` folder should hold diagrams, requirements, manuals and other supporting artifacts, namely:

- **Database models** — see [`database-model.md`](./database-model.md) for the Entity-Relationship diagrams (complementing the Prisma schema in `Backend/prisma/schema.prisma`).
- **User manual** — see [`user-manual.md`](./user-manual.md) for a walkthrough of the screens available to each role (Coordinator, Professor, Guardian).
- **ADRs (Architecture Decision Records)** — records of the architecture decisions made by the team.

  Example: `Docs/ADR-001-Backend-Choice.md` containing: "We decided to use NestJS instead of FastAPI because the team is more comfortable with TypeScript, which also makes it easier to share models with the React frontend."

  **Why use this approach**: by keeping documentation in Git, it can be updated in the same commit as the related code changes, letting reviewers (and the professor) track the historical evolution of the team's decisions.
- **Generated backend docs** — running `npm run compodoc:build` in `Backend/` generates Compodoc documentation into `Docs/backend_compodoc` (ignored by git, regenerate locally when needed).

## Project context

EntConnect was developed as a group project for a university course, using the fictional dance school **Ent'artes** as the business case.
