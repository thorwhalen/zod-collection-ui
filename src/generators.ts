/**
 * Generators: Transform CollectionDefinition into framework-specific configurations.
 *
 * This module produces configuration objects that existing renderers consume:
 * - toColumnDefs() → TanStack Table ColumnDef[] shape
 * - toFormConfig() → Form field configuration for create/edit forms
 * - toFilterConfig() → Filter field configuration for filter panels
 *
 * These are "headless" — they produce data, not React components.
 * The actual rendering is done by a renderer package (e.g. shadcn/ui) or equivalent.
 */

import { z } from 'zod';
import type { CollectionDefinition } from './collection.js';
import type { FieldAffordance, FilterType } from './types.js';
import { getZodBaseType, getEnumValues, getNumericBounds } from './inference.js';

// ============================================================================
// Column Definition Generator (TanStack Table compatible)
// ============================================================================

/**
 * A framework-agnostic column definition.
 * Structurally compatible with TanStack Table's ColumnDef but framework-independent.
 */
export interface ColumnConfig {
  /** Column identifier (matches field key). */
  id: string;
  /** Display header text. */
  header: string;
  /** Field accessor key. */
  accessorKey?: string;

  // Feature flags (TanStack Table compatible)
  enableSorting: boolean;
  enableColumnFilter: boolean;
  enableGlobalFilter: boolean;
  enableGrouping: boolean;
  enableHiding: boolean;
  enableResizing: boolean;

  // Sizing
  size?: number;
  minSize?: number;
  maxSize?: number;

  // Sort configuration
  sortingFn?: string;
  sortDescFirst?: boolean;

  // Filter configuration
  filterFn?: string;

  // Metadata for renderers
  meta: {
    zodType: string;
    filterType: FilterType | boolean;
    editable: boolean;
    inlineEditable: boolean;
    displayFormat?: string;
    badge?: Record<string, string>;
    copyable?: boolean;
    truncate?: number;
    tooltip?: boolean;
    enumValues?: string[];
    numericBounds?: { min?: number; max?: number };
    pinned?: 'left' | 'right' | false;
  };
}

/** Map Zod type to the appropriate TanStack Table sort function name. */
function inferSortFnName(zodType: string, affordance: FieldAffordance): string {
  switch (zodType) {
    case 'string': return 'text';
    case 'number':
    case 'int':
    case 'float':
    case 'bigint': return 'basic';
    case 'date': return 'datetime';
    case 'boolean': return 'basic';
    case 'enum': return 'text';
    default: return 'basic';
  }
}

/** Map filter type + Zod type to the appropriate TanStack Table filter function name. */
function inferFilterFnName(filterType: FilterType | boolean, zodType: string): string {
  if (typeof filterType === 'boolean') return 'includesString';

  switch (filterType) {
    case 'exact': return 'equalsString';
    case 'search': return 'includesString';
    case 'select': return 'arrIncludes';
    case 'multiSelect': return 'arrIncludesSome';
    case 'range': return 'inNumberRange';
    case 'contains': return 'arrIncludesAll';
    case 'boolean': return 'equals';
    case 'fuzzy': return 'includesString';
    default: return 'includesString';
  }
}

/**
 * Generate column definitions from a CollectionDefinition.
 *
 * @returns An array of ColumnConfig objects compatible with TanStack Table.
 */
export function toColumnDefs<T extends z.ZodObject<any>>(
  collection: CollectionDefinition<T>,
): ColumnConfig[] {
  const columns: ColumnConfig[] = [];
  const shape = collection.schema.shape as Record<string, z.ZodType>;

  // Selection column (if selectable)
  if (collection.affordances.selectable) {
    columns.push({
      id: 'select',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      enableGrouping: false,
      enableHiding: false,
      enableResizing: false,
      size: 40,
      meta: {
        zodType: 'display',
        filterType: false,
        editable: false,
        inlineEditable: false,
      },
    });
  }

  // Data columns from visible fields
  const visibleFields = collection.getVisibleFields();

  for (const key of visibleFields) {
    const fa = collection.fieldAffordances[key];
    const fieldSchema = shape[key];
    if (!fieldSchema) continue;

    const zodType = fa.zodType;

    columns.push({
      id: key,
      header: fa.title,
      accessorKey: key,
      enableSorting: fa.sortable !== false && fa.sortable !== 'none',
      enableColumnFilter: fa.filterable !== false,
      enableGlobalFilter: fa.searchable ?? false,
      enableGrouping: fa.groupable ?? false,
      enableHiding: !fa.hidden,
      enableResizing: fa.resizable ?? true,
      size: fa.columnWidth,
      minSize: fa.minWidth,
      maxSize: fa.maxWidth,
      sortingFn: inferSortFnName(zodType, fa),
      sortDescFirst: fa.sortable === 'desc',
      filterFn: fa.filterable ? inferFilterFnName(fa.filterable, zodType) : undefined,
      meta: {
        zodType,
        filterType: fa.filterable ?? false,
        editable: fa.editable ?? false,
        inlineEditable: fa.inlineEditable ?? false,
        displayFormat: fa.displayFormat,
        badge: fa.badge,
        copyable: fa.copyable,
        truncate: fa.truncate,
        tooltip: fa.tooltip,
        enumValues: fieldSchema ? getEnumValues(fieldSchema) ?? undefined : undefined,
        numericBounds: fieldSchema ? getNumericBounds(fieldSchema) : undefined,
        pinned: fa.pinned,
      },
    });
  }

  // Actions column (if there are item-level operations)
  const itemOps = collection.getOperations('item');
  if (itemOps.length > 0) {
    columns.push({
      id: 'actions',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      enableGrouping: false,
      enableHiding: false,
      enableResizing: false,
      size: 60 + (itemOps.length - 1) * 32,
      meta: {
        zodType: 'display',
        filterType: false,
        editable: false,
        inlineEditable: false,
      },
    });
  }

  return columns;
}

