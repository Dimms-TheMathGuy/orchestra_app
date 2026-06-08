# PROJECT_DOMAIN_NOTES

## Integrations
- Gemini summary generation should use transcript text together with compact Notion database schema context, not transcript alone.
- GitHub should act as the source of truth for code state, while Orchestra backend acts as the decision layer before updating Notion task state.

## Data Flow
- Current backend summary flow:
  1. Find transcript by `meetingId`
  2. Fetch child database schemas from selected Notion block/template
  3. Ask Gemini to generate grouped draft JSON
  4. Store drafts in backend memory
  5. Allow edit/cancel/approve per draft
  6. Sync only approved draft entries to the matching Notion database
- Planned GitHub -> Notion task sync flow:
  1. Link one Notion task page to one GitHub branch
  2. Store mapping in backend DB as `TaskBranchSync`
  3. Receive GitHub webhook events in backend
  4. Compute sync state from branch/PR/review events
  5. Update Notion task page only after backend validates final conditions

## Schema / Payload Rules
- Gemini summary output should be grouped per Notion database, not as one generic summary blob.
- Each draft group contains `databaseId`, `title`, and `entries`.
- Each entry contains only `properties`.
- Draft update payload uses:
```ts
{
  entries: [
    { properties: { Name: 'Example' } }
  ]
}
```
- `TaskBranchSync` is keyed by:
  - `notionTaskPageId`
  - `repoId + branchName`
- For GitHub-linked Notion tasks with user-defined templates, completion cannot be hardcoded. The mapping must store:
  - `completionPropertyName`
  - `completionPropertyType`
  - `completionValue`
  so backend can build the correct Notion update payload at runtime.

## Architectural Decisions
- Approval is per draft, not per meeting, so one problematic database draft can be edited or cancelled without blocking the others.
- A regenerated meeting summary replaces the previous in-memory summary for the same `meetingId` instead of appending stale duplicates.
- For GitHub sync MVP, one Notion task page maps to one active GitHub branch.
- `pull_request_review` is only an approval signal; task completion should still depend on final merge conditions.

## Domain Constraints
- A single meeting can produce multiple drafts because one Notion template page can expose multiple child databases.
- Backend currently treats each database draft as an independent review item with its own lifecycle state.
- A Notion database is only the container; the actual sync target for GitHub task tracking is the Notion task page (database row), not the database itself.
- `targetBranch` should default to `main`, but task completion should use the configured target branch instead of assuming only one branch forever.

## External API Behaviors / Gotchas
- Gemini output should be treated as untrusted text first, then parsed and validated as JSON before use.
- GitHub `pull_request_review` approval does not mean the PR has been merged.
- GitHub `issue_comment` is a conversation/comment event, not a formal approval signal.
- GitHub webhook requests should be verified with the repository webhook secret and raw request body before event processing.
- Notion `pages.update(...)` targets an existing task page directly by `page_id`; the payload shape depends on the Notion property type (`checkbox`, `status`, `select`, etc.).
- Supabase direct database host may be unreachable from some local networks; in this project, the session pooler connection string can be a more practical development connection path.

## Role System (Batch 2)
- 13 default roles in a 4-level hierarchy: 0 = PM, 1 = Board (Tech Lead, Secretary), 2 = Team Leads, 3 = Members.
- `ROLE_TEAM` map in `roles.service.ts` links each role name to a team key (`frontend`, `backend`, `qa`, `design`, `devops`) or `null` for management roles.
- `TEAM_LABEL` map converts team keys to display names.
- `MemberContext` is the resolved runtime identity of a user within a project: `{ isMember, isOwner, level, team, roleName }`.
- Project owner always has `level = 0` even if the PM role record is absent (fallback in `getMemberContext`).
- `getPendingRequests` must filter by `status: 'PENDING'` — fetching all requests pollutes the approval UI with already-reviewed items.
- Roles are seeded idempotently on project creation and lazily for existing projects the first time `getProjectRoles` is called.

## Channel System (Batch 3)
- Three channel types: `GENERAL` (all members), `MANAGEMENT` (level ≤ 1 only), `TEAM` (team members + board).
- Channels are provisioned via `ensureChannels`, called on every `getChannels` or `getMessages` call. Uses Prisma `upsert` — safe to call repeatedly.
- Team channels are created dynamically based on which teams are represented in current member roles. A team channel is not created until at least one member has a role in that team.
- Legacy messages (`channelId = null`) surface in the GENERAL channel via an `OR` query. This keeps old chat history accessible without migration.
- Unique constraint: `[projectId, type, team]` where `team` is `null` for GENERAL/MANAGEMENT.

## Zoom ACL (Batch 3)
- Zoom's API does not support per-user participant filtering natively. ACL is implemented in the app layer via the `ProjectMeeting` table.
- `ProjectMeeting` stores: `organizerTeam`, `allowedTeams[]`, `hostUserId`. The Zoom `meetingId` is the join key.
- `listProjectMeetings` fetches live Zoom meeting list then cross-references with `ProjectMeeting` records. Meetings not claimed by the current project are hidden.
- Board members (level ≤ 1) bypass all meeting ACL — they can always join any meeting in their projects.
- If a meeting has no `organizerTeam`, it is treated as project-wide and visible to all members.

## Notion Task Sync (Batch 4)
- `Project.notionDbId` is NOT guaranteed to be a database id — in practice it often holds a **page/block id** that *contains* child databases (the AI Note Taker template pattern). Querying it directly as a database returns a Notion 400: "Provided ID … is a page, not a database."
- `NotionService.resolveDatabaseIds(id)` handles both: tries `GET /databases/{id}`; on failure lists `blocks.children` and collects `child_database` ids. Task sync queries every resolved database and tags each task with its own `notionDatabaseId`.
- A single template page can mix database kinds (e.g. "Tasks", "bugs and Report", "Meeting Summaries"). Sync pulls rows from all of them; non-task rows (no assignee) simply never match a user, so they don't inflate per-user stats — but they DO appear in the link-to-branch task picker.
- Notion SDK v5 removed `databases.query`; query via the REST endpoint `POST /v1/databases/{id}/query` pinned to `Notion-Version: 2022-06-28`.
- Assignee matching: the integration must have the "read user information including email" capability for `people.person.email` to be populated in query results. This project's integration HAS it (`GET /v1/users` returns emails), so dashboard stats match by Notion assignee email → Orchestra `user.email`, with `assigneeNames` as a fallback.
- The completion-property schema differs per child database, so the link-to-branch form fetches the schema of the *selected task's* `notionDatabaseId`, not a single project-wide schema.

## Open Questions
- When persistence is added, decide whether draft edits are saved as separate revision history or only latest state.
- At merge time, should approval be trusted from stored local state or re-validated from GitHub API?
