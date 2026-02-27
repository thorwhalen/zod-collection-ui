/**
 * Collection Definition: The main entry point.
 *
 * `defineCollection` takes a Zod object schema + optional configuration and produces
 * a CollectionDefinition with resolved affordances, generators, and utilities.
 */

import { z } from 'zod';
import type {
  CollectionConfig,
  CollectionAffordances,
  FieldAffordance,
  OperationDefinition,
  PaginationConfig,
  SearchConfig,
  ResolvedFieldAffordance,
} from './types.js';
import {
  inferFieldAffordances,
  getZodBaseType,
  humanizeFieldName,
} from './inference.js';

// ============================================================================
// Default Collection Affordances
// ============================================================================

const DEFAULT_COLLECTION_AFFORDANCES: CollectionAffordances = {
  create: true,
  read: true,
  update: true,
  delete: true,
  bulkDelete: false,
  bulkEdit: false,
  search: true,
  pagination: {
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    style: 'pages',
    serverSide: false,
  },
  multiSort: true,
  filterPanel: true,
  selectable: 'multi',
  columnVisibility: true,
  columnOrder: true,
  columnResize: true,
  refresh: true,
  defaultView: 'table',
  views: ['table'],
};

const DEFAULT_PAGINATION: Required<PaginationConfig> = {
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  style: 'pages',
  serverSide: false,
};

const DEFAULT_SEARCH: SearchConfig = {
  debounce: 300,
  minChars: 1,
  highlight: false,
  placeholder: 'Search...',
};

// ============================================================================
// CollectionDefinition
// ============================================================================

export interface CollectionDefinition<TSchema extends z.ZodObject<any>> {
  /** The source Zod schema. */
  schema: TSchema;

  /** Resolved collection-level affordances. */
  affordances: CollectionAffordances;

  /** Resolved per-field affordances (after inference + merge). */
  fieldAffordances: Record<string, FieldAffordance & { title: string; zodType: string }>;

  /** Custom operations. */
  operations: OperationDefinition[];

  /** Which field is the unique identifier. */
  idField: string;

  /** Which field is the human-readable label. */
  labelField: string;

  /** Get ordered list of visible fields for the collection view. */
  getVisibleFields(): string[];

  /** Get fields that are searchable (for global search). */
  getSearchableFields(): string[];

  /** Get fields that are filterable (for filter panel). */
  getFilterableFields(): { key: string; affordance: FieldAffordance & { title: string } }[];

  /** Get fields that are sortable (for sort controls). */
  getSortableFields(): { key: string; affordance: FieldAffordance & { title: string } }[];

  /** Get fields that are groupable. */
  getGroupableFields(): { key: string; affordance: FieldAffordance & { title: string } }[];

  /** Get operations by scope. */
  getOperations(scope: 'item' | 'selection' | 'collection'): OperationDefinition[];

  /** Generate a human-readable description of affordances. */
  describe(): string;
}

// ============================================================================
// defineCollection
// ============================================================================

/**
 * Define a collection from a Zod object schema and optional configuration.
 *
 * This is the main entry point for the collection affordance library.
 *
 * @example
 * ```typescript
 * const projectCollection = defineCollection(
 *   z.object({
 *     id: z.string().uuid(),
 *     name: z.string().min(1),
 *     status: z.enum(['draft', 'active', 'archived']),
 *     priority: z.number().int().min(1).max(5),
 *   }),
 *   {
 *     affordances: { bulkDelete: true, export: ['csv', 'json'] },
 *     fields: { name: { inlineEditable: true } },
 *     operations: [{ name: 'archive', label: 'Archive', scope: 'item' }],
 *   }
 * );
 * ```
 */
export function defineCollection<TSchema extends z.ZodObject<any>>(
  schema: TSchema,
  config?: CollectionConfig<z.infer<TSchema>>,
): CollectionDefinition<TSchema> {
  type TShape = z.infer<TSchema>;

  // 1. Resolve collection-level affordances
  const affordances = resolveCollectionAffordances(config?.affordances);

  // 2. Resolve per-field affordances
  const fieldAffordances = resolveAllFieldAffordances(schema, config?.fields);

  // 3. Resolve identity fields
  const idField = config?.idField ?? detectIdField(schema);
  const labelField = config?.labelField ?? detectLabelField(schema, fieldAffordances);

  // 4. Operations
  const operations = config?.operations ?? [];

  // 5. Build the collection definition
  const definition: CollectionDefinition<TSchema> = {
    schema,
    affordances,
    fieldAffordances,
    operations,
    idField,
    labelField,

    getVisibleFields() {
      return Object.entries(fieldAffordances)
        .filter(([_, fa]) => fa.visible !== false && !fa.hidden && !fa.detailOnly)
        .sort(([, a], [, b]) => (a.order ?? 999) - (b.order ?? 999))
        .map(([key]) => key);
    },

    getSearchableFields() {
      return Object.entries(fieldAffordances)
        .filter(([_, fa]) => fa.searchable === true)
        .map(([key]) => key);
    },

    getFilterableFields() {
      return Object.entries(fieldAffordances)
        .filter(([_, fa]) => fa.filterable !== false)
        .map(([key, fa]) => ({ key, affordance: fa }));
    },

    getSortableFields() {
      return Object.entries(fieldAffordances)
        .filter(([_, fa]) => fa.sortable !== false && fa.sortable !== 'none')
        .map(([key, fa]) => ({ key, affordance: fa }));
    },

    getGroupableFields() {
      return Object.entries(fieldAffordances)
        .filter(([_, fa]) => fa.groupable === true)
        .map(([key, fa]) => ({ key, affordance: fa }));
    },

    getOperations(scope) {
      return operations.filter((op) => op.scope === scope);
    },

    describe() {
      return generateDescription(definition);
    },
  };

  return definition;
}

