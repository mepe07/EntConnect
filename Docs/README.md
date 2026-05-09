# EntConnect

EntConnect é uma plataforma web para gerir a atividade operacional da uma escola de dança "Ent'Artes", contando com ferramentas para gestão de aulas, coaching, professores, encarregados de educacao, eventos, faturacao, inventario, marketplace, entre outros.

O projeto está organizado em duas aplições principais:

- `Backend`: API REST em NestJS, com Prisma e SQL Server.
- `Frontend`: aplicacao React com React Router, Vite, Sass e componentes reutilizaveis.

## Objetivo

A aplicação centraliza processos que normalmente ficam espalhados por folhas de calculo, mensagens e gestao manual:

- autenticação e perfis por cargo;
- gestão de utilizadores, professores, alunos e encarregados de educação;
- configuração de salas/estúdios e modalidades;
- horários de aulas fixas e exceções;
- disponibilidades, marcações e confirmações de coaching;
- faturação, pagamentos e relatórios;
- eventos publicos e painel de gestao de eventos;
- inventario interno, marketplace e moderação;
- dashboards e estatisticas por tipo de utilizador.

## Stack Tecnologica

### Backend

- Node.js e TypeScript
- NestJS 11
- Prisma 6
- SQL Server
- JWT para autenticacao
- Guards globais para autenticacao e roles
- Swagger em `/api-docs`
- Azure Blob Storage para ficheiros/imagens
- Azure Application Insights para logs e telemetria
- Jest para testes unitarios e e2e
- Compodoc para documentacao tecnica do backend

### Frontend

- React 19
- React Router 7
- Vite
- TypeScript
- Sass
- Tailwind CSS 4 disponivel no toolchain
- Font Awesome
- Recharts

## Estrutura do Repositorio

```txt
EntConnect/
  Backend/
    prisma/
      schema.prisma
    src/
      auth/
      calendario/
      coaching/
      estatistica/
      eventos/
      faturacao/
      horarios/
      Infraestrutura/
      marketplace/
      prisma/
      salas/
      utilizador/
    test/
  Frontend/
    app/
      components/
      config/
      routes/
      services/
      structure/
      views/
    public/
  Docs/
    README.md
```

## Modulos Principais

### Autenticacao e Roles

O backend usa JWT com `AuthGuard` global. Endpoints publicos usam o decorator `@Public()`. As permissoes por cargo sao validadas pelo `RolesGuard`.

Roles principais:

- `Coordenador`
- `Professor`
- `Enc_Educacao`

Fluxos suportados:

- login;
- troca de role ativa quando o utilizador tem mais do que uma role;
- consulta/atualizacao da sessao;
- recuperacao e redefinicao de password por email.

### Utilizadores

O modulo de utilizadores cobre:

- CRUD de utilizadores;
- bloqueio/desbloqueio;
- alteracao de cargo e dados pessoais;
- alteracao/reset de password;
- upload, leitura e remocao de fotografia;
- importacao de utilizadores via ficheiro em Azure Blob Storage;
- gestao de alunos associados a encarregados de educacao;
- endpoints de professor para agendamentos, confirmacoes e disponibilidades.

### Coaching

Inclui a gestao de sessoes, disponibilidades, inscricoes, confirmacoes e relatorios operacionais:

- criacao de coaching;
- inscricao/remocao de alunos;
- consulta de oferta e marcacoes;
- confirmacao por professor e encarregado de educacao;
- gestao de estudios/salas usados em coaching;
- KPIs administrativos e sessoes futuras.

### Horarios e Calendario

O modulo de horarios gere aulas fixas:

- dias da semana;
- criacao, edicao e remocao de aulas fixas;
- consulta por ID;
- excecoes/cancelamentos de aulas.

O modulo de calendario agrega eventos e sessoes para vistas de calendario no frontend.

### Salas e Modalidades

Permite gerir infraestrutura basica:

- salas/estudios;
- disponibilidade de salas;
- associacao de salas a modalidades;
- modalidades usadas por aulas e coaching.

### Eventos

Suporta eventos publicos e gestao interna:

- catalogo publico de eventos;
- detalhe publico por `slug`;
- destaque no login;
- painel de gestao para coordenacao;
- criacao, atualizacao, remocao logica e reativacao.

