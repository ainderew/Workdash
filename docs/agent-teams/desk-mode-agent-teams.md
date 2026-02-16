# Desk Mode Agent Teams

Purpose:
- Organize implementation into isolated agent teams using packet IDs from `/Users/AndrewPinon/projects/workdash/docs/desk-mode-implementation-tasks.md`.
- Minimize context pollution by limiting each team to strict ownership boundaries.

## Team topology

### Team A: Contracts + Data Foundation
Owner scope:
- `desk-00-contracts`
- `desk-01-prisma-schema`
- `desk-02-chat-repos`

Primary repos:
- `/Users/AndrewPinon/projects/workdash-media-server`

Deliverables:
- Locked contracts/naming
- Prisma schema + migrations
- Chat repositories and domain services with transactional outbox write

Hard boundary:
- No socket wiring
- No frontend UI work

---

### Team B: Realtime Gateway + Interop
Owner scope:
- `desk-03-socket-read`
- `desk-04-socket-write`
- `desk-07-legacy-bridge`

Primary repos:
- `/Users/AndrewPinon/projects/workdash-media-server`

Deliverables:
- `chat:v2:*` socket read/write handlers
- Protocol negotiation (`chatProtocolVersion=1|2`)
- v1/v2 interoperability bridge (`sendMessage/newMessage` adapter-only)

Hard boundary:
- No DB model changes
- No broker implementation details beyond gateway integration points

---

### Team C: Delivery Reliability (Outbox + Broker + Ops)
Owner scope:
- `desk-05-outbox-worker`
- `desk-06-broker`
- `desk-12-reliability`

Primary repos:
- `/Users/AndrewPinon/projects/workdash-media-server`

Deliverables:
- Outbox worker
- NATS JetStream integration
- Publish/consume observability and alerts

Hard boundary:
- No frontend UI changes
- No room UX decisions

---

### Team D: Mode + Desk UI
Owner scope:
- `desk-08-mode-toggle`
- `desk-09-desk-shell`
- `desk-10-room-management`

Primary repos:
- `/Users/AndrewPinon/projects/workdash`

Deliverables:
- `2D Mode` / `Desk Mode` switch
- Desk layout shell and room management UI
- Room-scoped chat store and client wiring to `chat:v2:*`

Hard boundary:
- No media-server persistence logic
- No broker internals

---

### Team E: File Durability and Security
Owner scope:
- `desk-11-files`

Primary repos:
- `/Users/AndrewPinon/projects/workdash`
- `/Users/AndrewPinon/projects/workdash-media-server`

Deliverables:
- Upload-init endpoint + signed upload flow
- Attachment metadata persistence
- Client attachment compose/render with signed reads

Hard boundary:
- No unrelated UI refactors
- No mode-toggle logic

---

### Team F: Migration and Cutover
Owner scope:
- `desk-13-migration`

Primary repos:
- both

Deliverables:
- Feature-flag rollout plan execution
- Telemetry on v1 vs v2 adoption
- Controlled deprecation of legacy path

Hard boundary:
- No net-new feature scope

---

## Dependency graph

Sequential core:
1. Team A (`desk-00` -> `desk-01` -> `desk-02`)
2. Team B (`desk-03` + `desk-04`)
3. Team C (`desk-05` -> `desk-06`)
4. Team B (`desk-07`)

Parallel lanes after core contracts:
- Team D can start `desk-08` after `desk-00`.
- Team D starts `desk-09` after Team B provides stable read contracts.
- Team D starts `desk-10` after Team B write path is stable.
- Team E starts after Team A schema and Team B write contracts are stable.

Finalization:
- Team C reliability hardening (`desk-12`) can run in parallel with Team D/E integration finishing.
- Team F runs only after Team B/C/D/E MVP stability.

## Handoff contract (required for every packet)

Each team must write:
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/<packet-id>.md`

Template:
- Packet ID
- Branch name
- Files changed
- API/socket contract changes
- Migration or env changes
- Test/validation commands + results
- Risks and follow-ups

## Branch and PR conventions

- Branch naming: `codex/desk-<packet-id>-<short-desc>`
- One packet per PR.
- PR title prefix: `[desk:<packet-id>]`
- No cross-packet code in same PR unless explicitly declared as dependency fix.

## Definition of done (global)

For every packet:
1. Packet-specific done criteria satisfied.
2. Lint runs after each feature step.
3. At packet completion: `npm run lint` and `npm run build` in modified repo(s).
4. Handoff note committed.
5. No unrelated file drift introduced.

## Production messaging invariants (must not be violated)

- Persist-first: no emit before durable DB write.
- Message + outbox event in same transaction.
- Broker fanout from outbox events.
- Idempotency by `clientMessageId`.
- At-least-once with client/server dedupe.
- Room-scoped ordering.
- Reconnect backfill from DB.
- Legacy path is adapter-only to v2.

## Team kickoff prompts (copy/paste)

### Team A kickoff
"Implement packet `<id>` from `/Users/AndrewPinon/projects/workdash/docs/desk-mode-implementation-tasks.md`.
Only change files in Team A scope. Follow production messaging invariants in `/Users/AndrewPinon/projects/workdash/docs/desk-mode-architecture-plan.md`.
Write handoff to `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/<id>.md`."

### Team B kickoff
"Implement packet `<id>` from `/Users/AndrewPinon/projects/workdash/docs/desk-mode-implementation-tasks.md`.
Do not alter Prisma schema. Respect v1/v2 bridge adapter-only rule.
Write handoff to `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/<id>.md`."

### Team C kickoff
"Implement packet `<id>` from `/Users/AndrewPinon/projects/workdash/docs/desk-mode-implementation-tasks.md`.
Focus on outbox, broker, reliability metrics, and retry correctness.
Write handoff to `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/<id>.md`."

### Team D kickoff
"Implement packet `<id>` from `/Users/AndrewPinon/projects/workdash/docs/desk-mode-implementation-tasks.md`.
Only frontend mode/UI/store scope. Do not change backend persistence logic.
Write handoff to `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/<id>.md`."

### Team E kickoff
"Implement packet `<id>` from `/Users/AndrewPinon/projects/workdash/docs/desk-mode-implementation-tasks.md`.
Only file upload + attachment durability flow.
Write handoff to `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/<id>.md`."

### Team F kickoff
"Implement packet `<id>` from `/Users/AndrewPinon/projects/workdash/docs/desk-mode-implementation-tasks.md`.
Focus on migration telemetry, feature flags, and safe legacy deprecation.
Write handoff to `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/<id>.md`."
