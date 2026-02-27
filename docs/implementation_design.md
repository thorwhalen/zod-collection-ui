# Implementation Design: Collection Affordance Schema Toolkit

## Library Name: `zod-collection-ui`

**Tagline**: Declare once, render anywhere — schema-driven collection UIs from Zod + affordance metadata.

---

## 1. DESIGN PHILOSOPHY

1. **Thin glue, not a framework.** ~500-1000 lines of TypeScript that reads Zod schemas + affordance metadata and produces configuration objects for existing renderers (TanStack Table, AutoForm, shadcn/ui).

2. **Convention over configuration.** Sensible defaults for everything. A plain `z.object({ name: z.string(), age: z.number() })` should produce a working table with sorting and filtering — zero affordance annotations needed.

3. **Escape hatches everywhere.** Any auto-generated configuration can be overridden at any level: per-field, per-collection, per-view, per-render.

4. **Zod-native.** The schema IS the source of truth. Affordances are metadata ON the schema, not a separate layer.

5. **Headless first.** The core produces data structures, not React components. Renderers are separate packages.

---

## 2. PACKAGE STRUCTURE

```
zod-collection-ui            — Core: schema + affordance types, inference, generators, state, data provider
zod-collection-ui-shadcn     — (future) shadcn/ui renderer components
```

Everything lives in a single `zod-collection-ui` package. If it grows beyond collections,
the broader vision lives under `zod-affordances`.

---

## 3. CORE API

### 3.1 Schema Definition with Affordances

```typescript
import { z } from 'zod';
import { defineCollection } from 'zod-collection-ui';

// Option A: Affordances via Zod .meta() (serializable, flows to JSON Schema)
const ProjectSchema = z.object({
  id: z.string().uuid().meta({ sortable: true, filterable: 'exact', editable: false }),
  name: z.string().min(1).max(200).meta({ sortable: true, filterable: 'search', searchable: true, editable: true, inlineEditable: true }),
  status: z.enum(['draft', 'active', 'archived']).meta({ sortable: true, filterable: 'select', groupable: true, editable: true }),
  priority: z.number().int().min(1).max(5).meta({ sortable: true, filterable: 'range', editable: true, aggregatable: ['avg', 'min', 'max'] }),
  tags: z.array(z.string()).meta({ filterable: 'contains', searchable: true }),
  createdAt: z.date().meta({ sortable: 'desc', filterable: 'range', editable: false }),
  updatedAt: z.date().meta({ sortable: true, editable: false, visible: false }),
});

// Option B: Separate affordance config (more explicit, supports functions)
const projectCollection = defineCollection({
  schema: ProjectSchema,

  // Collection-level affordances
  affordances: {
    create: true,
    delete: true,
    bulkDelete: true,
    search: true,
    export: ['csv', 'json'],
    pagination: { defaultPageSize: 25, pageSizeOptions: [10, 25, 50, 100] },
    defaultSort: { field: 'createdAt', direction: 'desc' },
    defaultView: 'table',
    views: ['table', 'grid', 'list'],
  },

  // Field-level overrides (merged with .meta())
  fields: {
    id: { visible: false },
    name: { columnWidth: 250 },
    status: { badge: { draft: 'secondary', active: 'default', archived: 'outline' } },
    priority: { displayFormat: (v) => '★'.repeat(v) },
  },

  // Custom operations beyond CRUD
  operations: [
    {
      name: 'archive',
      label: 'Archive',
      scope: 'item',
      icon: 'Archive',
      confirm: { title: 'Archive project?', message: 'This will hide it from active views.' },
    },
    {
      name: 'bulkArchive',
      label: 'Archive Selected',
      scope: 'selection',
      confirm: true,
    },
    {
      name: 'exportReport',
      label: 'Export Report',
      scope: 'collection',
      params: z.object({ format: z.enum(['pdf', 'csv']), includeArchived: z.boolean().default(false) }),
    },
  ],

  // Identity
  idField: 'id',
  labelField: 'name',
});
```

### 3.2 The `defineCollection` Return Type

