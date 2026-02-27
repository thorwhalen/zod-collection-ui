# zod-collection-ui — Roadmap

## Where We Are

**Published**: `zod-collection-ui@0.0.1` on npm and GitHub.

### Core Library (Phase 1 + 2) — COMPLETE

The headless engine is solid: 173 tests, 8 source modules, 4 runnable examples.

| Module | What it does |
|--------|-------------|
| `types.ts` | 40+ affordance properties across field, collection, and operation levels |
| `inference.ts` | 4-layer inference: Zod type → validation refinements → name heuristics → `.meta()` |
| `collection.ts` | `defineCollection()` — the single entry point that resolves everything |
| `generators.ts` | `toColumnDefs()`, `toFormConfig()`, `toFilterConfig()` — headless configs |
| `store.ts` | `createCollectionStore()` — pure-function state management (no framework dependency) |
| `data-provider.ts` | `DataProvider<T>` interface + `createInMemoryProvider()` |
| `prompt.ts` | `toPrompt()` — structured AI-consumable collection description |
| `index.ts` | Barrel exports |

The zero-config story works: pass a plain Zod schema with no annotations, get a fully-functional
collection definition with auto-detected ID/label fields, sortable/filterable/searchable columns,
create/edit forms, and filter panels.

### Demo App (Phase 3) — COMPLETE (proof of concept)

A Vite + React + shadcn/ui + TanStack Table demo at `demo/` renders the headless configs as
real interactive UI. Three tabbed demos:

- **Contacts** — zero config, everything inferred
- **Tasks** — `.meta()` annotations, colored badges, custom operations
- **Products** — explicit overrides, currency formatting, star ratings

Working features: sorting, search, filtering, pagination, row selection, create/edit forms,
bulk actions, badge rendering.

### CI/CD — COMPLETE

- GitHub Actions CI: typecheck + test + build on push/PR (Node 20, 22)
- Publish workflow: test → publish on version tags (`v*`)
- npm automation token in GitHub secrets

---

## What Lies Ahead

### Near-term: Polish and Harden (v0.1.0)

**Goal**: Make the library reliable enough for early adopters.

1. **Fix the demo → extract renderer components**
   - The `demo/src/components/collection/` components are good enough to extract into a
     reusable pattern, but currently coupled to the demo app via Vite aliases.
   - Decision: keep as a demo for now, or create a `@zod-collection-ui/react` package?
   - Lean toward: keep as demo, document the pattern, let users copy what they need.

2. **Inline editing**
   - The `inlineEditable` affordance is declared but not rendered in the demo.
   - Implementation: click-to-edit cells in CollectionTable, backed by `provider.update()`.
   - This is the most impactful missing feature — it's what makes data grids feel alive.

3. **Custom operation handlers**
   - Operations currently log to console. Need an `onOperation` callback prop.
   - Wire up to the DataProvider for state-changing operations (mark done, archive, etc.).

4. **Server-side data provider adapters**
   - REST adapter: `createRestProvider({ baseUrl, idField, transform })`.
   - The interface is already defined — just need implementations.
   - This unlocks real-world usage beyond prototyping.

5. **Error boundaries and edge cases**
   - Empty states, loading skeletons, error recovery.
   - Large datasets (virtual scrolling via TanStack Virtual).
   - Date handling (timezone-aware formatting, date picker vs. native input).

6. **Documentation improvements**
   - API reference generated from TSDoc comments.
   - "Build your own renderer" guide showing how to consume the headless configs.
   - Migration guide for React Admin / Refine users.

### Medium-term: Feature Completeness (v0.2.0 – v0.5.0)

7. **Export/Import**
   - The `export` affordance is declared in types but not implemented.
   - CSV, JSON, and clipboard export from current view (respecting filters/sort).
   - CSV import with column mapping preview.

8. **Saved views and filter presets**
   - `filterPresets` is in the type system but not rendered.
   - Saved views: persist column visibility, sort order, filters, page size.
   - Shareable via URL query params or JSON serialization.

9. **Keyboard shortcuts**
   - The taxonomy defines keyboard shortcuts as a cross-cutting concern.
   - Common: Ctrl+N (create), Delete (delete selected), Ctrl+F (focus search),
     arrow keys (navigate rows), Enter (edit), Escape (cancel).

