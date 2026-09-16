# EntConnect — Data Model

This document describes the database schema defined in [`Backend/prisma/schema.prisma`](../Backend/prisma/schema.prisma) (Prisma ORM, Microsoft SQL Server). It contains **34 business entities**; the schema also has a `sysdiagrams` model, which is a SQL-Server-internal table used by SSMS diagram tooling and is **not** part of the application's domain model, so it is excluded below.

Diagrams use [Mermaid](https://mermaid.js.org/syntax/entityRelationshipDiagram.html) `erDiagram` syntax, which renders natively on GitHub, Azure DevOps and in VS Code's Markdown preview, and stays diffable in Git.

**Cardinality legend**

| Symbol      | Meaning                  |
| ----------- | ------------------------- |
| `\|\|--\|\|` | exactly one — exactly one |
| `\|\|--o\|` | exactly one — zero or one |
| `\|\|--o{` | exactly one — zero or more |
| `}o--o{`   | many — many (via a junction/join table) |

Entities shown without an attribute box in a diagram (e.g. `Professor` inside the Scheduling diagram) are defined in full in another diagram and repeated here only to show the relationship — see the "Cross-references" note under each diagram.

Because the 34 entities don't fit legibly in a single diagram, they are grouped to match the Backend module boundaries (see main `Docs/README.md`).

---

## 1. People & Access

Core identity model: a `Pessoa` (person) can hold one or more roles (`Coordenador`, `Professor`, `Enc_Educacao`) and/or a login (`Utilizador`). `Aluno` (student) is a dependant managed by a guardian (`Enc_Educacao`) and has no login of its own.

```mermaid
erDiagram
    Pessoa {
        int ID_Pessoa PK
        string Nome
        string Email
        string NIF
        date Data_Nascimento
        string Contacto
    }
    Utilizador {
        int ID_Utilizador PK
        int ID_Pessoa FK
        string Utilizador
        string Password
        boolean Ativo
    }
    Coordenador {
        int ID_Pessoa PK, FK
    }
    Professor {
        int ID_Pessoa PK, FK
    }
    Enc_Educacao {
        int ID_Pessoa PK, FK
    }
    Direcao {
        int ID_Pessoa PK, FK
    }
    Aluno {
        int ID_aluno PK
        int ID_Enc_Educacao FK
        string Nome
        string NIF
        boolean Menor_Idade
    }

    Pessoa ||--|| Utilizador : "has login account"
    Pessoa ||--o| Coordenador : "is"
    Pessoa ||--o| Professor : "is"
    Pessoa ||--o| Enc_Educacao : "is"
    Pessoa ||--o| Direcao : "is"
    Enc_Educacao ||--o{ Aluno : "guardian of"
```

- **Pessoa** — base person record (name, NIF, contact details) shared by every role.
- **Utilizador** — login account (username/password) linked 1:1 to a `Pessoa`.
- **Coordenador** — the school's management/coordination role (login role `Coordenador`).
- **Professor** — a teacher (login role `Professor`).
- **Enc_Educacao** — a legal guardian ("Encarregado de Educação"); this is the login role the original brief calls "Student", since students themselves (`Aluno`) don't log in — their guardian manages their account.
- **Direcao** — school board/direction role (present in the data model; not currently exposed as its own login role in `Backend/src/auth/enums/roles.enum.ts`).
- **Aluno** — a student/dependant, always linked to one guardian.

**Cross-references:** `Aluno` also relates to `Aula_Aluno`, `Coaching_Aluno` and `Pedido_Coaching_Aluno` (see §2/§3). `Enc_Educacao` also relates to `Coaching_Aluno` (§3). `Utilizador` also relates to entities in §3, §4 and §5. `Professor` also relates to entities in §2 and §3.

---

## 2. Scheduling & Classes

Recurring classes (`Aula_Fixa`) are taught in a studio (`Sala`), follow a modality (`Modalidade`), recur on a weekday (`Dias_Semana`), and can have one-off cancellations (`Excecao_Aula_Fixa`). `Aula_Aluno` records a student's attendance.

```mermaid
erDiagram
    Sala {
        int ID_Sala PK
        string Nome
        boolean Disponivel
        int ID_Modalidade FK
    }
    Modalidade {
        int ID_Modalidade PK
        string Descricao
    }
    Professor_Modalidade {
        int ID_Professor PK, FK
        int ID_Modalidade PK, FK
    }
    Dias_Semana {
        int ID_Dia PK
        string Nome_Dia
    }
    Aula_Fixa {
        int ID_AulaFixa PK
        int Dia_Semana FK
        int ID_Estudio FK
        int ID_Modalidade FK
        int ID_Professor FK
        boolean Ativa
    }
    Aula_Aluno {
        int ID_Aula PK
        int ID_Aluno PK, FK
        boolean Presente
    }
    Excecao_Aula_Fixa {
        int ID_Excecao PK
        int ID_AulaFixa FK
        date Data_Cancelada
    }
    Professor
    Aluno

    Modalidade ||--o{ Sala : "taught in"
    Professor ||--o{ Professor_Modalidade : "qualified to teach"
    Modalidade ||--o{ Professor_Modalidade : "taught by"
    Dias_Semana ||--o{ Aula_Fixa : "recurs on"
    Sala ||--o{ Aula_Fixa : "held in"
    Modalidade ||--o{ Aula_Fixa : "class type"
    Professor ||--o{ Aula_Fixa : "taught by"
    Aluno ||--o{ Aula_Aluno : "attendance record"
    Aula_Fixa ||--o{ Excecao_Aula_Fixa : "cancelled occurrence"
```

- **Sala** — a physical studio/room; optionally restricted to one `Modalidade`.
- **Modalidade** — a dance style/discipline (e.g. ballet, hip-hop).
- **Professor_Modalidade** — join table: which modalities a professor is qualified to teach.
- **Dias_Semana** — lookup table of weekdays.
- **Aula_Fixa** — a fixed/recurring weekly class slot.
- **Aula_Aluno** — attendance record of a student in a class occurrence. Note: `ID_Aula` is a plain column with **no Prisma-level relation** back to `Aula_Fixa` (only `ID_Aluno` is a modeled foreign key) — the link to the specific class exists at the database level but isn't declared as a Prisma relation in the current schema.
- **Excecao_Aula_Fixa** — a cancelled date for an otherwise-recurring class.

**Cross-references:** `Professor` and `Aluno` are defined in §1.

---

## 3. Coaching

Coaching is a paid, ad-hoc session between a professor and one or more students, either scheduled directly by a coordinator from a professor's `Disponibilidade` (availability slot), or first requested (`Pedido_Coaching`) by a guardian and then confirmed.

```mermaid
erDiagram
    Coaching {
        int ID_Coaching PK
        int ID_Professor FK
        int ID_Coordenador FK
        int ID_Sala FK
        int ID_Modalidade FK
        int ID_Disponibilidade FK
        int ID_Estado_Coaching FK
        decimal ValorPorAluno
        boolean confirmacao_prof
        boolean confirmacao_EE
    }
    Coaching_Aluno {
        int ID_Coaching PK, FK
        int ID_Aluno PK, FK
        int ID_Enc_Educacao FK
        decimal ValorEmFalta
        boolean confirmado
    }
    Disponibilidade {
        int ID_Disponibilidade PK
        int ID_Professor FK
        int EstadoDisponibilidadeID FK
        int AlteradoPorUtilizadorID FK
        int Dia_Semana FK
        int MaxAlunos
        decimal ValorPorAluno
    }
    Estado_Disponibilidade {
        int ID PK
        string Tipo
    }
    Estado_Coaching {
        int ID_Estado_Coaching PK
        string Tipo
    }
    Excecao_Disponibilidade {
        int ID_Excecao PK
        int ID_Disponibilidade FK
        date Data_Cancelada
    }
    Pedido_Coaching {
        int ID_Pedido PK
        int ID_EE FK
        int ID_Professor FK
        int ID_Modalidade FK
        int ID_EstadoPedido FK
    }
    Pedido_Coaching_Aluno {
        int ID_Pedido PK, FK
        int ID_Aluno PK, FK
    }
    Estado_Pedido {
        int ID_EstadoPedido PK
        string Nome
    }
    Coordenador
    Professor
    Sala
    Modalidade
    Aluno
    Enc_Educacao
    Utilizador
    Dias_Semana

    Coordenador ||--o{ Coaching : "manages"
    Professor ||--o{ Coaching : "teaches"
    Sala ||--o{ Coaching : "held in"
    Modalidade ||--o{ Coaching : "modality"
    Disponibilidade ||--o{ Coaching : "booked from slot"
    Estado_Coaching ||--o{ Coaching : "status"
    Coaching ||--o{ Coaching_Aluno : "enrolls"
    Aluno ||--o{ Coaching_Aluno : "enrolled in"
    Enc_Educacao ||--o{ Coaching_Aluno : "billed to"
    Professor ||--o{ Disponibilidade : "offers"
    Estado_Disponibilidade ||--o{ Disponibilidade : "status"
    Utilizador ||--o{ Disponibilidade : "last changed by"
    Dias_Semana ||--o{ Disponibilidade : "day of week"
    Disponibilidade ||--o{ Excecao_Disponibilidade : "cancelled date"
    Utilizador ||--o{ Pedido_Coaching : "requested by (guardian)"
    Utilizador ||--o{ Pedido_Coaching : "requested from (professor)"
    Modalidade ||--o{ Pedido_Coaching : "requested modality"
    Estado_Pedido ||--o{ Pedido_Coaching : "status"
    Pedido_Coaching ||--o{ Pedido_Coaching_Aluno : "for students"
    Aluno ||--o{ Pedido_Coaching_Aluno : "included"
```

- **Coaching** — a scheduled coaching session (professor, room, modality, price/student, dual confirmation from professor and guardian).
- **Coaching_Aluno** — join table: which students are enrolled in a coaching session, and any outstanding amount (`ValorEmFalta`) billed to their guardian.
- **Disponibilidade** — a professor's availability slot that coaching sessions get booked from.
- **Estado_Disponibilidade** / **Estado_Coaching** / **Estado_Pedido** — status lookup tables (e.g. pending/approved/rejected).
- **Excecao_Disponibilidade** — a cancelled date for an otherwise-recurring availability slot.
- **Pedido_Coaching** — a coaching request initiated by a guardian (`ID_EE`) targeting a specific professor; both `ID_EE` and `ID_Professor` are foreign keys to `Utilizador`, not to `Enc_Educacao`/`Professor` directly.
- **Pedido_Coaching_Aluno** — join table: which students a coaching request is for.

**Cross-references:** `Coordenador`, `Professor`, `Aluno`, `Enc_Educacao`, `Dias_Semana` are defined in §1/§2. `Sala`, `Modalidade` are defined in §2. `Utilizador` is defined in §1.

---

## 4. Events

```mermaid
erDiagram
    Evento {
        int ID_Evento PK
        string Titulo
        string Slug
        boolean Publico
        boolean Publicado
        datetime Data_Inicio
        int ID_Utilizador_Criador FK
    }
    Evento_Comunicacao {
        int ID_Evento_Comunicacao PK
        int ID_Evento FK
        int ID_Utilizador_Criador FK
        string Titulo
        string Mensagem
        boolean Importante
    }
    Utilizador

    Utilizador ||--o{ Evento : "created by"
    Utilizador ||--o{ Evento : "last updated by"
    Utilizador ||--o{ Evento : "removed by"
    Evento ||--o{ Evento_Comunicacao : "announcements"
    Utilizador ||--o{ Evento_Comunicacao : "posted by"
```

- **Evento** — a school event, which can be public (`Publico`) and featured (`Destaque`); soft-deleted via `Data_Remocao` rather than hard-deleted.
- **Evento_Comunicacao** — a communication/announcement thread attached to an event.

**Cross-references:** `Utilizador` is defined in §1.

---

## 5. Marketplace & Inventory

Members can list items (`Artigo`) for sale or rental; each listing has stock variants (`Stock_Armazem`) by color/size/condition, which can be rented (`Aluguer_Artigo`), favorited (`Artigo_Favorito`), or receive interest (`Interesse_Artigo`). Listings go through a moderation workflow logged in `Registo_Moderacao_Marketplace`.

```mermaid
erDiagram
    Artigo {
        int ID_Artigo PK
        string Nome
        string Tipo_Anuncio
        string Estado_Anuncio
        boolean Publicado_No_Marketplace
        int ID_Utilizador_Criador FK
        int ID_Utilizador_Moderador FK
    }
    Stock_Armazem {
        int ID_Stock PK
        int ID_Artigo FK
        int ID_Cor FK
        int ID_Estado FK
        int ID_Tamanho FK
        int Quantidade_Total
    }
    Cor {
        int ID_Cor PK
        string Descricao
    }
    Estado {
        int ID_Estado PK
        string Descricao
    }
    Tamanho {
        int ID_Tamanho PK
        string Descricao
    }
    Aluguer_Artigo {
        int ID_Aluguer PK
        int ID_Stock FK
        int ID_Utilizador FK
        string Estado
        date Data_Recolha_Prevista
    }
    Artigo_Favorito {
        int ID_Favorito PK
        int ID_Stock FK
        int ID_Utilizador FK
    }
    Interesse_Artigo {
        int ID_Interesse PK
        int ID_Stock FK
        int ID_Utilizador FK
        string Estado
    }
    Registo_Moderacao_Marketplace {
        int ID_Registo_Moderacao PK
        int ID_Artigo FK
        int ID_Utilizador_Moderador FK
        string Acao
    }
    Utilizador

    Utilizador ||--o{ Artigo : "created by"
    Utilizador ||--o{ Artigo : "moderated by"
    Artigo ||--o{ Stock_Armazem : "stock variants"
    Cor ||--o{ Stock_Armazem : "color"
    Estado ||--o{ Stock_Armazem : "condition"
    Tamanho ||--o{ Stock_Armazem : "size"
    Stock_Armazem ||--o{ Aluguer_Artigo : "rented as"
    Utilizador ||--o{ Aluguer_Artigo : "rented by"
    Stock_Armazem ||--o{ Artigo_Favorito : "favorited"
    Utilizador ||--o{ Artigo_Favorito : "favorited by"
    Stock_Armazem ||--o{ Interesse_Artigo : "interest in"
    Utilizador ||--o{ Interesse_Artigo : "interested user"
    Artigo ||--o{ Registo_Moderacao_Marketplace : "moderation log"
    Utilizador ||--o{ Registo_Moderacao_Marketplace : "moderator"
```

- **Artigo** — a marketplace listing (sale or rental) for an item, subject to moderation (`Estado_Anuncio`, `Motivo_Moderacao`).
- **Stock_Armazem** — a specific stock variant of an `Artigo` (color/size/condition combination and quantities).
- **Cor** / **Estado** / **Tamanho** — lookup tables for color, item condition, and size.
- **Aluguer_Artigo** — an active/past rental of a stock variant to a user.
- **Artigo_Favorito** — a user's favorited stock variant.
- **Interesse_Artigo** — a user's expressed interest (purchase or rental) in a stock variant.
- **Registo_Moderacao_Marketplace** — audit log of moderation actions taken on a listing.

**Cross-references:** `Utilizador` is defined in §1.