```typescript
interface CollectionDefinition<TSchema extends z.ZodObject<any>> {
  // The source schema
  schema: TSchema;
  type: z.infer<TSchema>;

  // Resolved affordances (merged from .meta() + explicit config)
  affordances: ResolvedCollectionAffordances;
  fieldAffordances: Record<string, ResolvedFieldAffordance>;

  // Generators (the core value)
  toColumnDefs(): ColumnDef<z.infer<TSchema>>[];
  toFormConfig(mode: 'create' | 'edit'): FormFieldConfig[];
  toFilterConfig(): FilterFieldConfig[];
  toActionConfig(): ActionConfig[];

  // State factory
  createStore(): StoreApi<CollectionState<z.infer<TSchema>>>;

  // Documentation
  describe(): string;  // Human-readable description of affordances
  toPrompt(): string;  // AI-consumable prompt (json-render pattern)
}
```

### 3.3 Type Definitions

```typescript
// === Field-Level Affordances ===

type SortDirection = 'asc' | 'desc' | 'both' | 'none';
type FilterType = 'exact' | 'search' | 'select' | 'multiSelect' | 'range' | 'contains' | 'boolean' | 'fuzzy' | false;

interface FieldAffordance {
  // Query capabilities (OData-inspired)
  sortable?: boolean | SortDirection;
  filterable?: boolean | FilterType;
  searchable?: boolean;
  groupable?: boolean;
  aggregatable?: boolean | AggregationFn[];

  // CRUD capabilities (Hydra-inspired)
  readable?: boolean;
  editable?: boolean;
  inlineEditable?: boolean;
  requiredOnCreate?: boolean;
  requiredOnUpdate?: boolean;
  immutableAfterCreate?: boolean;

  // Visibility & Layout
  visible?: boolean;
  hidden?: boolean;
  detailOnly?: boolean;
  summaryField?: boolean;
  columnWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  pinned?: 'left' | 'right' | false;
  order?: number;

  // Display
  displayFormat?: string | ((value: any) => string);
  cellRenderer?: React.ComponentType<any>;
  badge?: Record<string, string>;
  link?: string | ((value: any, item: any) => string);
  copyable?: boolean;
  truncate?: number;
  tooltip?: boolean;

  // Edit widget override
  editWidget?: string;
  editPlaceholder?: string;
  editHelp?: string;
}

// === Collection-Level Affordances ===

interface CollectionAffordances {
  // CRUD toggles
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;

  // Bulk operations
  bulkDelete?: boolean;
  bulkEdit?: boolean | string[];  // true = all editable fields, string[] = specific fields
  bulkArchive?: boolean;

  // Search
  search?: boolean | { debounce?: number; minChars?: number; highlight?: boolean };

  // Pagination
  pagination?: boolean | PaginationConfig;

  // Sorting
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  multiSort?: boolean | { maxColumns?: number };

  // Filtering
  filterPanel?: boolean;
  filterPresets?: FilterPreset[];
  savedFilters?: boolean;

  // Grouping
  groupBy?: boolean | { defaultField?: string; collapsible?: boolean };

  // Views
  defaultView?: 'table' | 'grid' | 'list' | 'kanban';
  views?: ('table' | 'grid' | 'list' | 'kanban')[];
  savedViews?: boolean;

  // Export/Import
  export?: boolean | string[];  // true = all formats, string[] = specific formats
  import?: boolean | string[];

  // Selection
  selectable?: boolean | 'single' | 'multi';

  // Refresh
  refresh?: boolean;
  autoRefresh?: number;  // interval in ms

  // Column configuration
  columnVisibility?: boolean;
  columnOrder?: boolean;
  columnResize?: boolean;
  columnPin?: boolean;

  // Other
  reorder?: boolean;
  undo?: boolean;
}

interface PaginationConfig {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  style?: 'pages' | 'loadMore' | 'infinite';
  serverSide?: boolean;
}

interface FilterPreset {
  name: string;
  label: string;
  filters: Record<string, any>;
  icon?: string;
}

// === Operations (Siren-inspired) ===

interface OperationDefinition {
  name: string;
  label: string;
  scope: 'item' | 'selection' | 'collection';
  icon?: string;
  variant?: 'default' | 'destructive' | 'secondary';
  confirm?: boolean | { title: string; message: string; confirmLabel?: string };
  params?: z.ZodType;
  handler?: (context: OperationContext) => Promise<void>;
  enabledWhen?: (context: EnabledContext) => boolean;
  visibleWhen?: (context: VisibleContext) => boolean;
  keyboardShortcut?: string;
}

interface OperationContext {
  itemId?: string;
  itemIds?: string[];
  params?: any;
  store: CollectionState<any>;
}
```

---

## 4. INFERENCE ENGINE: ZOD TYPE → DEFAULT AFFORDANCES

