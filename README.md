# zod-collection-ui

Declare once, render anywhere. Define a Zod schema and get auto-generated table columns, form fields, filters, state management, and data provider — with zero configuration.

```typescript
import { z } from 'zod';
import { defineCollection, toColumnDefs, toFormConfig, toFilterConfig } from 'zod-collection-ui';

const products = defineCollection(z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: z.enum(['draft', 'active', 'archived']),
  price: z.number().min(0),
  tags: z.array(z.string()),
  createdAt: z.date(),
}));

// Auto-generated from the schema:
const columns = toColumnDefs(products);    // TanStack Table column defs
const form = toFormConfig(products);       // Form field configs (create/edit)
const filters = toFilterConfig(products);  // Filter panel configs
```

That's it. No annotations needed. The library infers that `id` is hidden, `name` is searchable, `status` is a select filter, `price` is a range filter, and `createdAt` is not editable — all from the Zod types and field names.

## Install

```bash
npm install zod-collection-ui zod
```

Requires Zod v4+.

## Why

Every schema-driven UI tool solves half the problem:

- **Form generators** (RJSF, AutoForm) handle data shape → form widgets, but not collections
- **Table libraries** (TanStack Table, AG Grid) handle column config → table features, but not forms
- **CRUD frameworks** (React Admin, Refine) handle both, but imperatively — not from a schema

`zod-collection-ui` bridges the gap: one Zod schema produces table columns, form fields, filter configs, state management, and a data provider interface. Headless — bring your own renderer.

## Features

- **Zero config**: A plain Zod schema produces a working collection with sensible defaults
- **4-layer inference**: Zod type → validation checks → field name heuristics → `.meta()` annotations
- **Headless**: Produces data structures, not React components — works with any framework
- **TanStack Table compatible**: `toColumnDefs()` outputs column definitions with sort/filter/group config
- **Form generation**: `toFormConfig()` outputs field configs for create and edit forms
- **Filter panels**: `toFilterConfig()` outputs filter configs with enum options and numeric bounds
- **State management**: `createCollectionStore()` produces framework-agnostic state + actions + selectors
- **Data provider**: `DataProvider<T>` interface with in-memory adapter for prototyping
- **AI-ready**: `toPrompt()` generates structured descriptions for LLM consumption
- **Custom operations**: Declare item/selection/collection actions with confirmation dialogs
- **TypeScript-first**: Full type inference from your Zod schema

## Quick Start

### Zero Config

```typescript
import { z } from 'zod';
import { defineCollection, toColumnDefs } from 'zod-collection-ui';

// Just a Zod schema — no annotations needed
const contacts = defineCollection(z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['customer', 'partner', 'lead']),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
}));

// The library auto-detects:
contacts.idField;                 // 'id'
contacts.labelField;              // 'name' (detected from name pattern)
contacts.getSearchableFields();   // ['name', 'email']
contacts.getGroupableFields();    // [{ key: 'role', ... }, { key: 'isActive', ... }]

// Generate table columns
const columns = toColumnDefs(contacts);
// → name: sortable, searchable
// → email: sortable, searchable, email widget
// → role: sortable, select filter, groupable
// → isActive: boolean filter, groupable
// → id, createdAt: auto-hidden/non-editable
```

### With Overrides

```typescript
const products = defineCollection(ProductSchema, {
  affordances: {
    bulkDelete: true,
    export: ['csv', 'json'],
    pagination: { defaultPageSize: 50 },
    defaultSort: { field: 'createdAt', direction: 'desc' },
  },
  fields: {
    name: { inlineEditable: true, columnWidth: 250 },
    status: { badge: { draft: 'secondary', active: 'default', archived: 'outline' } },
    price: { displayFormat: 'currency' },
    description: { detailOnly: true },
  },
  operations: [
    { name: 'archive', label: 'Archive', scope: 'item', confirm: true },
    { name: 'bulkArchive', label: 'Archive Selected', scope: 'selection' },
    { name: 'exportReport', label: 'Export', scope: 'collection' },
  ],
});
```

### With Zod `.meta()`

```typescript
const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().meta({
    title: 'Task Title',
    inlineEditable: true,
    summaryField: true,
  }),
  status: z.enum(['todo', 'in_progress', 'done']).meta({
    badge: { todo: 'secondary', in_progress: 'default', done: 'success' },
  }),
  priority: z.enum(['low', 'medium', 'high']).meta({
    badge: { low: 'ghost', medium: 'secondary', high: 'destructive' },
  }),
});
```

