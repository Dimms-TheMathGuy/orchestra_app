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

## Open Questions
- When persistence is added, decide whether draft edits are saved as separate revision history or only latest state.
- At merge time, should approval be trusted from stored local state or re-validated from GitHub API?
