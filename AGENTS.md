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

`delivery-orchestrator` is the only construction entry point, including small changes, configuration, implementation and tests. It delegates all construction to contracted specialists and maintains delivery documents itself.

No direct specialist routing or specialist-to-specialist delegation is allowed. Without an orchestrator contract, return `BLOQUEADO` without building. Never invoke agents through shell or another tool to bypass this rule. Never omit the mandatory PIN or relax authentication to unblock tests.

`build` is disabled; `plan` remains for analysis only and cannot delegate construction. `explore` is read-only support available only to the orchestrator; `general` is not in the delegation allowlist. Global `subagent: *` denial is refined only by the orchestrator's explicit allowlist. These are workflow controls, not an absolute security sandbox: shell access, global/nested configurations and existing sessions require review. Never use shell to bypass edit or delegation restrictions.

### Delivery Orchestration → `delivery-orchestrator`
- Convert product goals into increments with clear specifications.
- Delegate to subagents with explicit criteria, files, constraints, and expected evidence.
- Maintain `docs/producto/mvp.md`, `docs/producto/decisiones.md`, `docs/producto/avance.md`, and `docs/incrementos/*`.
- Distinguish implemented, verified, and accepted.
- Never certify percentage progress without evidence.
- Block work when product decisions, data rules, permissions, or test isolation are undefined.

Only the orchestrator uses the following delegation catalog:

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

### Navigation Audit → `ui-navigation-auditor`
- Audit entries/exits and inicio/volver/cancelar/logout by role; direct URLs, reload and browser back.
- Check mobile, desktop, keyboard, broken links, dead ends and redirect loops.
- Return criterion/screen/state/entry/exit/role/test/result/evidence matrix and blockers to the orchestrator; do not edit product, tests or delivery documents.
- Frontend fixes findings and test-engineer automates journeys, each under a separate orchestrator contract. Analyst defines navigation criteria; reviewer checks coverage and executed evidence.
- Without browser or executed evidence, journeys remain `NO VERIFICADO`, not accepted.

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
- Before LISTO, the orchestrator records an impact matrix: prior increment/criterion, protected behavior, regression test, command and executed baseline result; justify non-applicability explicitly.
- Acceptance criteria are observable and testable.
- Product decisions that affect permissions, data, or UX are resolved.
- API contracts are defined before backend/frontend parallel work.
- Test data, fixtures, and environment assumptions are explicit.
- Required increment docs exist.
- When navigation is affected, an approved criterion/screen/state/entry/exit/role/test/result/evidence matrix exists, including expected destinations and justified non-applicable cases. The orchestrator records applicability.

#### Definition of Accepted
- Affected regression and shared critical flows have before/after evidence, with prior failures distinguished from new failures. Missing evidence or unresolved regressions block acceptance even when new criteria pass.
- Every included criterion is verified or removed by explicit scope change.
- API and web compile where applicable.
- Critical API behavior has integration tests.
- Critical user flows have real E2E tests where applicable.
- Tests do not contain empty assertions or optional steps that hide failures.
- Review has no blocking findings.
- When navigation applies, mandatory journeys have executed evidence across required roles, mobile/desktop/keyboard and direct URL/reload/back, with no blocking audit findings. Static inspection or compilation alone is not journey verification.
- `docs/producto/avance.md` is updated with accepted points.

#### Mandatory Task Contract
When delegating to a subagent, include:

- Active increment and affected criteria IDs.
- Allowed files or areas.
- Relevant business rules.
- Expected tests and verification commands.
- Protected prior criteria/behaviors, impact matrix and before/after regression commands and evidence.
- Explicit non-goals and files not to touch.
- Required final report: files changed, evidence, risks, and blockers.

Every specialist must validate this contract before work and return `BLOQUEADO` if it is incomplete. Specialists report evidence to the orchestrator, which alone maintains delivery documents. No specialist launches other agents.