## API

### `defineCollection(schema, config?)`

Main entry point. Takes a Zod object schema and optional config, returns a `CollectionDefinition`.

```typescript
const collection = defineCollection(MySchema, {
  affordances?: CollectionAffordances,   // Collection-level capabilities
  fields?: Record<string, FieldAffordance>,  // Per-field overrides
  operations?: OperationDefinition[],    // Custom actions
  idField?: string,                      // Default: auto-detected
  labelField?: string,                   // Default: auto-detected
});
```

**Returns** a `CollectionDefinition` with:
- `schema` — The source Zod schema
- `affordances` — Resolved collection-level affordances
- `fieldAffordances` — Per-field affordances (inferred + merged)
- `operations` — Custom operations
- `idField` / `labelField` — Identity fields
- `getVisibleFields()` — Fields for table view
- `getSearchableFields()` — Fields for global search
- `getFilterableFields()` — Fields with filter config
- `getSortableFields()` — Sortable fields
- `getGroupableFields()` — Groupable fields
- `getOperations(scope)` — Operations by scope
- `describe()` — Human-readable description

### `toColumnDefs(collection)`

Generates TanStack Table-compatible column definitions.

```typescript
const columns = toColumnDefs(collection);
// Each column has: id, header, accessorKey, enableSorting, enableColumnFilter,
// enableGlobalFilter, enableGrouping, sortingFn, filterFn, size, meta
```

### `toFormConfig(collection, mode)`

Generates form field configurations for create or edit forms.

```typescript
const createFields = toFormConfig(collection, 'create');
const editFields = toFormConfig(collection, 'edit');
// Each field has: name, label, type, required, disabled, options, placeholder, helpText
```

### `toFilterConfig(collection)`

Generates filter panel configurations.

```typescript
const filters = toFilterConfig(collection);
// Each filter has: name, label, filterType, options (for enums), bounds (for ranges)
```

### `createCollectionStore(collection)`

Creates a framework-agnostic state factory with pure functions.

```typescript
const store = createCollectionStore<Product>(collection);

// Initial state (derived from collection affordances)
let state = store.initialState;

// Pure actions: (state, args) → newState
state = store.actions.setItems(state, products, totalCount);
state = store.actions.setSorting(state, [{ id: 'price', desc: true }]);
state = store.actions.setColumnFilters(state, [{ id: 'status', value: 'active' }]);
state = store.actions.setGlobalFilter(state, 'search term');
state = store.actions.selectAll(state);
state = store.actions.reset(state);

// Selectors
store.selectors.getSelectedItems(state);   // T[]
store.selectors.getSelectedCount(state);   // number
store.selectors.getPageCount(state);       // number
store.selectors.isAllSelected(state);      // boolean
store.selectors.getVisibleItems(state);    // T[] (current page)
```

Works with any state library:

```typescript
// With Zustand
const useStore = create(() => store.initialState);

// With React useReducer
const [state, dispatch] = useReducer(reducer, store.initialState);

// With plain variables
let state = store.initialState;
state = store.actions.setItems(state, data);
```

### `createInMemoryProvider(data, options?)`

Creates a `DataProvider<T>` backed by an in-memory array. Supports sorting, filtering, search, and pagination.

```typescript
const provider = createInMemoryProvider(products, {
  idField: 'id',           // default
  simulateDelay: 100,      // ms, for testing loading states
  searchFields: ['name'],  // default: all string fields
});

const { data, total } = await provider.getList({
  sort: [{ id: 'price', desc: true }],
  filter: [{ id: 'status', value: ['active'] }],
  search: 'widget',
  pagination: { page: 1, pageSize: 25 },
});

await provider.create({ name: 'New Product', ... });
await provider.update('id-123', { price: 29.99 });
await provider.delete('id-123');
await provider.deleteMany(['id-1', 'id-2']);
```

### `toPrompt(collection)`

Generates a structured markdown description for LLM/AI consumption.

```typescript
const prompt = toPrompt(collection);
// Returns markdown with: data shape table, capabilities, filter config,
// custom operations, and UI generation hints
```

## Inference Rules

The library infers affordances from four layers (later overrides earlier):

