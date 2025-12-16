# Module: src/runtime/scope.mjs

**Purpose:** Hierarchical scope management for named bindings.

## Exports

```javascript
export class Scope {
  constructor(parent?: Scope)
  define(name: string, value: any): void    // Throws if exists
  set(name: string, value: any): void       // Define or update
  get(name: string): any | undefined
  has(name: string): boolean
  delete(name: string): boolean
  child(): Scope
  localNames(): string[]
  allNames(): string[]
  entries(): Iterator
  size: number
  clear(): void
}
```

## Dependencies

None.

## Test Cases

- Define and retrieve bindings
- Child scope inherits parent bindings
- Local vs inherited name resolution
