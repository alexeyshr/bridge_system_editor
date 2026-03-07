# Tasks: Persistent Multi-User Workspace

**Input**: Design documents from `/specs/001-authentication-and-database/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required for auth, access control, autosave persistence, and invite channels.

## Format: `[ID] [P?] [Story] Description`

- `[P]`: parallelizable
- `[Story]`: `US1`, `US2`, `US3`

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create env contract in `.env.example` (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_NAME`, optional SMTP vars).
- [x] T002 Add dependencies in `package.json` (`next-auth`, `@prisma/client`, `prisma`, `zod`, `bcryptjs`, optional mail transport package).
- [x] T003 [P] Add Prisma client bootstrap in `lib/db/prisma.ts` and initial `prisma/schema.prisma`.
- [x] T004 Add npm scripts/docs for migration + Prisma generation.

---

## Phase 2: Foundational (Blocking)

- [x] T005 Implement Auth.js route/config in `app/api/auth/[...nextauth]/route.ts` + `lib/auth/config.ts` with credentials provider.
- [x] T006 Implement Telegram auth provider flow and callback mapping in `lib/auth/config.ts`.
- [x] T007 [P] Implement account-linking logic (email account + Telegram identity) in `lib/auth/linking.ts`.
- [x] T008 [P] Implement session/auth guards in `lib/auth/session.ts` and `lib/server/auth-guard.ts`.
- [x] T009 Create persistence schema (`User`, `AuthAccount`, `BiddingSystem`, `BiddingNode`, `SystemShare`, `ShareInvite`, `SystemRevision`) in `prisma/schema.prisma`.
- [x] T010 [P] Add shared validation schemas in `lib/validation/systems.ts` and `lib/validation/invites.ts`.
- [x] T011 Implement systems service layer in `lib/server/systems-service.ts` (CRUD + ACL + revision update).
- [x] T012 Implement invite service layer in `lib/server/invite-service.ts` (create/send/accept/revoke).
- [x] T013 Implement API response/error helpers in `lib/server/api-response.ts`.

**Checkpoint**: foundation is complete and user stories can start.

---

## Phase 3: User Story 1 - Personal Workspace With Auto-Save (P1) 🎯 MVP

### Tests

- [ ] T014 [P] [US1] Contract tests for `GET/POST /api/systems` in `tests/contract/systems.list.contract.test.ts`.
- [ ] T015 [P] [US1] Contract tests for `GET/PATCH /api/systems/{id}` in `tests/contract/systems.item.contract.test.ts`.
- [ ] T016 [P] [US1] Integration test for autosave + reload persistence in `tests/integration/autosave.persistence.test.ts`.
- [ ] T017 [P] [US1] Integration test for sign-in with email/password and Telegram in `tests/integration/auth.providers.test.ts`.

### Implementation

- [x] T018 [US1] Implement `app/api/systems/route.ts` (list/create by current user).
- [x] T019 [US1] Implement `app/api/systems/[systemId]/route.ts` (read/update metadata).
- [x] T020 [US1] Implement `app/api/systems/[systemId]/nodes/route.ts` (bulk upsert for autosave).
- [ ] T021 [US1] Add client API in `lib/api/systems-client.ts`.
- [ ] T022 [US1] Add autosave sync hook in `hooks/useAutosaveSync.ts` (debounce/retry/sync-status).
- [ ] T023 [US1] Refactor `store/useBiddingStore.ts` to backend-first persistence with local pending queue.
- [ ] T024 [US1] Update `components/TopBar.tsx` and `app/page.tsx` for sync-status UX and no primary manual Save flow.
- [ ] T025 [US1] Add profile/auth UI section for linking Telegram account.

**Checkpoint**: authenticated users can work and autosave reliably.

---

## Phase 4: User Story 2 - Sharing With Email/Internal Search/Telegram (P2)

### Tests

- [ ] T026 [P] [US2] Contract tests for `POST /api/systems/{id}/invites` and `POST /api/invites/{token}/accept` in `tests/contract/invites.contract.test.ts`.
- [ ] T027 [P] [US2] Contract tests for `GET /api/users/search` in `tests/contract/users.search.contract.test.ts`.
- [ ] T028 [P] [US2] Integration ACL tests (`owner`, `editor`, `viewer`, `no-access`) in `tests/integration/sharing.acl.test.ts`.
- [ ] T029 [P] [US2] Integration tests for three invite channels in `tests/integration/invite.channels.test.ts`.

### Implementation

- [ ] T030 [US2] Implement `app/api/users/search/route.ts` (privacy-safe lookup of registered users).
- [ ] T031 [US2] Implement `app/api/systems/[systemId]/shares/route.ts` (direct role grant for internal users).
- [ ] T032 [US2] Implement `app/api/systems/[systemId]/invites/route.ts` (email/telegram invite creation).
- [ ] T033 [US2] Implement `app/api/invites/[token]/accept/route.ts` (accept invite and grant access).
- [ ] T034 [US2] Add invite/share UI (channel selector + role) in right panel/modal.
- [ ] T035 [US2] Enforce read-only behavior for viewers in store actions + controls.
- [ ] T036 [US2] Add Telegram deep-link generation and delivery status handling in invite service.

**Checkpoint**: owner can share via all 3 channels and ACL is enforced.

---

## Phase 5: User Story 3 - Legacy Import/Export As Advanced Tools (P3)

### Tests

- [ ] T037 [P] [US3] Integration import test in `tests/integration/import.legacy.test.ts`.
- [ ] T038 [P] [US3] Integration export test in `tests/integration/export.legacy.test.ts`.

### Implementation

- [ ] T039 [US3] Move Import/Export to advanced section in `components/TopBar.tsx`.
- [ ] T040 [US3] Implement backend import endpoint in `app/api/systems/import/route.ts`.
- [ ] T041 [US3] Implement backend export endpoint in `app/api/systems/[systemId]/export/route.ts`.
- [ ] T042 [US3] Add first-login migration of local draft to server in `hooks/useAutosaveSync.ts`.

---

## Phase 6: Polish

- [ ] T043 [P] Add DB indexes and query optimization in `prisma/schema.prisma`.
- [ ] T044 [P] Add structured logs for auth/invite/save failures in `lib/server/*`.
- [ ] T045 Update docs in `readme.md`, `fix/`, `expirience/`.
- [ ] T046 Run full verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
