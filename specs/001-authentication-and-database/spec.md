# Feature Specification: Persistent Multi-User Workspace

**Feature Branch**: `001-authentication-and-database`  
**Created**: 2026-03-07  
**Status**: Draft  
**Input**: User description: "Move from local file/localStorage flow to authenticated multi-user platform with automatic persistence and sharing, including Telegram auth and multi-channel invites"

## Architecture References

- ADR: `docs/adr/ADR-0001-api-first-modular-monolith.md`
- ADR: `docs/adr/ADR-0002-drizzle-trpc-default-stack.md`
- C4: `docs/c4/c1-context.mmd`
- C4: `docs/c4/c2-container.mmd`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Personal Workspace With Auto-Save (Priority: P1)

As a registered user (email/password or Telegram), I can sign in, create/edit my bidding systems, and all edits are saved automatically, so I never need a manual Save action.

**Why this priority**: This is the core product behavior required to replace the current local-only workflow.

**Independent Test**: Sign up/sign in via email/password and via Telegram, create a system, edit several nodes, refresh browser, sign out/in, verify latest data is restored from backend without manual export/import.

**Acceptance Scenarios**:

1. **Given** a new authenticated user with no systems, **When** user creates a new system, **Then** the system is persisted and visible after page reload.
2. **Given** an existing system, **When** user changes node fields (call, forcing, notes, HCP, flags), **Then** changes are auto-saved to backend and survive browser refresh.
3. **Given** temporary network outage, **When** user keeps editing, **Then** UI shows unsynced state and retries automatically after connectivity is restored.
4. **Given** a new user, **When** user selects Telegram authentication and successfully verifies, **Then** account/session are created and the editor opens.
5. **Given** a user already has an email/password account, **When** user links Telegram login in profile settings, **Then** both methods open the same workspace.

---

### User Story 2 - Sharing Systems With Other Users (Priority: P2)

As a system owner, I can share my system with other users with role-based access (viewer/editor) using email, in-app user search, or Telegram invite link, so collaboration is possible without exporting files.

**Why this priority**: Collaboration is a direct business requirement for multiple users.

**Independent Test**: Owner shares system via each channel (email, in-app search, Telegram), second account can open shared system, and permissions are enforced.

**Acceptance Scenarios**:

1. **Given** owner grants `viewer` access, **When** invited user opens the system, **Then** the system is readable and editing actions are disabled.
2. **Given** owner grants `editor` access, **When** invited user edits a node, **Then** changes are persisted and visible to owner after refresh.
3. **Given** user without access, **When** user requests a shared system API endpoint, **Then** API returns authorization error.
4. **Given** owner enters recipient email, **When** invite is sent, **Then** recipient gets invite link and can accept according to assigned role.
5. **Given** owner searches registered users in-app, **When** owner selects one and confirms role, **Then** access is granted immediately without external invite flow.
6. **Given** owner chooses Telegram share, **When** owner sends generated Telegram link, **Then** recipient can open invite and accept after authentication.

---

### User Story 3 - Legacy Import/Export As Advanced Tools (Priority: P3)

As a user migrating existing YAML data, I can import/export through an advanced menu, while day-to-day editing remains fully automatic.

**Why this priority**: Existing data must remain usable, but this is secondary to online persistence.

**Independent Test**: Import YAML into authenticated account, verify system is stored in DB; export produces valid YAML from DB state.

**Acceptance Scenarios**:

1. **Given** user has a valid YAML file, **When** user imports it from advanced tools, **Then** backend creates/updates a system and tree is rendered from stored data.
2. **Given** persisted DB system, **When** user exports, **Then** generated YAML reflects latest backend state and excludes pure UI-only flags.

---

### Edge Cases

- Two tabs editing the same system concurrently for the same user.
- Two different users editing the same shared system concurrently.
- Session expires while unsaved local queue exists.
- User attempts to access shared link after owner revoked permission.
- Incoming payload uses old `schemaVersion` after future migration.
- Telegram invite recipient is not yet registered in the platform.
- Telegram account is already linked to a different platform account.
- Telegram delivery channel is unavailable or blocked by platform restrictions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide authentication with `email + password`.
- **FR-002**: System MUST provide authentication with `Telegram`.
- **FR-003**: System MUST support linking Telegram identity to an existing account to avoid duplicate workspaces.
- **FR-004**: System MUST allow each authenticated user to create and manage multiple bidding systems.
- **FR-005**: System MUST persist bidding systems in a server database with a stored `schemaVersion`.
- **FR-006**: System MUST auto-save editable node changes to backend without requiring a manual Save button.
- **FR-007**: System MUST load the latest persisted system state automatically when user opens the app again.
- **FR-008**: System MUST show non-blocking sync state (`saving`, `saved`, `retrying`, `offline`) in UI.
- **FR-009**: System MUST retry failed save operations and preserve pending changes until successful sync.
- **FR-010**: System MUST enforce authorization checks on all system read/write API endpoints.
- **FR-011**: System MUST support sharing with roles `viewer` and `editor`.
- **FR-012**: System MUST support share initiation by: recipient email, in-app registered user search, and Telegram invite link.
- **FR-013**: System MUST provide user search endpoint scoped to registered users (privacy-safe, rate-limited).
- **FR-014**: System MUST track invite state (`pending`, `accepted`, `revoked`, `expired`) with audit metadata.
- **FR-015**: System MUST store audit metadata (`createdAt`, `updatedAt`, `updatedBy`) for systems and revisions.
- **FR-016**: System MUST support compatibility import/export tools under an advanced menu (not the primary editing flow).
- **FR-017**: System MUST keep existing core tree/card UI interactions functional after persistence migration.
- **FR-018**: System MUST support at least 500 concurrently active users and 1000 registered users within target performance bounds.
- **FR-019**: System MUST keep schema migration path explicit via `schemaVersion` and migration logic.

### Key Entities *(include if feature involves data)*

- **User**: Account identity with profile, credentials, and ownership of systems.
- **AuthAccount**: External identity mapping (`provider`, `providerAccountId`, `userId`) for Telegram linking.
- **BiddingSystem**: Top-level user-owned (or shared) dataset containing metadata and node graph state.
- **BiddingNode**: Sequence node with bidding context and meaning fields used by center tree and right detail card.
- **SystemShare**: Permission mapping (`systemId`, `userId`, `role`) that grants collaborative access.
- **ShareInvite**: Invite record with channel (`email`, `internal`, `telegram`), target identity, role, token, and status lifecycle.
- **SystemRevision**: Optional revision snapshot/change-log entry used for audit, conflict diagnostics, and recovery.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of node edit operations receive backend save confirmation within 2 seconds under normal network conditions.
- **SC-002**: In integration tests, edited data survives reload/session restart in at least 99.9% of runs.
- **SC-003**: Unauthorized read/write attempts to private systems are blocked in 100% of tested API cases.
- **SC-004**: System list + selected system load completes under 1500 ms p95 for accounts with up to 30 systems.
- **SC-005**: Manual Save is no longer required for primary editing workflow (verified by UX flow without save button usage).
- **SC-006**: 95% of invites created through email/in-app/Telegram are delivered as valid actionable links within 3 seconds (excluding third-party outages).
