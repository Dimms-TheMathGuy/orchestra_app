# PROJECT_DOMAIN_NOTES

## Integrations
- Gemini summary generation should use transcript text together with compact Notion database schema context, not transcript alone.

## Data Flow
- Current backend summary flow:
  1. Find transcript by `meetingId`
  2. Fetch child database schemas from selected Notion block/template
  3. Ask Gemini to generate grouped draft JSON
  4. Store drafts in backend memory
  5. Allow edit/cancel/approve per draft
  6. Sync only approved draft entries to the matching Notion database

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

## Architectural Decisions
- Approval is per draft, not per meeting, so one problematic database draft can be edited or cancelled without blocking the others.
- A regenerated meeting summary replaces the previous in-memory summary for the same `meetingId` instead of appending stale duplicates.

## Domain Constraints
- A single meeting can produce multiple drafts because one Notion template page can expose multiple child databases.
- Backend currently treats each database draft as an independent review item with its own lifecycle state.

## External API Behaviors / Gotchas
- Gemini output should be treated as untrusted text first, then parsed and validated as JSON before use.

## Open Questions
- When persistence is added, decide whether draft edits are saved as separate revision history or only latest state.