### Marketplace e Inventario

O marketplace junta inventario da escola e anuncios de utilizadores:

- inventario interno;
- publicacao de artigos no marketplace;
- anuncios publicos/listaveis;
- anuncios do proprio utilizador;
- registo de interesse;
- favoritos/interesses associados a stock;
- moderacao de anuncios;
- historico de moderacao.

### Faturacao e Estatisticas

Inclui dashboards e relatorios:

- faturacao geral;
- relatorio de coaching;
- pagamentos de coaching;
- marcacao de pagamentos;
- historico financeiro;
- dashboard financeiro;
- previsao financeira;
- estatisticas de alunos e aulas;
- dashboards por encarregado de educacao e professor.

## Rotas Frontend

As rotas principais estao definidas em `Frontend/app/routes.ts`.

Rotas publicas ou de entrada:

- `/`
- `/login`
- `/eventos`
- `/eventos/:slug`

Rotas de coordenacao/admin:

- `/admin/eventos`
- `/admin/salas`
- `/admin/modalidades`
- `/admin/coaching`
- `/admin/pagamentos-coaching`
- `/admin/utilizadores`
- `/admin/professores-disponibilidade`
- `/admin/professores`
- `/admin/calendario`
- `/admin/horarios`

Rotas de coaching e agenda:

- `/coaching/oferta`
- `/coaching/marcacoes`
- `/coaching/confirmacoes`
- `/agenda/agendamentos`
- `/agenda/confirmacoes`
- `/agenda/disponibilidades`

Rotas de marketplace:

- `/marketplace/inventario`
- `/marketplace/anuncios`
- `/marketplace/atividades`

Rotas de relatorios:

- `/relatorios/faturacao`
- `/relatorios/relatorioCoaching`
- `/relatorios/historico-coaching`
- `/relatorios/estatisticas`

Rotas de conta e encarregado:

- `/educandos`
- `/conta`

## API Backend

A API corre por omissao em `http://localhost:3000`.

Documentacao Swagger:

```txt
http://localhost:3000/api-docs
```

Principais grupos de endpoints:

- `/auth`
- `/utilizador`
- `/professor`
- `/coaching`
- `/modalidade`
- `/salas`
- `/horarios`
- `/calendario`
- `/eventos`
- `/marketplace`
- `/faturacao`
- `/estatisticas`

Quase todos os endpoints exigem `Authorization: Bearer <token>`, exceto os marcados como publicos no backend, como login, recuperacao de password e eventos publicos.

## Modelo de Dados

O schema Prisma esta em `Backend/prisma/schema.prisma` e usa SQL Server.

Entidades centrais:

- `Pessoa`, `Utilizador`, `Professor`, `Enc_Educacao`, `Coordenador`
- `Aluno`
- `Coaching`, `Coaching_Aluno`, `Disponibilidade`, `Estado_Coaching`
- `Sala`, `Modalidade`, `Aula_Fixa`, `Excecao_Aula_Fixa`, `Dias_Semana`
- `Evento`
- `Artigo`, `Stock_Armazem`, `Aluguer_Artigo`, `Interesse_Artigo`, `Artigo_Favorito`
- `Registo_Moderacao_Marketplace`

A base de dados e acedida pelo `PrismaService`, registado no `PrismaModule`.

## Variaveis de Ambiente

### Backend

Criar `Backend/.env` com as variaveis necessarias:

```env
DATABASE_URL="sqlserver://..."
JWT_SECRET="segredo-local"
JWT_EXPIRES_IN="1d"
PORT=3000
FRONTEND_URL="http://localhost:5173"

SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
SMTP_SECURE=false

AZURE_STORAGE_CONNECTION_STRING=""
APPINSIGHTS_CONNECTION_STRING=""
```

Notas:

- `DATABASE_URL` e obrigatoria para o Prisma.
- `JWT_SECRET` e obrigatoria para arrancar o modulo de autenticacao.
- `AZURE_STORAGE_CONNECTION_STRING` e necessaria para uploads/importacoes que usam Blob Storage.
- `APPINSIGHTS_CONNECTION_STRING` e opcional; sem ela a app corre sem Application Insights.
- `FRONTEND_URL` e usada na configuracao CORS e nos links de recuperacao de password.