The core innovation: given a Zod schema with no `.meta()` annotations, infer sensible default affordances.

```typescript
function inferFieldAffordances(key: string, schema: z.ZodType): FieldAffordance {
  const def = schema._zod.def;
  const defaults: FieldAffordance = {};

  // Type-based defaults
  switch (def.type) {
    case 'string':
      defaults.sortable = 'both';
      defaults.filterable = 'search';
      defaults.searchable = true;
      defaults.editable = true;
      // Check for email, url, uuid formats
      if (hasCheck(def, 'email')) defaults.editWidget = 'email';
      if (hasCheck(def, 'url')) defaults.editWidget = 'url';
      if (hasCheck(def, 'uuid')) {
        defaults.editable = false;
        defaults.filterable = 'exact';
        defaults.searchable = false;
      }
      break;

    case 'number':
    case 'int':
      defaults.sortable = 'both';
      defaults.filterable = 'range';
      defaults.searchable = false;
      defaults.editable = true;
      defaults.aggregatable = ['sum', 'avg', 'min', 'max'];
      break;

    case 'boolean':
      defaults.sortable = 'both';
      defaults.filterable = 'boolean';
      defaults.searchable = false;
      defaults.editable = true;
      break;

    case 'enum':
      defaults.sortable = 'both';
      defaults.filterable = 'select';
      defaults.searchable = false;
      defaults.editable = true;
      defaults.groupable = true;
      break;

    case 'date':
      defaults.sortable = 'both';
      defaults.filterable = 'range';
      defaults.searchable = false;
      defaults.editable = true;
      defaults.displayFormat = 'relative'; // "2 hours ago"
      break;

    case 'array':
      defaults.sortable = false;
      defaults.filterable = 'contains';
      defaults.searchable = false;
      defaults.editable = true;
      break;

    case 'object':
      defaults.sortable = false;
      defaults.filterable = false;
      defaults.searchable = false;
      defaults.editable = true;
      defaults.detailOnly = true;
      break;
  }

  // Name-based heuristics
  const lowerKey = key.toLowerCase();
  if (lowerKey === 'id' || lowerKey.endsWith('_id') || lowerKey.endsWith('Id')) {
    defaults.editable = false;
    defaults.visible = false;
    defaults.filterable = 'exact';
  }
  if (lowerKey === 'createdat' || lowerKey === 'created_at') {
    defaults.editable = false;
    defaults.sortable = 'both';
    defaults.filterable = 'range';
  }
  if (lowerKey === 'updatedat' || lowerKey === 'updated_at') {
    defaults.editable = false;
    defaults.visible = false;
  }
  if (lowerKey === 'password' || lowerKey === 'secret' || lowerKey === 'token') {
    defaults.readable = false;
    defaults.searchable = false;
    defaults.sortable = false;
    defaults.filterable = false;
  }

  return defaults;
}
```

---

## 5. COLUMN DEFINITION GENERATOR

Transforms `CollectionDefinition` → `ColumnDef[]` for TanStack Table.

```typescript
function toColumnDefs<T extends z.ZodObject<any>>(
  collection: CollectionDefinition<T>
): ColumnDef<z.infer<T>>[] {
  const shape = collection.schema.shape;
  const columns: ColumnDef<z.infer<T>>[] = [];

  // Selection column (if selectable)
  if (collection.affordances.selectable) {
    columns.push({
      id: 'select',
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={...} />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={...} />,
      enableSorting: false,
      enableHiding: false,
    });
  }

  // Data columns from schema
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const fa = collection.fieldAffordances[key];
    if (fa.visible === false && fa.hidden !== false) continue;

    columns.push({
      accessorKey: key,
      header: fa.title ?? humanize(key),
      enableSorting: fa.sortable !== false && fa.sortable !== 'none',
      enableColumnFilter: fa.filterable !== false,
      enableGlobalFilter: fa.searchable ?? false,
      enableGrouping: fa.groupable ?? false,
      enableHiding: fa.hidden !== true,
      enableResizing: fa.resizable ?? true,
      size: fa.columnWidth,
      minSize: fa.minWidth,
      maxSize: fa.maxWidth,

      // Choose sort/filter functions based on Zod type + affordance
      sortingFn: inferSortFn(fieldSchema, fa),
      filterFn: inferFilterFn(fieldSchema, fa),

      // Cell rendering
      cell: fa.cellRenderer
        ? ({ getValue }) => <fa.cellRenderer value={getValue()} />
        : fa.displayFormat
          ? ({ getValue }) => applyFormat(getValue(), fa.displayFormat)
          : fa.badge
            ? ({ getValue }) => <Badge variant={fa.badge[getValue()]}>{getValue()}</Badge>
            : undefined,

      // Column metadata for renderers
      meta: {
        filterType: fa.filterable,
        editable: fa.editable,
        inlineEditable: fa.inlineEditable,
        zodSchema: fieldSchema,
        affordance: fa,
      },
    });
  }

  // Actions column (if any item-level operations)
  const itemOps = collection.operations?.filter(op => op.scope === 'item');
  if (itemOps?.length) {
    columns.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => <ActionsMenu item={row.original} operations={itemOps} />,
      enableSorting: false,
      enableHiding: false,
    });
  }

  return columns;
}
```