10. **Column pinning, reordering, and resizing**
    - All declared in the type system (`pinned`, `columnOrder`, `columnResize`).
    - TanStack Table supports all of these natively.

11. **View modes beyond table**
    - `views: ['table', 'kanban', 'list', 'grid']` is in the type system.
    - Kanban: group by an enum field, render as columns with drag-and-drop.
    - List: simplified single-column view for mobile.
    - Grid: card-based layout.

12. **Grouping and aggregation**
    - `groupable` and `aggregatable` affordances exist.
    - TanStack Table has built-in grouping support.
    - Render group headers with aggregate values (sum, count, avg).

### Long-term: Ecosystem (v1.0.0+)

13. **Renderer registry (JSON Forms pattern)**
    - Tester-based component dispatch: `(fieldSchema, meta) → priority → component`.
    - Allows custom renderers per field type without forking the library.
    - Multiple renderer sets: shadcn, MUI, Ant Design.

14. **GraphQL / Supabase / Firebase data providers**
    - The `DataProvider<T>` interface is deliberately simple to implement.
    - Community-contributed adapters for popular backends.

15. **Real-time and optimistic updates**
    - WebSocket/SSE subscription for live data.
    - Optimistic UI with rollback on failure.
    - Cursor-based pagination for infinite scroll.

16. **`zod-affordances` umbrella**
    - Once we grow beyond collections: form affordances, navigation affordances,
      permission affordances.
    - The core insight — declare capabilities on the schema, infer UI — applies broadly.

17. **AI agent integration**
    - `toPrompt()` already generates structured descriptions for LLMs.
    - Next: let an AI agent discover and invoke operations via the affordance schema.
    - HATEOAS for AI: the collection tells the agent what it can do.

---

## Tentative Roadmap

| Version | Milestone | Key Deliverables |
|---------|-----------|-----------------|
| **0.0.1** | Initial release (DONE) | Core library, demo app, CI/CD, npm publish |
| **0.1.0** | Polish | Inline editing, operation handlers, REST provider, docs |
| **0.2.0** | Feature-complete table | Export, saved views, keyboard shortcuts, column config |
| **0.3.0** | View modes | Kanban, list, grid views |
| **0.5.0** | Grouping & aggregation | Group headers, aggregate values, multi-sort |
| **0.8.0** | Renderer registry | Pluggable component dispatch, MUI renderer |
| **1.0.0** | Stable | Full API stability, comprehensive docs, real-world adapters |

---

## Design Tensions to Resolve

### Headless vs. Batteries-included
The core library is headless (data structures, not components). The demo shows how to render them.
The question: should we ship React components as part of the package, or keep them in a separate
`@zod-collection-ui/react` package? Arguments both ways:
- **Separate**: cleaner separation, no React dependency in core, multiple renderer sets possible.
- **Together**: easier adoption, one `npm install`, the demo components are "good enough".
- **Current lean**: separate. The demo proves the pattern; a renderer package can follow.

### Convention depth vs. explicit config
The zero-config inference is powerful but opaque. When a field named `description` is auto-hidden
from the table (because of the `DESCRIPTION_PATTERNS` heuristic), that's magic. Some users love it,
some hate it. Options:
- **Debug mode**: `defineCollection(schema, { debug: true })` that logs all inference decisions.
- **Explain API**: `collection.explain('description')` → "Hidden because name matches DESCRIPTION_PATTERNS".
- **Current lean**: add an `explain()` method in the next version.

### Form validation: Zod-native or form-library-native?
The `FormFieldConfig` has `required`, `disabled`, etc. But the original Zod schema has richer
validation (min/max, regex, email). Options:
- Pass the original Zod schema to `zodResolver()` (react-hook-form pattern).
- Extract validation rules into `FormFieldConfig` and let the renderer decide.
- **Current lean**: both. The schema is available on `collection.schema` for native Zod validation.
  `FormFieldConfig` carries display-level hints. Renderers can choose which to use.

### State management: pure functions vs. Zustand
The store uses pure functions `(state, args) → newState`. This is maximally portable but
verbose to wire into React. Options:
- Ship a `useCollectionStore()` Zustand hook.
- Ship a `useCollection()` React hook (which the demo already has).
- **Current lean**: the demo's `useCollection` hook is the reference integration. Extract and publish it.
