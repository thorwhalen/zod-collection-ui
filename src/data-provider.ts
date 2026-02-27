/**
 * Data Provider: A normalized interface for CRUD operations on collections.
 *
 * Inspired by React Admin's data provider (9 methods) but simplified.
 * The interface is framework-agnostic — implementations can wrap REST, GraphQL,
 * Supabase, Firebase, in-memory arrays, or any data source.
 *
 * Also includes an in-memory adapter for prototyping and testing.
 */

import type { SortingState, ColumnFilter } from './store.js';

// ============================================================================
// DataProvider Interface
// ============================================================================

export interface GetListParams {
  sort?: SortingState[];
  filter?: ColumnFilter[];
  search?: string;
  pagination?: { page: number; pageSize: number };
}

export interface GetListResult<T> {
  data: T[];
  total: number;
}

/**
 * Normalized data access interface for collection CRUD operations.
 *
 * All methods return Promises to support both sync and async data sources.
 */
export interface DataProvider<T> {
  getList(params: GetListParams): Promise<GetListResult<T>>;
  getOne(id: string): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  updateMany(ids: string[], data: Partial<T>): Promise<T[]>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
}

// ============================================================================
// In-Memory Data Provider
// ============================================================================

export interface InMemoryProviderOptions {
  /** Field name used as the unique identifier. Default: 'id'. */
  idField?: string;
  /** Delay in ms to simulate network latency. Default: 0. */
  simulateDelay?: number;
  /** Searchable fields for the `search` parameter. Default: all string fields. */
  searchFields?: string[];
}

/**
 * Create an in-memory DataProvider from an array of items.
 *
 * Useful for prototyping, testing, and small datasets.
 * Supports sorting, filtering, search, and pagination.
 *
 * @example
 * ```typescript
 * const provider = createInMemoryProvider([
 *   { id: '1', name: 'Alpha', priority: 3 },
 *   { id: '2', name: 'Beta', priority: 1 },
 * ], { idField: 'id' });
 *
 * const { data, total } = await provider.getList({
 *   sort: [{ id: 'priority', desc: false }],
 *   pagination: { page: 1, pageSize: 10 },
 * });
 * ```
 */
export function createInMemoryProvider<T extends Record<string, any>>(
  initialData: T[],
  options: InMemoryProviderOptions = {},
): DataProvider<T> {
  const idField = options.idField ?? 'id';
  const delay = options.simulateDelay ?? 0;
  const searchFields = options.searchFields;

  // Internal mutable store
  let items = [...initialData];
  let nextId = items.length + 1;

  const maybeDelay = () =>
    delay > 0 ? new Promise<void>(r => setTimeout(r, delay)) : Promise.resolve();

  function getItemId(item: T): string {
    return String((item as any)[idField]);
  }

  function matchesFilter(item: T, filter: ColumnFilter): boolean {
    const value = (item as any)[filter.id];

    if (filter.value === undefined || filter.value === null || filter.value === '') {
      return true;
    }

    // Array filter value → check if item value is in the array
    if (Array.isArray(filter.value)) {
      if (filter.value.length === 0) return true;
      if (Array.isArray(value)) {
        // Array contains any of the filter values
        return filter.value.some(fv => value.includes(fv));
      }
      return filter.value.includes(value);
    }

    // Range filter: { min, max }
    if (typeof filter.value === 'object' && ('min' in filter.value || 'max' in filter.value)) {
      const range = filter.value as { min?: number; max?: number };
      const num = Number(value);
      if (range.min !== undefined && num < range.min) return false;
      if (range.max !== undefined && num > range.max) return false;
      return true;
    }

    // Boolean exact match
    if (typeof filter.value === 'boolean') {
      return value === filter.value;
    }

    // String contains (case-insensitive)
    if (typeof filter.value === 'string') {
      return String(value).toLowerCase().includes(filter.value.toLowerCase());
    }

    // Exact match fallback
    return value === filter.value;
  }

  function matchesSearch(item: T, search: string): boolean {
    if (!search) return true;
    const lowerSearch = search.toLowerCase();
    const fields = searchFields ?? Object.keys(item).filter(k => typeof (item as any)[k] === 'string');
    return fields.some(field => {
      const val = (item as any)[field];
      return typeof val === 'string' && val.toLowerCase().includes(lowerSearch);
    });
  }

  function compareValues(a: any, b: any): number {
    if (a === b) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    return a < b ? -1 : 1;
  }

  return {
    async getList(params: GetListParams): Promise<GetListResult<T>> {
      await maybeDelay();

      let result = [...items];

      // Apply filters
      if (params.filter) {
        for (const filter of params.filter) {
          result = result.filter(item => matchesFilter(item, filter));
        }
      }

      // Apply search
      if (params.search) {
        result = result.filter(item => matchesSearch(item, params.search!));
      }

      const total = result.length;

      // Apply sorting
      if (params.sort && params.sort.length > 0) {
        result.sort((a, b) => {
          for (const sortCol of params.sort!) {
            const cmp = compareValues((a as any)[sortCol.id], (b as any)[sortCol.id]);
            if (cmp !== 0) return sortCol.desc ? -cmp : cmp;
          }
          return 0;
        });
      }

      // Apply pagination
      if (params.pagination) {
        const { page, pageSize } = params.pagination;
        const start = (page - 1) * pageSize;
        result = result.slice(start, start + pageSize);
      }

      return { data: result, total };
    },

    async getOne(id: string): Promise<T> {
      await maybeDelay();
      const item = items.find(i => getItemId(i) === id);
      if (!item) throw new Error(`Item not found: ${id}`);
      return { ...item };
    },

    async create(data: Partial<T>): Promise<T> {
      await maybeDelay();
      const newItem = {
        ...data,
        [idField]: (data as any)[idField] ?? String(nextId++),
      } as T;
      items.push(newItem);
      return { ...newItem };
    },

    async update(id: string, data: Partial<T>): Promise<T> {
      await maybeDelay();
      const index = items.findIndex(i => getItemId(i) === id);
      if (index === -1) throw new Error(`Item not found: ${id}`);
      items[index] = { ...items[index], ...data };
      return { ...items[index] };
    },

    async updateMany(ids: string[], data: Partial<T>): Promise<T[]> {
      await maybeDelay();
      const updated: T[] = [];
      for (const id of ids) {
        const index = items.findIndex(i => getItemId(i) === id);
        if (index !== -1) {
          items[index] = { ...items[index], ...data };
          updated.push({ ...items[index] });
        }
      }
      return updated;
    },

    async delete(id: string): Promise<void> {
      await maybeDelay();
      const index = items.findIndex(i => getItemId(i) === id);
      if (index === -1) throw new Error(`Item not found: ${id}`);
      items.splice(index, 1);
    },

    async deleteMany(ids: string[]): Promise<void> {
      await maybeDelay();
      const idSet = new Set(ids);
      items = items.filter(i => !idSet.has(getItemId(i)));
    },
  };
}
