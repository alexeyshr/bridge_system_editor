# Research: Persistent Multi-User Workspace

## Decision 1: Auth stack

- **Decision**: Use Auth.js (NextAuth) with credentials provider plus Telegram provider flow.
- **Rationale**: Native integration with Next.js route handlers and session utilities, while supporting required dual-auth UX.
- **Alternatives considered**:
  - Clerk/Supabase Auth: faster SaaS onboarding, but tighter external coupling and migration overhead.
  - Custom JWT auth: more control, but high implementation/security burden.

## Decision 2: Database and ORM

- **Decision**: Use PostgreSQL + Prisma.
- **Rationale**: Reliable transactional storage, strong TypeScript ergonomics, mature migration tooling.
- **Alternatives considered**:
  - SQLite: simpler local setup but weaker concurrency/scaling for 500-1000 users.
  - MongoDB: flexible schema, but relational access control and joins are less straightforward for this domain.

## Decision 3: Autosave conflict strategy

- **Decision**: Start with `last-write-wins` + revision counter and conflict diagnostics.
- **Rationale**: Delivers predictable behavior quickly while preserving room for future CRDT/merge strategy.
- **Alternatives considered**:
  - Full operational transform/CRDT: better collaboration semantics but too complex for MVP.
  - Pessimistic locking: avoids conflicts but hurts UX and collaboration.

## Decision 4: API style

- **Decision**: Keep RESTful Next.js route handlers under `app/api/*`.
- **Rationale**: Fits existing app architecture and allows gradual migration from local store logic.
- **Alternatives considered**:
  - GraphQL: expressive but unnecessary complexity at current feature scope.
  - Separate backend service: cleaner separation but higher deployment and refactor cost.

## Decision 5: Legacy import/export role

- **Decision**: Retain import/export in advanced tools only.
- **Rationale**: Supports migration and portability without reintroducing manual-save dependency in primary workflow.
- **Alternatives considered**:
  - Remove import/export completely: cleaner UX but blocks migration for existing data.
  - Keep import/export in top bar as primary actions: conflicts with autosave-first product direction.

## Decision 6: Telegram invite delivery

- **Decision**: Implement Telegram sharing as generated invite link + Telegram deep-link handoff.
- **Rationale**: Robust and predictable for web app; direct bot-to-user DM is unreliable unless recipient initiated bot chat.
- **Alternatives considered**:
  - Direct bot DM to arbitrary Telegram users: blocked by Telegram constraints for many recipients.
  - Telegram-only sharing: insufficient because product also needs email and internal search channels.
