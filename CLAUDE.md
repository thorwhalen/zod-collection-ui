# CLAUDE.md — zod-collection-ui

## What This Is

`zod-collection-ui` — Schema-driven collection UIs from Zod. Declare a Zod schema,
get auto-generated table columns, form fields, filters, state management, and data providers.

- **npm**: `zod-collection-ui`
- **GitHub**: `thorwhalen/zod-collection-ui`
- **Version**: 0.0.1

## Project Structure

```
src/                    # Core headless library (published to npm)
  types.ts              # FieldAffordance, CollectionAffordances, OperationDefinition
  inference.ts          # Zod type → affordance inference (4-layer engine)
  collection.ts         # defineCollection() — main entry point
  generators.ts         # toColumnDefs, toFormConfig, toFilterConfig
  store.ts              # createCollectionStore() — pure-function state
  data-provider.ts      # DataProvider<T> interface + createInMemoryProvider
  prompt.ts             # toPrompt() — AI-consumable description
  index.ts              # Barrel exports
tests/                  # Vitest test suites (173 tests)
examples/               # 4 runnable .ts examples (npx tsx examples/01-basic-usage.ts)
demo/                   # React + shadcn/ui + TanStack Table demo app (npm run dev)
docs/                   # Design docs, taxonomy, roadmap
.github/workflows/      # CI (test on push/PR) + publish (on v* tags)
```

## Commands

```bash
npm test              # Run all 173 tests (vitest)
npm run typecheck     # Type-check without emitting
npm run build         # Compile src/ to dist/
npm run test:watch    # Vitest watch mode

# Examples
npx tsx examples/01-basic-usage.ts
npx tsx examples/04-zero-config.ts

# Demo app
cd demo && npm run dev    # Starts at http://localhost:5173

# Publishing (CI handles npm publish automatically)
# Bump version in package.json, then:
git tag v0.x.x && git push origin v0.x.x
```

## Architecture Rules

1. **Headless first**: Core produces data structures (ColumnConfig[], FormFieldConfig[],
   FilterFieldConfig[]), NEVER React components. Renderers are separate.

2. **Pure-function state**: `createCollectionStore()` returns `(state, args) → newState`
   functions. No Zustand, no Redux, no framework dependency.

3. **Convention over configuration**: A plain Zod schema with zero annotations produces
   a fully-functional collection. `.meta()` and config overrides are opt-in.

4. **4-layer inference** (in order of priority, last wins):
   - Zod type defaults (string → searchable, number → range filter, etc.)
   - Validation refinements (`.email()` → email widget, `.int()` → integer input)
   - Name heuristics (field named `id` → hidden, `createdAt` → read-only, etc.)
   - Explicit `.meta()` annotations and config overrides

5. **Escape hatches everywhere**: Any auto-inferred affordance can be overridden via
   `config.fields` or `.meta()`.

6. **DataProvider interface**: All data access goes through the 7-method interface
   (getList, getOne, create, update, updateMany, delete, deleteMany).

## Zod v4 Gotchas

These have burned us before. Always remember:

- **Schema introspection**: Use `(schema as any)._zod.def` — NOT `_def` (Zod v3 API).
- **Enum values**: `def.entries` is an object `{key: value}`, NOT `def.values` (array).
- **Reading metadata**: `.meta()` called with no args returns the metadata object.
- **Import extensions**: Source files use `.js` extensions in imports (`'./types.js'`)
  because the project uses `"type": "module"` with TypeScript.

## Testing Conventions

- Framework: Vitest with globals (`describe`, `it`, `expect` — no imports needed)
- Test files: `tests/<module>.test.ts` — mirrors `src/<module>.ts`
- Run: `npm test` (CI mode) or `npm run test:watch` (dev mode)

## Publishing Protocol

1. Bump version in `package.json`
2. Commit: `git commit -m "Bump version to 0.x.x"`
3. Tag: `git tag v0.x.x`
4. Push: `git push origin main && git push origin v0.x.x`
5. CI runs tests → publishes to npm automatically

## Design Philosophy

- **Thin glue, not a framework** — ~1000 lines of TypeScript that reads Zod schemas
  and produces configuration objects for existing renderers.
- **Single source of truth** — The Zod schema IS the data model. Affordances are
  metadata ON the schema, not a parallel definition.
- **AI-friendly** — `toPrompt()` makes collections discoverable by LLM agents.
  Same affordance mechanism for human UI and agent integration.
