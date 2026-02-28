/**
 * zod-collection-ui — Schema-driven collection affordances
 *
 * Declare once, render anywhere. Define a Zod schema with affordance metadata
 * and get auto-generated table configurations, form configs, and action definitions.
 */

export { defineCollection } from './collection.js';
export type { CollectionDefinition } from './collection.js';

export {
  inferFieldAffordances,
  getZodBaseType,
  unwrapZodSchema,
  hasZodCheck,
  getEnumValues,
  getZodMeta,
  getNumericBounds,
  humanizeFieldName,
} from './inference.js';

export {
  toColumnDefs,
  toFormConfig,
  toFilterConfig,
} from './generators.js';
export type { ColumnConfig, FormFieldConfig, FilterFieldConfig } from './generators.js';

export { createCollectionStore } from './store.js';
export type {
  CollectionState,
  CollectionActions,
  CollectionStore,
  SortingState,
  ColumnFilter,
  PaginationState,
} from './store.js';

export { createInMemoryProvider } from './data-provider.js';
export type { DataProvider, GetListParams, GetListResult, InMemoryProviderOptions } from './data-provider.js';

export { toPrompt } from './prompt.js';

export { toCode, writeIfChanged, generateAndWrite } from './codegen.js';
export type { CodegenOptions, WriteResult } from './codegen.js';

export type {
  // Field-level
  FieldAffordance,
  SortDirection,
  FilterType,
  AggregationFn,

  // Collection-level
  CollectionAffordances,
  CollectionConfig,
  PaginationConfig,
  SearchConfig,
  MultiSortConfig,
  GroupByConfig,
  FilterPreset,
  ViewMode,

  // Operations
  OperationDefinition,
  OperationScope,
  OperationConfirmation,
} from './types.js';
