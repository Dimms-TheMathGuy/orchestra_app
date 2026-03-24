# Task Progress

## Completed
- [x] Added mentor-only and quota-efficiency rules to `SESSION_INITIALIZATION.md`.
- [x] Added AI note taker rules to `APP_SPECIFICATION.md`.
- [x] Confirmed Notion rich text uses `plain_text` and schema context must be compacted before Gemini.
- [x] Wired `SummariesService` to pull transcript + Notion schema context before calling Gemini.
- [x] Exported `NotionService` from `NotionModule` so it can be injected into `SummariesService`.
- [x] Updated Gemini prompt to include schema context for AI note taker behavior.

## In Progress
- [/] Finalizing the AI note taker contract between transcript, schema context, Gemini draft output, and approval flow.
- [/] Tuning the schema budget threshold for Gemini input size.

## Next
- [ ] Add draft validation for Gemini output shape.
- [ ] Make the AI note taker flow produce structured JSON instead of generic summary text.
- [ ] Add approval/sync separation before Notion write-back.
