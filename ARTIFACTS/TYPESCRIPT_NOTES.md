# TypeScript Notes

## Optional Property
```ts
type Item = {
  label?: string;
};
```
- `?` means the property may be missing.

## Optional Chaining
```ts
const title = schema.title?.[0]?.plain_text;
```
- `?.` safely reads nested values without crashing on `null` or `undefined`.

## Nullish Coalescing
```ts
const safeTitle = title ?? '';
```
- `??` uses the fallback only when the left side is `null` or `undefined`.

## `unknown` vs `any`
```ts
function readValue(value: unknown) {}
```
- `unknown` is safer because TypeScript makes you narrow it before using it.
- `any` skips type safety.

## Object Entries
```ts
const pairs = Object.entries({ a: 1, b: 2 });
```
- `Object.entries()` turns an object into `[key, value]` pairs.

## String Literal Union Type
```ts
type DraftStatus = 'pending' | 'approved' | 'cancelled';
```
- This creates a type that only allows a small fixed set of string values.
- Useful when a value is really a state machine, not any random string.

## Type Intersection with `&`
```ts
type MeetingDraft = GeneratedDatabaseDraft & {
  draftId: string;
  status: DraftStatus;
};
```
- `&` combines two object types into one.
- Think of it like taking an existing `struct` and adding extra fields without rewriting the whole shape.

## `Record<string, unknown>`
```ts
type DraftEntry = {
  properties: Record<string, unknown>;
};
```
- `Record<string, unknown>` means "an object with string keys and values I do not fully know yet".
- This is safer than `any` when the shape is dynamic but still object-like.

## `z.infer<typeof schema>`
```ts
const userSchema = z.object({ name: z.string() });
type User = z.infer<typeof userSchema>;
```
- `z.infer` creates a TypeScript type directly from a Zod schema.
- This keeps runtime validation and static typing in sync, so you do not define the same shape twice.

## Narrowing with `'key' in object`
```ts
if ('error' in result) {
  return result;
}
```
- This pattern helps TypeScript narrow a union based on whether a property exists.
- Useful when one function may return either success data or an error-shaped object.
