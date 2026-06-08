## Per-Item Approval Instead of Batch Approval

### What it is
Designing a workflow so each generated item can be reviewed and approved independently instead of approving one big batch.

### Why it matters
Independent approval reduces blast radius. One bad draft should not block or corrupt other valid drafts.

### When to use it
Use this when one process produces multiple outputs with different quality, ownership, or readiness states.

### How it appears in this project
One meeting can create multiple Gemini drafts because one Notion template can contain multiple child databases. Each draft is now handled separately with its own `draftId` and `status`.

### Example / Syntax Sketch
```ts
type DraftStatus = 'pending' | 'approved' | 'cancelled';
```

### Common mistakes
- Approving all generated items in one action
- Not giving each item its own identifier
- Mixing review state for unrelated outputs

## Validate AI Output Before Using It

### What it is
Treating model output as untrusted input that must be parsed and validated before application logic uses it.

### Why it matters
LLM output can look correct while still violating shape rules. Validation protects downstream services and reduces hidden bugs.

### When to use it
Any time AI output feeds directly into structured backend logic, database writes, or external API calls.

### How it appears in this project
Gemini summary output is requested as JSON, parsed from text, then checked against a Zod schema before being used as draft data.

### Example / Syntax Sketch
```ts
const parsed = JSON.parse(rawText);
const validated = schema.safeParse(parsed);
```

### Common mistakes
- Trusting model output because the prompt "looked strict"
- Skipping runtime validation after `JSON.parse`
- Writing invalid AI output directly into another service

## Test the Decision Logic, Not Just the Build

### What it is
Using focused unit tests to verify important workflow decisions and state changes, not just syntax/build correctness.

### Why it matters
A green build only proves the code compiles. It does not prove the right draft is edited, cancelled, or approved.

### When to use it
Use this when a service contains branching behavior, status transitions, or coordination between multiple dependencies.

### How it appears in this project
Summaries tests now verify that:
- draft generation groups items per database
- editing one draft does not mutate others
- cancel affects only one draft
- approve syncs only the selected draft entries

### Example / Syntax Sketch
```ts
expect(service.findByMeeting(55)?.drafts[1].status).toBe('pending');
```

### Common mistakes
- Testing only the happy path
- Verifying output shape but not side effects
- Assuming build success means business logic is safe

## Approval Signal vs Final State

### What it is
Separating "someone approved this change" from "this change is now complete in the system".

### Why it matters
Approval is not the same as integration. A PR can be approved and still remain open, change again, or close without merge.

### When to use it
Use this when a workflow has multiple events that look positive, but only one of them is the true completion event.

### How it appears in this project
For GitHub -> Notion sync, `pull_request_review` approval is only a signal. The task should reach `DONE` only after the PR is merged into the configured `targetBranch`.

### Example / Syntax Sketch
```ts
approved !== merged
```

### Common mistakes
- Treating review approval as if code is already shipped
- Triggering downstream completion too early
- Forgetting that final state may depend on multiple events

## Latest State Per Actor Beats "Ever Happened"

### What it is
Evaluating workflow state using the latest event per actor instead of checking whether a positive event ever appeared in history.

### Why it matters
Historical positive events can become stale. A reviewer can approve first and later request changes; checking only "was there ever an approval?" gives the wrong answer.

### When to use it
Use this when the same actor can emit multiple state-changing events over time and only the newest one should count.

### How it appears in this project
GitHub PR approval logic now groups reviews by reviewer and uses the latest review state per reviewer before deciding whether a merged PR is truly approved.

### Example / Syntax Sketch
```ts
latestReviewByReviewer.set(reviewerId, newestReview);
```

### Common mistakes
- Using `.some(...)` over the full event history
- Ignoring event timestamps
- Treating old approval as if it still reflects the final review state

## Idempotent Provisioning on Read

### What it is
Running a "create if not exists" setup step inside a read endpoint rather than requiring an explicit setup call.

### Why it matters
Eliminates a separate onboarding step and ensures the system is always in a valid state, even for resources created before the feature existed.

### When to use it
When a feature requires associated records (channels, roles, config) that can be derived and created at low cost during normal reads.

### How it appears in this project
`ChatService.ensureChannels` is called inside `getChannels` and `getMessages`. Every call provisions any missing GENERAL/MANAGEMENT/TEAM channels using Prisma `upsert`. Existing channels are left unchanged (no-op `update: {}`).

### Example / Syntax Sketch
```ts
await prisma.chatChannel.upsert({
  where: { projectId_type_team: { projectId, type: 'GENERAL', team: null } },
  create: { projectId, type: 'GENERAL', team: null, name: 'General' },
  update: {},
})
```

### Common mistakes
- Calling setup in a write path only — existing resources created before the feature miss setup
- Not using upsert (running `findFirst + create` can race under concurrent requests)
- Doing expensive work on every read without the upsert no-op guarantee

## App-Layer ACL for External Services That Lack Fine-Grained Access Control

### What it is
Storing access-control metadata in your own database and enforcing it when serving data to the client, instead of relying on the external service's native access model.

### Why it matters
External services (Zoom, Slack, etc.) often expose meetings/rooms at the API level without per-user filtering. The app layer is the only place where custom authorization logic can be consistently applied.

### When to use it
When an external service doesn't support the access granularity you need, and you control the fetch path between the service and the client.

### How it appears in this project
`ProjectMeeting` stores `organizerTeam` and `allowedTeams[]` per Zoom meeting. `listProjectMeetings` fetches all Zoom meetings via API, then cross-references with the DB ACL table, filtering out meetings the caller shouldn't see. The Zoom API itself has no concept of team-based restrictions.

### Common mistakes
- Trusting the external service to enforce access rules it doesn't support
- Storing ACL in memory (lost on restart) instead of a persistent table
- Forgetting to handle the "no ACL record" case (must define a safe default — here, show to all)

## Manual DB Change vs Migration History

### What it is
Separating "the database schema was changed" from "the migration tool knows that the change was applied".

### Why it matters
Applying SQL manually can make the database correct while still leaving migration history out of sync, which later confuses Prisma status checks and teammates.

### When to use it
Use this concept when a normal migration command cannot run cleanly and you must apply SQL through a fallback path like `db execute`.

### How it appears in this project
The completion-mapping migration SQL was executed directly first, then Prisma migration history was synchronized with `migrate resolve --applied`.

### Example / Syntax Sketch
```bash
prisma db execute ...
prisma migrate resolve --applied <migration_name>
```

### Common mistakes
- Assuming `db execute` automatically marks the migration as applied
- Forgetting to re-sync Prisma history after a manual apply
- Confusing connectivity failures with SQL syntax failures