---

## 6. STATE MANAGEMENT: AUTO-GENERATED ZUSTAND STORE

```typescript
function createCollectionStore<T extends z.ZodObject<any>>(
  collection: CollectionDefinition<T>
) {
  type Item = z.infer<T>;

  return create<CollectionState<Item>>()(
    immer((set, get) => ({
      // Data
      items: [] as Item[],
      totalCount: 0,
      loading: false,
      error: null as string | null,

      // TanStack Table state
      sorting: collection.affordances.defaultSort
        ? [{ id: collection.affordances.defaultSort.field, desc: collection.affordances.defaultSort.direction === 'desc' }]
        : [],
      columnFilters: [],
      globalFilter: '',
      pagination: {
        pageIndex: 0,
        pageSize: (collection.affordances.pagination as PaginationConfig)?.defaultPageSize ?? 25,
      },
      rowSelection: {},
      columnVisibility: Object.fromEntries(
        Object.entries(collection.fieldAffordances)
          .filter(([_, fa]) => fa.visible === false)
          .map(([key]) => [key, false])
      ),
      columnOrder: Object.entries(collection.fieldAffordances)
        .sort(([, a], [, b]) => (a.order ?? 999) - (b.order ?? 999))
        .map(([key]) => key),
      grouping: [],

      // Derived state
      selectedItems: () => {
        const state = get();
        return Object.keys(state.rowSelection)
          .filter(k => state.rowSelection[k])
          .map(idx => state.items[parseInt(idx)]);
      },
      selectedCount: () => Object.values(get().rowSelection).filter(Boolean).length,

      // Actions
      setItems: (items: Item[], total?: number) => set((s) => {
        s.items = items;
        s.totalCount = total ?? items.length;
      }),
      setSorting: (sorting) => set((s) => { s.sorting = sorting; }),
      setColumnFilters: (filters) => set((s) => { s.columnFilters = filters; }),
      setGlobalFilter: (filter) => set((s) => { s.globalFilter = filter; }),
      setPagination: (pagination) => set((s) => { s.pagination = pagination; }),
      setRowSelection: (selection) => set((s) => { s.rowSelection = selection; }),
      setColumnVisibility: (vis) => set((s) => { s.columnVisibility = vis; }),
      setColumnOrder: (order) => set((s) => { s.columnOrder = order; }),
      setGrouping: (grouping) => set((s) => { s.grouping = grouping; }),
      setLoading: (loading) => set((s) => { s.loading = loading; }),
      setError: (error) => set((s) => { s.error = error; }),
      clearSelection: () => set((s) => { s.rowSelection = {}; }),
      selectAll: () => set((s) => {
        s.rowSelection = Object.fromEntries(s.items.map((_, i) => [i, true]));
      }),
      reset: () => set((s) => {
        s.sorting = [];
        s.columnFilters = [];
        s.globalFilter = '';
        s.pagination = { pageIndex: 0, pageSize: s.pagination.pageSize };
        s.rowSelection = {};
      }),
    }))
  );
}
```

---

## 7. DATA PROVIDER INTERFACE

Simplified from React Admin's 9-method interface:

```typescript
interface DataProvider<T> {
  getList(params: {
    sort?: { field: string; order: 'asc' | 'desc' }[];
    filter?: Record<string, any>;
    search?: string;
    pagination?: { page: number; pageSize: number };
  }): Promise<{ data: T[]; total: number }>;

  getOne(id: string): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  updateMany(ids: string[], data: Partial<T>): Promise<T[]>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
}
```

---

## 8. RENDERER-AGNOSTIC FORM CONFIGURATION