// ============================================================================
// Form Configuration Generator
// ============================================================================

export interface FormFieldConfig {
  /** Field key. */
  name: string;
  /** Display label. */
  label: string;
  /** Input widget type. */
  type: string;
  /** Whether this field is required. */
  required: boolean;
  /** Whether this field is disabled (read-only). */
  disabled: boolean;
  /** Whether this field is hidden. */
  hidden: boolean;
  /** Placeholder text. */
  placeholder?: string;
  /** Help text. */
  helpText?: string;
  /** Default value. */
  defaultValue?: unknown;
  /** Options for select/multiselect fields. */
  options?: { label: string; value: string }[];
  /** Display order. */
  order: number;
  /** Zod type for the underlying schema. */
  zodType: string;
}

/** Infer the form widget type from Zod type + affordances. */
function inferFormWidgetType(zodType: string, fa: FieldAffordance): string {
  // Explicit override takes precedence
  if (fa.editWidget) return fa.editWidget;

  switch (zodType) {
    case 'string': return 'text';
    case 'number':
    case 'int':
    case 'float': return 'number';
    case 'boolean': return 'checkbox';
    case 'enum': return 'select';
    case 'date': return 'date';
    case 'array': return 'tags';
    case 'object': return 'json';
    default: return 'text';
  }
}

/**
 * Generate form field configurations for create or edit forms.
 */
export function toFormConfig<T extends z.ZodObject<any>>(
  collection: CollectionDefinition<T>,
  mode: 'create' | 'edit' = 'create',
): FormFieldConfig[] {
  const fields: FormFieldConfig[] = [];
  const shape = collection.schema.shape as Record<string, z.ZodType>;
  let orderCounter = 0;

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const fa = collection.fieldAffordances[key];

    // Skip fields that are not relevant for this mode
    if (fa.readable === false && mode === 'edit') continue;
    if (fa.editable === false && mode === 'create' && !fa.requiredOnCreate) continue;
    if (fa.editable === false && mode === 'edit') continue;
    if (fa.hidden) continue;

    // Skip immutable fields on edit
    if (mode === 'edit' && fa.immutableAfterCreate) continue;

    const zodType = fa.zodType;
    const isRequired = mode === 'create'
      ? (fa.requiredOnCreate ?? false)
      : (fa.requiredOnUpdate ?? false);

    // Get enum options if applicable
    let options: { label: string; value: string }[] | undefined;
    const enumValues = getEnumValues(fieldSchema);
    if (enumValues) {
      options = enumValues.map(v => ({
        label: v.charAt(0).toUpperCase() + v.slice(1),
        value: v,
      }));
    }

    fields.push({
      name: key,
      label: fa.title,
      type: inferFormWidgetType(zodType, fa),
      required: isRequired,
      disabled: fa.editable === false,
      hidden: fa.hidden ?? false,
      placeholder: fa.editPlaceholder,
      helpText: fa.editHelp ?? fa.description,
      options,
      order: fa.order ?? orderCounter++,
      zodType,
    });
  }

  return fields.sort((a, b) => a.order - b.order);
}

// ============================================================================
// Filter Configuration Generator
// ============================================================================

export interface FilterFieldConfig {
  /** Field key. */
  name: string;
  /** Display label. */
  label: string;
  /** Filter UI type. */
  filterType: FilterType;
  /** Options for select/multiselect filters. */
  options?: { label: string; value: string }[];
  /** Numeric bounds for range filters. */
  bounds?: { min?: number; max?: number };
  /** Zod type. */
  zodType: string;
}

/**
 * Generate filter field configurations for the filter panel.
 */
export function toFilterConfig<T extends z.ZodObject<any>>(
  collection: CollectionDefinition<T>,
): FilterFieldConfig[] {
  const filters: FilterFieldConfig[] = [];
  const shape = collection.schema.shape as Record<string, z.ZodType>;

  const filterableFields = collection.getFilterableFields();

  for (const { key, affordance } of filterableFields) {
    const fieldSchema = shape[key];
    if (!fieldSchema) continue;

    const filterType = typeof affordance.filterable === 'string'
      ? affordance.filterable
      : 'search';

    let options: { label: string; value: string }[] | undefined;
    const enumValues = getEnumValues(fieldSchema);
    if (enumValues && (filterType === 'select' || filterType === 'multiSelect')) {
      options = enumValues.map(v => ({
        label: v.charAt(0).toUpperCase() + v.slice(1),
        value: v,
      }));
    }

    let bounds: { min?: number; max?: number } | undefined;
    if (filterType === 'range') {
      bounds = getNumericBounds(fieldSchema);
    }

    filters.push({
      name: key,
      label: affordance.title ?? key,
      filterType,
      options,
      bounds,
      zodType: collection.fieldAffordances[key].zodType,
    });
  }

  return filters;
}