// ============================================================================
// Internals
// ============================================================================

function resolveCollectionAffordances(
  explicit?: CollectionAffordances,
): CollectionAffordances {
  const merged = { ...DEFAULT_COLLECTION_AFFORDANCES, ...explicit };

  // Normalize pagination
  if (merged.pagination === true) {
    merged.pagination = { ...DEFAULT_PAGINATION };
  } else if (merged.pagination && typeof merged.pagination === 'object') {
    merged.pagination = { ...DEFAULT_PAGINATION, ...merged.pagination };
  }

  // Normalize search
  if (merged.search === true) {
    merged.search = { ...DEFAULT_SEARCH };
  } else if (merged.search && typeof merged.search === 'object') {
    merged.search = { ...DEFAULT_SEARCH, ...merged.search };
  }

  return merged;
}

function resolveAllFieldAffordances(
  schema: z.ZodObject<any>,
  explicit?: Partial<Record<string, Partial<FieldAffordance>>>,
): Record<string, FieldAffordance & { title: string; zodType: string }> {
  const shape = schema.shape as Record<string, z.ZodType>;
  const result: Record<string, FieldAffordance & { title: string; zodType: string }> = {};

  for (const [key, fieldSchema] of Object.entries(shape)) {
    // Infer defaults from type + name + meta
    const inferred = inferFieldAffordances(key, fieldSchema);

    // Merge with explicit overrides
    const explicitOverrides = explicit?.[key] ?? {};
    const merged = { ...inferred, ...explicitOverrides };

    // Ensure title and zodType are set
    result[key] = {
      ...merged,
      title: merged.title ?? humanizeFieldName(key),
      zodType: getZodBaseType(fieldSchema),
    };
  }

  return result;
}

/** Detect the ID field from schema. */
function detectIdField(schema: z.ZodObject<any>): string {
  const shape = schema.shape as Record<string, z.ZodType>;

  // Direct 'id' field
  if ('id' in shape) return 'id';
  if ('_id' in shape) return '_id';
  if ('uuid' in shape) return 'uuid';
  if ('key' in shape) return 'key';

  // First field ending with Id/id/_id
  for (const key of Object.keys(shape)) {
    if (/[iI]d$/.test(key) || key.endsWith('_id')) return key;
  }

  // Fallback to first field
  const keys = Object.keys(shape);
  return keys[0] ?? 'id';
}

/** Detect the label field from schema + affordances. */
function detectLabelField(
  schema: z.ZodObject<any>,
  fieldAffordances: Record<string, FieldAffordance & { zodType: string }>,
): string {
  // Check for summaryField flag
  for (const [key, fa] of Object.entries(fieldAffordances)) {
    if (fa.summaryField) return key;
  }

  // Common label field names
  const labelNames = ['name', 'title', 'label', 'displayName', 'display_name', 'username'];
  for (const name of labelNames) {
    if (name in fieldAffordances) return name;
  }

  // First string field that's not an ID
  for (const [key, fa] of Object.entries(fieldAffordances)) {
    if (fa.zodType === 'string' && fa.editable !== false) return key;
  }

  return Object.keys(fieldAffordances)[0] ?? '';
}

/** Generate a human-readable description of the collection's affordances. */
function generateDescription(def: CollectionDefinition<any>): string {
  const lines: string[] = [];

  // Collection info
  const fieldCount = Object.keys(def.fieldAffordances).length;
  lines.push(`Collection with ${fieldCount} fields (ID: ${def.idField}, Label: ${def.labelField})`);
  lines.push('');

  // CRUD
  const crud: string[] = [];
  if (def.affordances.create) crud.push('Create');
  if (def.affordances.read) crud.push('Read');
  if (def.affordances.update) crud.push('Update');
  if (def.affordances.delete) crud.push('Delete');
  lines.push(`CRUD: ${crud.join(', ')}`);

  // Bulk operations
  const bulk: string[] = [];
  if (def.affordances.bulkDelete) bulk.push('Bulk Delete');
  if (def.affordances.bulkEdit) bulk.push('Bulk Edit');
  if (bulk.length) lines.push(`Bulk: ${bulk.join(', ')}`);

  // Search
  if (def.affordances.search) {
    const searchFields = def.getSearchableFields();
    lines.push(`Search: Yes (fields: ${searchFields.join(', ')})`);
  }

  // Pagination
  if (def.affordances.pagination && typeof def.affordances.pagination === 'object') {
    lines.push(`Pagination: ${def.affordances.pagination.style} (default: ${def.affordances.pagination.defaultPageSize})`);
  }

  lines.push('');
  lines.push('Fields:');

  // Per-field summary
  for (const [key, fa] of Object.entries(def.fieldAffordances)) {
    const caps: string[] = [];
    if (fa.sortable && fa.sortable !== 'none') caps.push(`sort:${fa.sortable}`);
    if (fa.filterable) caps.push(`filter:${fa.filterable}`);
    if (fa.searchable) caps.push('search');
    if (fa.groupable) caps.push('group');
    if (fa.editable) caps.push('edit');
    if (fa.inlineEditable) caps.push('inline-edit');
    if (!fa.visible || fa.hidden) caps.push('HIDDEN');
    if (fa.detailOnly) caps.push('detail-only');

    lines.push(`  ${key} (${fa.zodType}): ${caps.join(', ') || 'display-only'}`);
  }

  // Operations
  if (def.operations.length > 0) {
    lines.push('');
    lines.push('Custom Operations:');
    for (const op of def.operations) {
      lines.push(`  ${op.name} [${op.scope}]: ${op.label}`);
    }
  }

  return lines.join('\n');
}