```typescript
interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'url' | 'password' | 'textarea'
       | 'select' | 'multiselect' | 'checkbox' | 'switch' | 'radio'
       | 'date' | 'datetime' | 'time' | 'color' | 'slider' | 'file'
       | 'tags' | 'richtext' | 'json' | 'custom';
  required: boolean;
  disabled: boolean;
  hidden: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  validation: z.ZodType;
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  group?: string;
  order: number;
  width?: 'full' | 'half' | 'third';
  customRenderer?: React.ComponentType<any>;
}
```

---

## 9. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User's Code                                  │
│                                                                      │
│  const schema = z.object({ ... }).meta({ ... })                     │
│  const collection = defineCollection({ schema, affordances, ... })   │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    zod-collection-ui                                   │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Type Inference│  │  Affordance  │  │    Default Resolver      │  │
│  │  Engine       │→ │  Merger      │→ │ (Zod type → defaults)   │  │
│  │              │  │ (.meta() +   │  │                          │  │
│  │ z.ZodType →  │  │  explicit)   │  │ string → {sortable,     │  │
│  │ field type   │  │              │  │   filterable:'search'}   │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────────────┘  │
│                           │                                          │
│              ┌────────────┼────────────┐                             │
│              ▼            ▼            ▼                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ toColumnDefs │ │ toFormConfig │ │ toActionDefs │                │
│  │ ()           │ │ ()           │ │ ()           │                │
│  │              │ │              │ │              │                │
│  │ → TanStack   │ │ → AutoForm   │ │ → Operation  │                │
│  │   ColumnDef[]│ │   config     │ │   buttons    │                │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘                │
│         │                │                │                          │
│  ┌──────┴────────────────┴────────────────┴───────┐                │
│  │              createStore()                       │                │
│  │  → Zustand store with sorting, filtering,        │                │
│  │    pagination, selection, column state            │                │
│  └──────────────────────────────────────────────────┘                │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    zod-collection-ui-shadcn (future)                   │
│                                                                      │
│  <CollectionView collection={projectCollection} data={data}>        │
│    Auto-renders: DataTable + FilterPanel + SearchBar + Toolbar       │
│    + Pagination + BulkActions + CreateDialog + EditDialog            │
│  </CollectionView>                                                   │
│                                                                      │
│  OR compose manually:                                                │
│  <CollectionToolbar collection={...} />                              │
│  <CollectionTable collection={...} data={...} />                    │
│  <CollectionPagination collection={...} />                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. IMPLEMENTATION PLAN

### Phase 1: Core Types + Inference (MVP) ✅ COMPLETE
- [x] TypeScript types for all affordances (`types.ts` — 286 lines)
- [x] `defineCollection()` function (`collection.ts` — 367 lines)
- [x] Type inference engine: Zod type → default affordances (`inference.ts` — 449 lines)
  - 4-layer inference: type defaults → validation refinements → name heuristics → Zod .meta()
  - Covers: string, number, boolean, enum, date, array, object types
  - Name patterns: id, createdAt, updatedAt, password, email, name, description, image, status
- [x] Affordance merger (.meta() + explicit config)
- [x] `toColumnDefs()` generator (`generators.ts` — TanStack Table compatible)
- [x] `toFormConfig()` generator (create/edit modes with widget inference)
- [x] `toFilterConfig()` generator (with enum options and numeric bounds)
- [x] Tests: 96 passing tests across 3 test files (inference, collection, generators)

### Phase 2: State + Data Provider + AI Integration
- [x] `createCollectionStore()` — framework-agnostic state factory (no Zustand dependency)
- [x] Data provider interface + in-memory adapter
- [x] `toPrompt()` — AI-consumable collection description (json-render pattern)
- [x] Tests for all Phase 2 features
- [x] Runnable examples (basic, e-commerce, blog, task tracker)

### Phase 3: shadcn Renderers (FUTURE — requires React project)
- [ ] `<CollectionTable>` component
- [ ] `<CollectionToolbar>` (search, filter toggle, create button, view mode)
- [ ] `<CollectionPagination>`
- [ ] `<CollectionFilterPanel>`
- [ ] `<BulkActionBar>`
- [ ] `<CollectionView>` (composition of all above)

### Phase 4: Advanced Features (FUTURE)
- [ ] Custom operations with parameter forms
- [ ] Inline editing
- [ ] Export/import
- [ ] Saved views
- [ ] Keyboard shortcuts
- [ ] Server-side data provider adapters (REST, GraphQL)
