# SESSION_PROGRESS

## Completed (this session)

### Batch 1 — UI polish
- Logo updated to `/Logo.png`, aspect ratio 2.1 (`Logo.tsx`)
- Sidebar collapse icons replaced: `PanelLeftClose` / `PanelLeftOpen` (was `ChevronLeft`/`ChevronRight`)
- Collapsed logo-mark is now a hover-expandable button (shows `PanelLeftOpen` icon on hover)
- AI Summary card added to meeting review page: "Generate Summary" → `POST /summaries/:meetingId/ai-summary` → overview paragraph + key decisions list
- Meeting review draft cards: form view by default, "Edit JSON" / "Form" toggle per card
- `extractPropValue` helper parses all Notion property types for the form view

### Batch 2 — Role system
- 13 default roles in 4-level hierarchy (PM → Board → Leads → Members) seeded per project
- Auto-seed for existing projects (idempotent: if no roles found, fetch owner and seed)
- Role claim request flow: member submits → PM approves/rejects → member role updated on approve
- PM approval panel in workspace members widget (amber, shows pending requests only — bug fixed this session)
- Email search with debounce + user preview card for add-member flow
- Members list grouped by role level with color badges, Crown/Shield icons

### Batch 3 — Channels + Zoom ACL
- `ChatChannel` model (GENERAL / MANAGEMENT / TEAM) + `ProjectMessage.channelId` nullable FK
- Channels auto-provisioned idempotently on every `getChannels` call (upsert pattern)
- Access control: GENERAL → all; MANAGEMENT → level ≤ 1; TEAM → same team (board always passes)
- Legacy messages (channelId=null) surfaced in GENERAL channel
- `ProjectMeeting` model stores ACL (organizerTeam, allowedTeams) per Zoom meeting
- Schedule modal: "Who can join?" toggle (whole project / my team only) + team invite pills
- `listProjectMeetings` cross-references Zoom API with local ACL; meetings from other projects hidden
- Zoom room page uses ACL-filtered endpoint; non-eligible users see "no access" empty state

### Batch 4 — Notion task stats + Link task to branch UI
- `NotionTask` model + migration `add_notion_tasks` (cached task snapshot: title, status, statusGroup, assigneeEmails/Names)
- `NotionService.queryDatabaseTasks()` — raw REST query (SDK v5 dropped `databases.query`), extracts title/status/people; `normalizeStatusGroup()` maps to todo/in_progress/done
- New `tasks` module: `POST /projects/:id/notion/sync-tasks`, `GET .../tasks`, `GET .../schema`
- Dashboard task cards (Active/Completed/In Progress) now count the user's real Notion tasks (assignee match by email, name fallback). Dashboard `tasks` keys renamed → `{ active, completed, inProgress }`
- GitHub widget in workspace: Activity / Tasks tab toggle; Tasks tab lists live branches (via new `GET /api/github/:id/branches`) with linked badges; "Link" opens a modal (pick Notion task, target branch, completion property+value from schema) → `POST /api/github/:id/task-branch-sync`

### Batch 5 — Auto-sync + per-branch task progress
- Background poller `TasksScheduler` (OnModuleInit + setInterval, no extra dep): syncs every project with a `notionDbId` every 5 min, isolated failures, overlap guard. Verified live: "Synced 1/1 projects".
- `NotionService.resolveDatabaseIds()` — fixes the real-data case where `notionDbId` is a **page** holding child databases (not a database). Sync now resolves → queries each child db → tags each task with its own `notionDatabaseId`.
- Schema endpoint is now per-database: `GET /projects/:id/notion/schema/:databaseId` (link form fetches the selected task's db schema).
- Branch list shows linked-task **title** + colored sync-state pill (Linked/In progress/In review/Done) and an **unlink** (X) button → new `DELETE /api/github/:id/task-branch-sync/:syncId`.

### Batch 6 — Bug fixes & polish
- **Chat "Failed to load channels" fix**: `ensureChannels` used `prisma.chatChannel.upsert()` with `team: null` in the composite unique `where` clause — Prisma throws at runtime ("Argument `team` must not be null") even though the TypeScript `null as any` cast silenced the type error. Fixed by replacing all three `upsert` calls with a `findMany` existence check + `createMany({ skipDuplicates: true })` pattern.
- **Logo size increase**: Sidebar expanded logo raised from `height={30}` → `height={44}` in `Sidebar.tsx`.

## Pending Next Steps
- (none queued). Future ideas: filter the link-task picker to task-like databases only; Notion webhook for true realtime; persist Notion assignee→Orchestra user mapping for name-based assignees.

## Current Status
- Backend running on :3000, frontend on :3001 (both restarted clean after the `add_notion_tasks` migration).
- Note: Notion assignee email is only available when the integration has "read user information including email" capability; name fallback covers the rest.
- Tasks must be synced (Tasks tab → "Sync tasks", or `POST sync-tasks`) before dashboard stats populate.

## Temporary Decisions
- GENERAL channel includes `channelId=null` (legacy) messages for backwards compatibility
- Zoom ACL is stored in `ProjectMeeting` table (not native Zoom ACL — Zoom doesn't support per-user participant filtering via API)
- Board (level ≤ 1) bypasses all channel and meeting ACLs
- Channel provisioning runs on every channel fetch (idempotent upsert, low cost)
- `teamForRole` returns `null` for management roles (PM, Tech Lead, Secretary) — they belong to no single team

## Relevant Files (this session)
- `backend/prisma/schema.prisma` — ProjectRole, RoleRequest, ChatChannel, ProjectMeeting, enums
- `backend/src/roles/roles.service.ts` — DEFAULT_ROLES, ROLE_TEAM, TEAM_LABEL, teamForRole, MemberContext, seed/request/review logic
- `backend/src/roles/roles.controller.ts`
- `backend/src/roles/roles.module.ts`
- `backend/src/chat/chat.service.ts` — canAccessChannel, ensureChannels, resolveChannel, channel-aware getMessages/sendMessage
- `backend/src/chat/chat.controller.ts` — channel routes
- `backend/src/chat/chat.module.ts`
- `backend/src/zoom/zoom.service.ts` — scheduleMeeting (ACL fields), canAccessMeeting, listProjectMeetings
- `backend/src/zoom/zoom.controller.ts` — GET /zoom/projects/:projectId/meetings
- `backend/src/zoom/zoom.module.ts`
- `backend/src/zoom/dto/schedule-meeting.dto.ts`
- `backend/src/projects/projects.service.ts` — seedProjectRoles call after createProject
- `backend/src/summaries/summaries.service.ts` — summarizeTranscript
- `backend/src/summaries/summaries.controller.ts` — POST /summaries/:meetingId/ai-summary
- `backend/src/gemini/gemini.service.ts` — quickSummarize (Groq, mock mode)
- `frontend/app/components/Logo.tsx`
- `frontend/app/components/Sidebar.tsx`
- `frontend/app/(dashboard)/workspace/[projectId]/page.tsx` — role system UI, meetings ACL, email search
- `frontend/app/(dashboard)/workspace/[projectId]/chat/page.tsx` — channel sidebar UI
- `frontend/app/(dashboard)/workspace/[projectId]/zoom/[meetingId]/page.tsx` — ACL endpoint
- `frontend/app/(dashboard)/workspace/[projectId]/meeting-result-review/page.tsx` — AI summary card, form view

## Previously Completed (carried forward)
- Auth, Zoom, AI Note Taker, GitHub → Notion integrations (demo-ready)
- Groq migration for Gemini service (P11 done)
- All P0–P8 tasks from initial session
- P10: Zoom webhook → auto pipeline
