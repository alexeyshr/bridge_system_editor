# ADR-0006: PostgreSQL Search and Indexing First (No External Search Engine)

- Status: Proposed
- Date: 2026-03-07
- Deciders: BridgeHub core
- Tags: search, data, performance

## Context

For target scale (15-20K users), external search infrastructure adds operational overhead that is unlikely to be justified in the near term.
Bridge system queries can be supported with PostgreSQL FTS + targeted indexes.

## Decision

- Use PostgreSQL as the only search backend in this phase.
- Implement:
  - FTS (`tsvector` + GIN) for notes/meaning/content search.
  - JSONB indexes for frequent filter paths.
  - optional `pg_trgm` for fuzzy matching when needed.
- Defer Meilisearch/Elasticsearch until explicit scale and query-latency thresholds are exceeded.

## Consequences

### Positive

- Simpler operations and deployment.
- Strong consistency with main transactional data.
- Lower implementation and maintenance cost.

### Negative

- Less advanced ranking/fuzzy features compared to dedicated engines.
- Requires disciplined SQL/index tuning.

## Alternatives Considered

1. Introduce Meilisearch now:
   - rejected as premature infrastructure complexity.
2. Keep basic `ILIKE` without FTS/indexing:
   - rejected due to predictable performance degradation.

## Impacted Specs

- `specs/005-platform-core-hardening/spec.md`

## Related Documents

- `docs/ROADMAP.md`
- `docs/adr/ADR-0003-drizzle-only-cutover-and-prisma-removal.md`
