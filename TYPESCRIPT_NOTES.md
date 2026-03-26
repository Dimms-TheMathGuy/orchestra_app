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