| Layer | Source | Example |
|-------|--------|---------|
| 1. Type | Zod type | `z.string()` → sortable, searchable, text filter |
| 2. Validation | Zod checks | `z.string().email()` → email widget |
| 3. Name | Field name | `createdAt` → not editable, range filter |
| 4. Meta | `.meta()` | `.meta({ sortable: false })` → override |

**Type defaults:**

| Zod Type | Sortable | Filterable | Searchable | Editable |
|----------|----------|------------|------------|----------|
| `string` | yes | search | yes | yes |
| `number` | yes | range | no | yes |
| `boolean` | yes | boolean | no | yes |
| `enum` | yes | select | no | yes |
| `date` | yes | range | no | yes |
| `array` | no | contains | no | yes |
| `object` | no | no | no | yes |

**Name heuristics:**

| Pattern | Inference |
|---------|-----------|
| `id`, `_id`, `uuid` | hidden, not editable, exact filter |
| `createdAt`, `created_at` | not editable, range filter |
| `updatedAt` | hidden, not editable |
| `password`, `secret`, `token` | hidden, not readable, not searchable |
| `email` | searchable, email widget |
| `name`, `title` | searchable, summary field |
| `description`, `notes` | textarea, truncated, not sortable |
| `status`, `state` | groupable, select filter |
| `imageUrl`, `avatar` | not sortable, not filterable |

## Field Affordances

Every field can declare these capabilities:

```typescript
interface FieldAffordance {
  // Query
  sortable?: boolean | 'asc' | 'desc' | 'both' | 'none';
  filterable?: boolean | 'exact' | 'search' | 'select' | 'multiSelect' | 'range' | 'contains' | 'boolean';
  searchable?: boolean;
  groupable?: boolean;
  aggregatable?: boolean | ('sum' | 'avg' | 'min' | 'max' | 'count')[];

  // CRUD
  editable?: boolean;
  inlineEditable?: boolean;
  immutableAfterCreate?: boolean;

  // Display
  visible?: boolean;
  hidden?: boolean;
  detailOnly?: boolean;
  summaryField?: boolean;
  columnWidth?: number;
  badge?: Record<string, string>;
  copyable?: boolean;
  truncate?: number;
  editWidget?: string;
  // ... and more
}
```

## Collection Affordances

```typescript
interface CollectionAffordances {
  create?: boolean;
  delete?: boolean;
  bulkDelete?: boolean;
  bulkEdit?: boolean | string[];
  search?: boolean | { debounce?: number; placeholder?: string };
  pagination?: boolean | { defaultPageSize?: number; style?: 'pages' | 'infinite' };
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  selectable?: boolean | 'single' | 'multi';
  export?: boolean | string[];
  views?: ('table' | 'grid' | 'list' | 'kanban')[];
  // ... and more
}
```

## Examples

Run the included examples:

```bash
npx tsx examples/01-basic-usage.ts      # Simplest usage
npx tsx examples/02-ecommerce-catalog.ts # Full pipeline with overrides
npx tsx examples/03-task-tracker.ts      # .meta() annotations, state management
npx tsx examples/04-zero-config.ts       # Zero config demo
```

## Design Philosophy

1. **Thin glue, not a framework.** ~1500 lines that reads Zod schemas and produces config objects for existing renderers.
2. **Convention over configuration.** A plain Zod schema produces a working collection — zero annotations needed.
3. **Escape hatches everywhere.** Any auto-generated config can be overridden per-field, per-collection, or per-view.
4. **Zod-native.** The schema IS the source of truth. Affordances are metadata ON the schema.
5. **Headless first.** Produces data structures, not React components. Renderers are separate.

## Background

This library fills a gap in the JS/TS ecosystem: no single library lets you declare both the **data shape** and the **available operations** (sort, filter, edit, bulk delete, search, create) in a unified schema that a renderer consumes.

The concept draws from [affordance theory](https://en.wikipedia.org/wiki/Affordance) (Gibson/Norman), [HATEOAS](https://en.wikipedia.org/wiki/HATEOAS), OData's [Capabilities Vocabulary](https://github.com/oasis-tcs/odata-vocabularies), and 30 years of [model-based UI development](https://www.w3.org/2007/uwa/editors-drafts/mbui/latest/Model-Based-UI-XG-FinalReport.html) research.

See the full [landscape analysis](https://github.com/thorwhalen/zod-collection-ui/blob/main/schema_affordance_ui_report.md) for details.

## License

MIT
