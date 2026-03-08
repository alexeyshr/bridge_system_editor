# Fix Log - Auth + DB + API Foundation

Date: 2026-03-07

## What was fixed

- Added backend foundation for authenticated multi-user architecture:
  - Auth.js API route and auth config (`credentials` + `telegram` provider scaffold).
  - User registration endpoint.
  - Telegram identity linking endpoint.
  - Prisma schema for users, systems, nodes, shares, invites, revisions.
  - Protected systems/search/invites API routes with ACL checks.

## Runtime issue found and resolved

- `prisma@7` rejected legacy datasource URL syntax in `schema.prisma` and required `prisma.config.ts`.
- Resolution: pinned Prisma stack to `prisma@6.16.3` + `@prisma/client@6.16.3` for stable migration path in current repo.

## Validation

- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

All checks passed.
