# NestJS Notes

## Controller Route Parameters and Body Extraction

### What it is
NestJS uses decorators like `@Param()` and `@Body()` to pull values from the incoming HTTP request into controller method arguments.

### Why it matters
This keeps request parsing explicit and makes route contracts easy to read.

### When to use it
Use `@Param()` for values in the URL path and `@Body()` for JSON payload data sent in the request body.

### How it appears in this project
The summaries flow uses:
- `@Param('meetingId')` to identify the meeting
- `@Param('draftId')` to target one draft
- `@Body('blockId')` or validated `@Body()` payloads for request data

### Example / Syntax Sketch
```ts
@Post(':meetingId/drafts/:draftId/approve')
approve(@Param('meetingId') id: string, @Param('draftId') draftId: string) {}
```

### Common mistakes
- Putting all inputs into the URL even when some are request payload
- Forgetting to convert string route params to numbers when needed
- Hiding too much request parsing inside service code

## Service as the Workflow Owner

### What it is
In NestJS, the controller should stay thin and delegate business logic to a service.

### Why it matters
This keeps HTTP concerns separate from workflow logic and makes unit testing easier.

### When to use it
Whenever a feature contains validation, state changes, integration calls, or multi-step logic.

### How it appears in this project
`SummariesController` only forwards route data. `SummariesService` owns:
- generate draft flow
- per-draft approval
- per-draft edit
- per-draft cancel

### Example / Syntax Sketch
```ts
return this.summaries.approveDraft(Number(id), draftId);
```

### Common mistakes
- Writing business logic directly inside controller methods
- Letting controller and service both mutate the same workflow state
- Mixing transport validation and domain logic in one place

## Testing with Mocked Providers

### What it is
Nest testing modules let you provide fake dependencies so one service can be tested in isolation.

### Why it matters
This makes tests faster and more focused because they do not depend on real external APIs or full module wiring.

### When to use it
Use mocked providers when a service depends on integrations like Gemini, Notion, or another internal service.

### How it appears in this project
`SummariesService` tests replace:
- `GeminiService`
- `TranscriptsService`
- `NotionService`

with `jest.fn()` mocks so the test can focus only on draft workflow behavior.

### Example / Syntax Sketch
```ts
{ provide: NotionService, useValue: { createPage: jest.fn() } }
```

### Common mistakes
- Accidentally testing the mock setup instead of real service behavior
- Forgetting to assert important dependency calls
- Pulling in the full app module for a small unit test
