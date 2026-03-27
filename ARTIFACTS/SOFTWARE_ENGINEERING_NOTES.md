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
