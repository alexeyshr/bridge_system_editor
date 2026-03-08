# Implementation Plan: Persistent Multi-User Workspace

**Branch**: `001-authentication-and-database` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-authentication-and-database/spec.md`

## Summary

Replace local-only persistence (localStorage + YAML export/import as primary path) with authenticated server-side persistence on a database.  
Users should sign in (email/password or Telegram), create/edit systems, and get automatic save/load with optional advanced import/export for migration compatibility.
Sharing must support three invite channels: email, in-app user search, and Telegram link.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 20+, Next.js 15  
**Primary Dependencies**: React 19, Zustand, Auth.js (NextAuth v5), Prisma ORM, PostgreSQL driver, Zod, bcryptjs, optional nodemailer integration  
**Storage**: PostgreSQL (authoritative), localStorage only for short offline retry queue  
**Testing**: `node:test`, ESLint, `tsc --noEmit`, integration tests for API + autosave sync behavior  
**Target Platform**: Web browsers (desktop/mobile), Linux-hosted Node runtime  
**Project Type**: Full-stack Next.js web application (UI + API in one repo)  
**Performance Goals**: autosave confirm <= 2s p95; system load <= 1.5s p95 for typical account  
**Constraints**: preserve current tree/card UX, enforce tenant isolation, avoid blocking UI on save  
**Scale/Scope**: 500-1000 users, up to 30 systems per user, up to 1000 nodes per system

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- No project constitution file is defined yet; using temporary delivery gates for this feature:
- Gate A (Spec First): `spec.md`, `plan.md`, `tasks.md` are present before implementation.
- Gate B (No UX Regression): existing left/center/right panel interactions remain functional.
- Gate C (Data Safety): persistence schema includes explicit `schemaVersion` and migration path.
- Gate D (Security Baseline): all API routes validate session and per-system permissions.
- Gate E (Identity Consistency): one user can link Telegram to existing account without duplicate workspace creation.

## Project Structure

### Documentation (this feature)

```text
specs/001-authentication-and-database/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-api.openapi.yaml
│   └── systems-api.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── auth/
│   │   └── [...nextauth]/route.ts
│   ├── users/search/route.ts
│   ├── systems/route.ts
│   ├── systems/[systemId]/route.ts
│   ├── systems/[systemId]/nodes/route.ts
│   ├── systems/[systemId]/shares/route.ts
│   ├── systems/[systemId]/invites/route.ts
│   └── invites/[token]/accept/route.ts
├── page.tsx
└── layout.tsx

components/
├── TopBar.tsx
├── LeftPanel.tsx
├── CenterPanel.tsx
└── RightPanel.tsx

hooks/
└── useAutosaveSync.ts

lib/
├── auth/
│   ├── config.ts
│   ├── linking.ts
│   └── session.ts
├── db/
│   └── prisma.ts
├── server/
│   ├── systems-service.ts
│   ├── invite-service.ts
│   └── auth-guard.ts
└── validation/
    ├── systems.ts
    └── invites.ts

prisma/
└── schema.prisma

store/
└── useBiddingStore.ts

tests/
├── contract/
├── integration/
└── unit/
```

**Structure Decision**: Keep a single Next.js repo and add server-side modules (`lib/auth`, `lib/db`, `app/api/*`) rather than splitting frontend/backend, to minimize migration risk and keep current UI intact.

## Complexity Tracking

No constitution violations requiring exception at this stage.
