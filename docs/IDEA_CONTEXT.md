# Idea Context and Traceability

Last updated: 2026-03-08

This document keeps product context aligned between early drafts and current architecture/spec work.

## Source Inputs

- Primary idea bank: `docs/source/IDEAS.md`
- Priority layering: `docs/source/PRIORITIES.md`
- Historical draft archive: `docs/archive/TZ.md`
- Triage decisions by cycle: `docs/TRIAGE.md`

## How We Interpret These Inputs

- `IDEAS.md`:
  - exhaustive backlog source,
  - nothing is dropped by default,
  - includes accepted (`✅`), idea (`💡`), and rejected (`❌`) records.
- `PRIORITIES.md`:
  - release-layer strategy (`MVP`, `v0.2-0.3`, `v0.4-0.5`, `v1+`),
  - used to map ideas into `Now / Next / Later`.
- `TZ.md`:
  - archived strategic draft and domain encyclopedia,
  - reference-only; not part of planning or execution flow.

Original desktop files are considered source imports.  
Working copies for the project are stored in `docs/source/`.

## Coverage Snapshot

From the current `IDEAS.md` snapshot:
- Sections: `79`
- Ideas (`💡`): `420`
- Already marked accepted (`✅`): `14`
- Explicitly rejected (`❌`): `2`

Detailed per-section index:
- `docs/IDEAS_SECTION_INDEX.md`

## Mapping Rules (No-Loss Policy)

1. Every idea remains in backlog unless explicitly rejected.
2. Any implemented work must map to:
   - at least one SDD spec in `specs/`,
   - and ADR when architecture is affected.
3. Every cycle review must check:
   - `IDEAS.md` additions,
   - `PRIORITIES.md` phase shifts,
   - `ROADMAP.md` updates.
4. Architecture changes from triaged scope trigger:
   - C4 update in `docs/c4/`,
   - ADR update or a new ADR.

## Current Theme Coverage in Docs

- Product direction:
  - `docs/VISION.md`
  - `docs/JTBD.md`
  - `docs/ROADMAP.md`
- Domain language:
  - `docs/GLOSSARY.md`
- Architecture:
  - `docs/bounded-contexts.md`
  - `docs/c4/*`
  - `docs/adr/*`
- Delivery:
  - `specs/*`

## Operating Workflow

`IDEAS -> TRIAGE -> ROADMAP -> ADR/SPECS -> IMPLEMENTATION -> fix/* evidence`
