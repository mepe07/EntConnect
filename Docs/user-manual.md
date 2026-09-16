# EntConnect — User Manual

This is a text-based walkthrough of the screens available to each role, based on the actual navigation menu (`Frontend/app/structure/navigation-menu/navigation-menu.tsx`) and route definitions (`Frontend/app/routes.ts`). It does not include screenshots, since capturing them requires a running instance connected to a populated database.

## Roles

EntConnect has three login roles (`Backend/src/auth/enums/roles.enum.ts`):

| Role (code)      | Display name              | Who it is                                                                 |
| ----------------- | -------------------------- | -------------------------------------------------------------------------- |
| `Coordenador`      | Coordinator                | Manages the school as a whole: finances, studios, professors, events.     |
| `Professor`        | Professor                  | A teacher: manages their own availability, classes and coaching agenda.   |
| `Enc_Educacao`     | Guardian ("Encarregado de Educação") | Manages their dependant(s)/student(s) (`Aluno`, shown in the app as "Educandos"). This is the role that corresponds to the "Student" persona in the project brief — students themselves don't have their own login; their guardian does. |

A user can hold more than one role; the navigation menu includes a role switcher when more than one role is assigned to the logged-in account.

## Login and public pages

- **`/login`** — sign in with username/password. A "forgot password" flow exists (`Backend/src/auth` exposes forgot/reset-password endpoints).
- **`/`** — landing page / dashboard (content adapts to the logged-in role; also reachable as the public homepage before login).
- **`/eventos`** — public list of school events, visible without logging in.
- **`/eventos/:slug`** — public detail page for a single event.

---

## Coordinator (Coordenador)

The coordinator has the most complete menu, covering finances, studios, coaching sessions and events for the whole school.

- **Dashboard** (`/`) — overview/statistics landing page.
- **Gestão de Eventos** (`/admin/eventos`) — create, edit and publish school events.
- **Gestão Utilizadores** (`/admin/utilizadores`) — manage user accounts and roles.
- **Infraestrutura**
  - **Gestão de Estúdios** (`/admin/salas`) — manage studios/rooms (availability, assigned modality).
  - **Gestão de Modalidades** (`/admin/modalidades`) — manage dance modalities/disciplines.
- **Aulas & Coaching**
  - **Gerir Horário Aulas** (`/admin/horarios`) — manage the weekly recurring class schedule.
  - **Gerir Coaching** (`/admin/coaching`) — manage/schedule coaching sessions.
  - **Gerir pagamentos** (`/admin/pagamentos-coaching`) — manage coaching payments/outstanding balances.
  - **Calendário Geral** (`/admin/calendario`) — overall calendar of classes and sessions.
- **Professores**
  - **Gerir Professores** (`/admin/professores`) — manage professor records and their qualified modalities.
  - **Disponibilidades** (`/admin/professores-disponibilidade`) — approve/review professor availability submissions.
- **Marketplace & Inventário**
  - **Gerir Inventário** (`/marketplace/inventario`) — manage stock (items, colors, sizes, quantities).
  - **Marketplace** (`/marketplace/anuncios`) — browse/manage marketplace listings.
  - **Registo de Moderação** (`/marketplace/atividades`) — audit log of moderation actions on listings.
- **Relatórios**
  - **Faturação** (`/relatorios/faturacao`) — billing report.
  - **Coaching** (`/relatorios/coaching`) — coaching sessions report.
  - **Histórico Coaching** (`/relatorios/historico-coaching`) — historical coaching report.
  - **Estatísticas** (`/relatorios/estatisticas`) — general statistics/dashboards.
- **A Minha Conta** (`/conta`) — manage own profile/password.

## Professor

The professor's menu is scoped to their own agenda and finances.

- **Dashboard** (`/`) — overview landing page.
- **Agenda**
  - **Disponibilidades** (`/agenda/disponibilidades`) — set/edit their own availability slots.
  - **Agendamentos** (`/agenda/agendamentos`) — view scheduled classes/coaching sessions.
  - **Confirmações** (`/agenda/confirmacoes`) — confirm/reject coaching requests booked against their availability.
- **Relatórios**
  - **Faturação** (`/relatorios/faturacao`) — their billing report.
  - **Coaching** (`/relatorios/coaching`) — their coaching sessions report.
- **Marketplace**
  - **Marketplace** (`/marketplace/anuncios`) — browse/manage marketplace listings (no inventory-management access, unlike the coordinator).
- **A Minha Conta** (`/conta`) — manage own profile/password.

## Guardian / Encarregado de Educação ("Student" role)

The guardian manages their dependant(s) and coaching arrangements on their behalf.

- **Dashboard** (`/`) — overview landing page.
- **Educandos** (`/educandos`) — manage their dependant(s)/student(s) (the `Aluno` records linked to this guardian).
- **Coaching**
  - **Ver Disponibilidades** (`/coaching/oferta`) — browse professors' available coaching slots.
  - **Marcações** (`/coaching/marcacoes`) — book/request a coaching session for their dependant(s).
  - **Confirmações** (`/coaching/confirmacoes`) — confirm coaching sessions booked for their dependant(s).
- **Relatórios**
  - **Faturação** (`/relatorios/faturacao`) — billing/debts report for their dependant(s).
- **Marketplace**
  - **Marketplace** (`/marketplace/anuncios`) — browse/manage marketplace listings (no inventory-management access).
- **A Minha Conta** (`/conta`) — manage own profile/password.
