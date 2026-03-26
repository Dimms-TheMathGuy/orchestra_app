# Notion API Notes

## Response Shape Notes
- `RichTextItemResponse` includes `plain_text`, which is the readable string form of a rich text item.
- Database retrieval responses can be partial or full depending on the endpoint and SDK type.
- In the installed SDK types, `GetDatabaseResponse` can be a union of partial and full database responses.

## Schema Context Notes
- `fetchBlockChildren()` can be used to discover child databases under a page/block.
- Raw Notion responses should be normalized before sending to Gemini.
- Compact schema context should keep only:
  - database ID
  - title
  - property names
  - property types
  - select/status option labels when needed

## Gotchas
- Do not assume every response has every field.
- Use optional chaining when reading nested text fields.
- Prefer compact schema data for AI prompts to avoid token waste.