#### Progress Accounting
- **Implemented** means code or UI exists.
- **Verified** means the behavior has executed evidence.
- **Accepted** means it satisfies criteria, tests, and review.
- Only accepted criteria count toward MVP percentage.
- Configuration tasks such as WORKFLOW-NAV do not certify MVP points.
- Do not close mandatory criteria as "postponed" unless the scope is explicitly changed in `docs/producto/decisiones.md` and reflected in the increment spec.

#### Preservation and regression (WR-01..06)
- Increments are additive by default: do not remove, disable or degrade prior functionality, validations, permissions, data or journeys to complete another increment. Refactoring is allowed only with behavior preserved; unblocking one criterion never authorizes breaking another.
- All specialists apply this rule and validate preservation and regression in their contracts. Return `BLOQUEADO` for incompatibilities or missing required evidence; do not silently narrow previous criteria.
- Replacing prior behavior requires explicit user approval and prior orchestrator records in `docs/producto/decisiones.md` and the increment spec, linking old/new criteria and replacement tests. Append traceable evidence; never rewrite historical evidence.
- Execute affected regression and shared critical flows before and after changes. Report commands, environment and results, distinguishing pre-existing from new failures without hiding either. Do not delete, skip or weaken tests/expectations to obtain green; legitimate fixture/locator changes require preserved coverage, justification and review.
- Preserve data and applied migrations, API contracts, UX, CI verification gates and affected prior journeys. Each specialist reports evidence and blockers; only the orchestrator maintains delivery documents.
- Stay within authorized files; preserve unrelated work and tool permissions. Configuration-only work uses textual/configuration checks, not product suites, earns 0 MVP points and does not recertify historical increments; justify navigation non-applicability when no product journeys change.

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

1. **Enter through delivery-orchestrator** for all construction; plan may only analyze.
2. **Orchestrator specifies and delegates** with increment, criteria, allowed areas, rules, tests/evidence and non-goals.
3. **Specialist validates contract** or returns `BLOQUEADO`; never delegates further.
4. **Verify assigned work** and return changes, executed evidence, risks and blockers. Configuration-only tasks use configuration checks, not product suites.
5. **Orchestrator records evidence and decisions**; applicable navigation must satisfy LISTO and ACEPTADO gates.

## Agent Examples

### Example: User says "Create a route for fetching clients"
→ **Delegation**: delivery-orchestrator → backend-developer (mandatory contract)
→ **Action**: Create route in `src/routes/clientes.ts`, service in `src/services/cliente.service.ts`, add integration test

### Example: User says "Create a table component for clients"
→ **Delegation**: delivery-orchestrator → frontend-developer (mandatory contract and navigation matrix)
→ **Action**: Create component in `src/components/ClientTable.tsx`, style with Tailwind using design tokens, add to clients page

### Example: User says "Write tests for the auth flow"
→ **Delegation**: delivery-orchestrator → test-engineer (mandatory contract; preserve mandatory PIN)
→ **Action**: Create integration tests in `tests/integration/auth.test.ts`, write Gherkin feature in `features/auth.feature`

### Example: User says "Deploy the backend"
→ **Delegation**: delivery-orchestrator → devops-engineer (mandatory contract)
→ **Action**: Configure Railway deployment, set environment variables, verify health check

### Example: User says "Analiza la HU-04 de crear cliente"
→ **Delegation**: delivery-orchestrator → acceptance-criteria-analyst (Modo CREAR, mandatory contract)
→ **Action**: Genera `HU-04-criterios-aceptacion.md`, `HU-04.feature`, `HU-04-schemas.ts` en `features/acceptance-criteria/`

### Example: User says "Avancemos con el otro 15%"
→ **Delegation**: delivery-orchestrator → acceptance-criteria-analyst (Modo AVANZAR, mandatory contract; orchestrator alone certifies progress)
→ **Action**: Tabla de estado HU vs código vs criterios, genera lo que falte

### Example: User says "Refactoriza la validación de clientes"
→ **Delegation**: delivery-orchestrator → acceptance-criteria-analyst (Modo REFACTORIZAR, mandatory contract)
→ **Action**: Audita `src/routes/clientes.ts` contra criterios ISTQB, reporta gaps
