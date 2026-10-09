# AGENTS.md - Club Beasts David Roo

This file contains instructions for all agents working on this project.

## Project Overview
- **Name**: Club Beasts David Rozo
- **Type**: Software web para gimnasio de alto rendimiento
- **Stack**: Fastify + Next.js + Prisma + PostgreSQL
- **Testing**: Vitest + Playwright + TDD/ATDD
- **Design**: Dark poster-style aesthetic with Royal Blue (#4169E1) + Black theme

## Design System

### Color Tokens
| Token | Hex | Role |
|-------|-----|------|
| Royal Blue | `#4169E1` | Primary accent, CTAs, active states |
| Royal Dark | `#3457C7` | Hover states, pressed |
| Royal Light | `#6B8CFF` | Light accents, highlights |
| Black | `#000000` | Secondary, dark backgrounds |
| Near Black | `#0A0F1A` | Dark section canvas |
| Dark Surface | `#111827` | Card surfaces on dark |
| White | `#FFFFFF` | Light sections, text on dark |
| Off White | `#F8FAFC` | Light card surfaces |
| Gray Scale | `#F3F4F6` to `#111827` | UI elements, borders, text |

### Typography
- **Display/Headlines**: Oswald (700, condensed) - oversized, poster-style
- **Body/UI**: Inter (400, 500, 600) - clean, readable

### Design Principles
- Dark-first aesthetic (gym/fitness brand)
- Poster-style headlines: oversized, condensed, tight line-height
- Pill-shaped buttons (9999px border-radius)
- Cards with 14px radius, no shadows
- Minimalist navigation
- Color psychology: Royal Blue = trust, discipline, elite performance; Black = luxury, power, exclusivity

### Component Patterns
- **Navbar**: Transparent, 64px height, logo left, links center, action right
- **Button**: Pill shape, royal blue fill, white text
- **Card**: 14px radius, 20px padding, dark or light variant
- **Badge**: 6px radius, small, color-coded by status
- **Input**: Clean borders, royal blue focus ring

## Agent Routing

When a user request comes in, the default entry point is `delivery-orchestrator` for any task that affects product scope, implementation, tests, release quality, or MVP progress. The orchestrator delegates to the specialized subagents below.

Simple single-domain requests can go directly to the corresponding specialist, but accepted MVP progress is only certified through the delivery protocol below.

### Delivery Orchestration → `delivery-orchestrator`
- Convert product goals into increments with clear specifications.
- Delegate to subagents with explicit criteria, files, constraints, and expected evidence.
- Maintain `docs/producto/mvp.md`, `docs/producto/decisiones.md`, `docs/producto/avance.md`, and `docs/incrementos/*`.
- Distinguish implemented, verified, and accepted.
- Never certify percentage progress without evidence.
- Block work when product decisions, data rules, permissions, or test isolation are undefined.

When a specialist is needed, use this routing:

### Backend Tasks → `backend-developer`
- Create/modify API routes
- Implement business logic in services
- Configure Fastify plugins
- Handle authentication/authorization
- Database queries and operations

### Frontend Tasks → `frontend-developer`
- Create/modify React components
- Build Next.js pages
- Style with Tailwind CSS
- Handle user interactions
- Form submissions and validations
- **Design System**: Follow Club Beasts design tokens in `club-beasts-web/src/app/globals.css`
- **Visual Reference**: Adapt poster-style from `DESIGN.md` with Royal Blue + Black theme
- **Images**: Store in `club-beasts-web/public/images/` (logo, brand, sports icons)

### Database Tasks → `database-admin`
- Design or modify Prisma schema
- Create/apply migrations
- Seed the database
- Optimize queries
- Data modeling decisions

### Testing Tasks → `test-engineer`
- Write unit tests
- Write integration tests
- Write e2e tests with Playwright
- Follow TDD/ATDD methodology
- Fix failing tests

### DevOps Tasks → `devops-engineer`
- Deploy to Vercel/Railway
- Configure CI/CD
- Set up environments
- Manage domains and SSL
- Infrastructure decisions

### Requirements & Validation → `acceptance-criteria-analyst`
- "Analiza la HU-X" / "Crea criterios para HU-X" → **Modo CREAR**: Genera criterios ISTQB + Gherkin + schemas zod
- "Refactoriza..." / "Audita..." / "Revisa validación..." → **Modo REFACTORIZAR**: Compara código existente contra criterios, reporta gaps
- "Avancemos con el otro X%" / "Qué falta por validar" → **Modo AVANZAR**: Tabla de estado HU vs código vs criterios

### Code Review → `code-reviewer`
- Review code quality
- Audit security
- Check best practices
- Suggest improvements
- Verify test coverage

## Shared Conventions

### Delivery Protocol

Every non-trivial increment follows this state machine:

```text
PROPUESTO -> ESPECIFICADO -> LISTO -> RED -> IMPLEMENTADO -> VERIFICADO -> REVISADO -> ACEPTADO
```

`BLOQUEADO` can be used at any point with a documented reason and owner.

#### Source of Truth
- `docs/producto/mvp.md`: MVP weights and accepted-progress formula.
- `docs/producto/decisiones.md`: approved and pending product/technical decisions.
- `docs/producto/avance.md`: certified progress and blocking gaps.
- `docs/incrementos/<INC>/spec.md`: acceptance criteria for the active increment.
- `docs/incrementos/<INC>/tareas.md`: operational backlog by agent.
- `docs/incrementos/<INC>/evidencia.md`: executed commands, results, review findings, and closure evidence.
- `fase1.md` and `fase2.md`: historical phase notes, not final percentage authority.

#### Definition of Ready
- Acceptance criteria are observable and testable.
- Product decisions that affect permissions, data, or UX are resolved.
- API contracts are defined before backend/frontend parallel work.
- Test data, fixtures, and environment assumptions are explicit.
- Required increment docs exist.

#### Definition of Accepted
- Every included criterion is verified or removed by explicit scope change.
- API and web compile where applicable.
- Critical API behavior has integration tests.
- Critical user flows have real E2E tests where applicable.
- Tests do not contain empty assertions or optional steps that hide failures.
- Review has no blocking findings.
- `docs/producto/avance.md` is updated with accepted points.

#### Mandatory Task Contract
When delegating to a subagent, include:

- Active increment and affected criteria IDs.
- Allowed files or areas.
- Relevant business rules.
- Expected tests and verification commands.
- Explicit non-goals and files not to touch.
- Required final report: files changed, evidence, risks, and blockers.

#### Progress Accounting
- **Implemented** means code or UI exists.
- **Verified** means the behavior has executed evidence.
- **Accepted** means it satisfies criteria, tests, and review.
- Only accepted criteria count toward MVP percentage.
- Do not close mandatory criteria as "postponed" unless the scope is explicitly changed in `docs/producto/decisiones.md` and reflected in the increment spec.

### Code Style
- TypeScript strict mode for all code
- ESLint + Prettier for formatting
- Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`
- Trunk-based branching (feature branches → main)

### File Organization
```
club-beasts-api/          # Backend
├── src/routes/           # API routes (HTTP layer)
├── src/services/         # Business logic
├── src/plugins/          # Fastify plugins
├── prisma/               # Database schema & migrations
└── tests/                # Tests

club-beasts-web/          # Frontend
├── src/app/              # Next.js pages
├── src/components/       # React components (Navbar, Button, Card, etc.)
├── src/lib/              # Utilities & API client
├── public/images/        # Static images (logo, brand, sports icons)
│   ├── logo/             # Logo files (SVG preferred)
│   ├── brand/            # Brand elements (favicon, OG image)
│   ├── sports/           # Sport icons (line-art SVGs)
│   └── signatures/       # Digital signatures
└── tests/e2e/            # E2E tests
```

### Testing Requirements
- **TDD/ATDD is MANDATORY** for all new features
- Every route must have integration tests
- Critical user flows need e2e tests
- Run tests before completing any task

### TDD Workflow (Obligatorio)
1. **Red**: Write a failing test that defines the expected behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

### ATDD with Gherkin
- Features in `club-beasts-api/features/*.feature`
- Step definitions in `club-beasts-api/features/steps/*.ts`
- E2e tests in `club-beasts-web/tests/e2e/*.spec.ts`
- Run Gherkin tests: `npx vitest run tests/integration/features.test.ts`

### Git Workflow
- **Branch**: `main` (trunk-based, commits directos - fase actual solo 1 desarrollador)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`)
- **Rollback**: Usar `git revert` (seguro) o `git reset` (con precaución)
- **Recovery**: `git reflog` para recuperar commits perdidos
- **Hooks**: Pre-commit ejecuta lint + typecheck
- **No secrets**: Nunca commitear variables de entorno o tokens
- **Stash**: Usar `git stash` para guardar cambios al cambiar de tarea

### Git Rollback Quick Reference
```bash
# Revertir último commit (seguro)
git revert HEAD

# Revertir commit específico
git revert <commit-hash>

# Guardar cambios temporalmente
git stash push -m "trabajo pendiente"

# Recuperar stash
git stash pop

# Recuperar commit perdido
git reflog
git reset --hard <commit-hash>
```

## How to Use This File

This AGENTS.md file is loaded by opencode and injected into all agent contexts.
When you receive a task:

1. **Analyze the request**: What is the user asking for?
2. **Identify the domain**: Is it backend, frontend, database, testing, devops, or review?
3. **Apply the right agent**: Follow the instructions for that agent type
4. **Follow conventions**: Use the shared conventions above
5. **Verify your work**: Run relevant tests before completing

## Agent Examples

### Example: User says "Create a route for fetching clients"
→ **Agent**: backend-developer
→ **Action**: Create route in `src/routes/clientes.ts`, service in `src/services/cliente.service.ts`, add integration test

### Example: User says "Create a table component for clients"
→ **Agent**: frontend-developer
→ **Action**: Create component in `src/components/ClientTable.tsx`, style with Tailwind using design tokens, add to clients page

### Example: User says "Write tests for the auth flow"
→ **Agent**: test-engineer
→ **Action**: Create integration tests in `tests/integration/auth.test.ts`, write Gherkin feature in `features/auth.feature`

### Example: User says "Deploy the backend"
→ **Agent**: devops-engineer
→ **Action**: Configure Railway deployment, set environment variables, verify health check

### Example: User says "Analiza la HU-04 de crear cliente"
→ **Agent**: acceptance-criteria-analyst (Modo CREAR)
→ **Action**: Genera `HU-04-criterios-aceptacion.md`, `HU-04.feature`, `HU-04-schemas.ts` en `features/acceptance-criteria/`

### Example: User says "Avancemos con el otro 15%"
→ **Agent**: acceptance-criteria-analyst (Modo AVANZAR)
→ **Action**: Tabla de estado HU vs código vs criterios, genera lo que falte

### Example: User says "Refactoriza la validación de clientes"
→ **Agent**: acceptance-criteria-analyst (Modo REFACTORIZAR)
→ **Action**: Audita `src/routes/clientes.ts` contra criterios ISTQB, reporta gaps
