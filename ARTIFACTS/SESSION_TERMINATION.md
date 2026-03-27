# SESSION_TERMINATION: Orchestra Developer Workspace

When the user says "end session", "save progress", or "wrap up", follow these steps in order.

## 1. Scoped Sanity Check
Review only files modified in this session and only within my current scope.

Check for:
- syntax errors or incomplete code
- unused imports
- obvious logical issues
- inconsistent naming
- weak or incorrect TypeScript typing

Rules:
- Do not make large refactors during termination.
- Do not change unrelated files.
- If issues are found, list them first.
- Only fix issues automatically if they are small, local, and unambiguous.
- If a fix is non-trivial, report it as a blocker or next step instead of silently changing behavior.

## 2. Update Session State
Update `SESSION_PROGRESS.md` only.
Do not rewrite `SESSION_INITIALIZATION.md`.

`SESSION_PROGRESS.md` must contain:
- Completed Today
- Current Blocker/Focus
- Next Steps
- Temporary Decisions
- Relevant Files

Rules:
- Keep it concise and high-signal.
- Only include progress from the current session.
- Preserve still-valid items from the previous progress file.
- Remove stale or resolved blockers when appropriate.

## 3. Output End-of-Session Summary
After updating `SESSION_PROGRESS.md`, output a short summary in this format:
- Completed Today: ...
- Current Blocker/Focus: ...
- Next Steps: ...

## 4. Knowledge Capture (Project + Engineering Learning)
If this session produced genuinely new reusable knowledge, update only the relevant note files.

Possible files:
- `PROJECT_DOMAIN_NOTES.md`
- `TYPESCRIPT_NOTES.md`
- `NESTJS_NOTES.md`
- `SOFTWARE_ENGINEERING_NOTES.md`

File roles:
- `PROJECT_DOMAIN_NOTES.md`: project-specific and domain-specific knowledge, including integrations, workflow assumptions, schema/data mapping rules, external API behavior, and architectural decisions relevant to Orchestra.
- `TYPESCRIPT_NOTES.md`: TypeScript syntax, typing patterns, and language concepts learned in practice.
- `NESTJS_NOTES.md`: NestJS framework concepts, architecture, and usage patterns.
- `SOFTWARE_ENGINEERING_NOTES.md`: broader engineering principles, design reasoning, trade-offs, and reusable implementation patterns.

Rules:
- Add only new, non-duplicate knowledge.
- Keep notes concise, reusable, and concept-focused.
- Prefer append/update over full rewrite.
- Do not store temporary debugging noise.
- Only capture concepts that were actually encountered, discussed, debugged, or applied in the current session.

For framework/software-engineering notes, prioritize concepts such as:
- NestJS module/controller/service relationships
- dependency injection
- request flow
- validation strategy
- Zod purpose and usage
- async/await
- TypeScript typing patterns
- error handling
- separation of concerns
- architectural trade-offs relevant to the current work

Preferred note structure per concept:
- What it is
- Why it matters
- When to use it
- How it appears in this project
- Small example or syntax sketch
- Common mistakes

Only create or update a note when the concept was actually encountered, discussed, debugged, or applied in the current session.

## 5. Git Workflow (Only On Explicit User Request)
Do not automatically commit or push.

If and only if the user explicitly asks for git actions:
- stage only relevant files
- show `git status`
- suggest a clear commit message
- commit only after review
- push only if explicitly requested

Commit message pattern examples:
- `feat(notion): add schema fetch flow`
- `fix(notion): correct payload validation path`
- `docs(notes): update session progress and framework notes`