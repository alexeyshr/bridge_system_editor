# Domain Glossary

Last updated: 2026-03-07

This glossary is the canonical language for product docs, specs, and code naming.

## Bridge Domain

| Term | Definition |
| --- | --- |
| Auction | The ordered sequence of calls in the bidding phase. |
| Call | Any bid, Pass, Double (`X`), or Redouble (`XX`). |
| Contract bid | Level + strain call from `1C` to `7NT`. |
| Sequence | Full path of calls from root to a selected node. |
| Continuation | Next legal call(s) after a sequence. |
| Opener | Partner who made the opening bid. |
| Responder | Partner who responded to opener. |
| Rebid | Opener's second bid in context. |
| Forcing | Auction meaning that partner cannot pass. |
| No forcing (`NF`) | Bid is not forcing. |
| Invite (`INV`) | Invitational strength/action. |
| Forcing round (`F1`) | Forcing for one round. |
| Forcing game (`FG`) | Forces to game. |
| Slam try (`SL`) | Bid shows slam interest. |
| Accepted | Agreement is confirmed by partnership. |

## Product and Collaboration Domain

| Term | Definition |
| --- | --- |
| System | User-owned collection of bidding nodes and metadata. |
| Node | Single sequence state with meaning fields and children. |
| Section | User-defined left-panel grouping for systems or views. |
| Smart view | Saved dynamic filter over systems/nodes. |
| Owner | User with full control over a system. |
| Collaborator | User with granted role on a system. |
| Invite | Access grant request by email/internal lookup/Telegram. |
| Share link | Controlled URL for system access flow. |
| Draft | Locally cached unsynced editor state. |
| Published state | Server-persisted canonical system state. |

## Architecture and Process Domain

| Term | Definition |
| --- | --- |
| SDD | Spec-Driven Development workflow: spec -> plan -> tasks -> implementation evidence. |
| ADR | Architecture Decision Record with context, decision, consequences, and impacted specs. |
| Bounded context | Explicit domain boundary with its own model and language. |
| API-first | Design contracts before implementation details. |
| Modular monolith | Single deployable app with clear internal module boundaries. |