### Frontend

Criar `Frontend/.env` se for preciso apontar para outra API:

```env
VITE_API_URL="http://localhost:3000"
```

Se `VITE_API_URL` nao estiver definida, o frontend usa `http://localhost:3000`.

## Como Executar Localmente

### 1. Instalar dependencias

```bash
cd Backend
npm install

cd ../Frontend
npm install
```

### 2. Configurar ambiente

Criar os ficheiros `.env` indicados acima e garantir acesso a uma base de dados SQL Server compativel com o schema Prisma.

### 3. Preparar Prisma

No backend:

```bash
cd Backend
npx prisma generate
```

Dependendo do estado da base de dados, pode ser necessario aplicar migrations ou sincronizar manualmente o schema usado pelo projeto.

### 4. Arrancar backend

```bash
cd Backend
npm run start:dev
```

Backend:

```txt
http://localhost:3000
```

Swagger:

```txt
http://localhost:3000/api-docs
```

### 5. Arrancar frontend

Noutro terminal:

```bash
cd Frontend
npm run dev
```

O React Router/Vite apresenta no terminal a porta usada. Em desenvolvimento, o projeto tambem permite CORS para:

- `http://localhost:4200`
- `http://localhost:5173`
- valor definido em `FRONTEND_URL`

## Scripts Uteis

### Backend

```bash
npm run start:dev      # desenvolvimento com watch
npm run build          # build NestJS
npm run start:prod     # correr dist/main
npm run lint           # lint com autofix
npm run format         # formatar src e test
npm run test           # testes unitarios
npm run test:cov       # cobertura
npm run test:e2e       # testes e2e
npm run compodoc:build # gerar docs em Docs/backend_compodoc
npm run compodoc:serve # gerar e servir docs Compodoc
```

### Frontend

```bash
npm run dev       # desenvolvimento
npm run build     # build React Router
npm run start     # servir build
npm run debug     # build e dev na porta 4200
npm run typecheck # typegen do React Router + tsc
```

## Testes

O backend tem testes unitarios junto dos modulos (`*.spec.ts`) e testes e2e em `Backend/test`.

Comandos principais:

```bash
cd Backend
npm run test
npm run test:e2e
```

O frontend tem `typecheck` configurado:

```bash
cd Frontend
npm run typecheck
```

## Convencoes de Desenvolvimento

- Manter DTOs no backend para entrada/saida de dados.
- Usar `class-validator` e o `ValidationPipe` global para validar requests.
- Marcar endpoints publicos explicitamente com `@Public()`.
- Usar `@Roles(...)` quando um endpoint deve ser limitado por cargo.
- Centralizar acesso a dados no service de cada modulo.
- No frontend, colocar chamadas HTTP em `app/services`.
- Reutilizar componentes em `app/components` antes de criar UI nova.
- Preservar a separacao entre `routes` e `views`: rotas devem encaminhar para a experiencia, views concentram o ecran.
- Evitar hardcode da API no frontend; usar `API_BASE_URL`.

## Observabilidade e Logs

O backend substitui o logger padrao por `AppInsightsLogger`. Quando `APPINSIGHTS_CONNECTION_STRING` existe, a aplicacao envia telemetria para Azure Application Insights.

Tambem existe um interceptor global de logging de requests em `Backend/src/common/interceptors/request-logging.interceptor.ts`.

## Documentacao Tecnica

Para gerar documentacao do backend com Compodoc:

```bash
cd Backend
npm run compodoc:build
```

O output fica em:

```txt
Docs/backend_compodoc
```

Para servir localmente:

```bash
npm run compodoc:serve
```

## Notas de Manutencao

- O projeto depende fortemente dos nomes e relacoes definidos no SQL Server; rever sempre `schema.prisma` antes de alterar queries.
- Alteracoes a roles devem ser refletidas no backend, no menu do frontend e nas protecoes de rota/servico.
- Funcionalidades com ficheiros dependem de Azure Blob Storage; sem essa configuracao, uploads/importacoes podem falhar.
- A recuperacao de password depende das variaveis SMTP.
- O Swagger e a melhor referencia rapida para validar contratos da API durante desenvolvimento.
