# SESSION_TERMINATION: Orchestra Developer Workspace

When the user says "end session", "save progress", or "wrap up", follow these steps **in order**:

## 1. Code Review & Sanity Check
- Review all files modified during this session for:
  - Syntax errors or incomplete code (trailing dots, missing semicolons, unclosed brackets)
  - Unused imports
  - Logical correctness (e.g., `return` inside loops that should be `push`, scoping issues)
  - Consistent naming conventions (camelCase for methods/variables)
  - Proper TypeScript typing (no unintentional `any`, correct return types)
- If any issues are found, **list them to the user** and fix them before proceeding.

## 2. Save Latest State of Work
- Update (or create) the **task.md** artifact with the current progress checklist:
  - Mark completed items with `[x]`
  - Mark in-progress items with `[/]`
  - Mark remaining items with `[ ]`
- Output a **progress summary** in this format:
  - **Completed Today:** [List of concepts understood or features built]
  - **Current Blocker/Focus:** [What I am currently stuck on or working on]
  - **Next Steps:** [What we should tackle in the next session]

## 3. Git Commit
- Stage all changes: `git add .`
- Show `git status` to the user for review before committing.
- Commit with a descriptive message following this pattern:
  - `feat(notion): <short description of what was built/changed>`
  - Example: `feat(notion): implement fetchBlockChildren and Zod schema validation`
- Push to the current branch.
