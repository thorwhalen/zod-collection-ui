import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { CollectionDefinition } from 'zod-collection-ui';
import {
  createCollectionStore,
  toColumnDefs,
  toFormConfig,
  toFilterConfig,
} from 'zod-collection-ui';
import type {
  DataProvider,
  CollectionState,
  CollectionStore,
  SortingState,
  ColumnFilter,
  PaginationState,
  ColumnConfig,
  FormFieldConfig,
  FilterFieldConfig,
} from 'zod-collection-ui';

export interface UseCollectionOptions<T> {
  collection: CollectionDefinition<any>;
  provider: DataProvider<T>;
}

export interface UseCollectionReturn<T> {
  state: CollectionState<T>;
  columnDefs: ColumnConfig[];
  createFormConfig: FormFieldConfig[];
  editFormConfig: FormFieldConfig[];
  filterConfig: FilterFieldConfig[];
  setSorting: (sorting: SortingState[]) => void;
  setColumnFilters: (filters: ColumnFilter[]) => void;
  setGlobalFilter: (filter: string) => void;
  setPagination: (pagination: PaginationState) => void;
  setRowSelection: (selection: Record<string, boolean>) => void;
  clearSelection: () => void;
  createItem: (data: Partial<T>) => Promise<void>;
  updateItem: (id: string, data: Partial<T>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  refresh: () => Promise<void>;
  selectedItems: T[];
  selectedCount: number;
  pageCount: number;
  hasSelection: boolean;
  collection: CollectionDefinition<any>;
  store: CollectionStore<T>;
}

export function useCollection<T extends Record<string, any>>({
  collection,
  provider,
}: UseCollectionOptions<T>): UseCollectionReturn<T> {
  const store = useMemo(() => createCollectionStore<T>(collection), [collection]);

  const [state, setState] = useState<CollectionState<T>>(store.initialState);

  const columnDefs = useMemo(() => toColumnDefs(collection), [collection]);
  const createFormConfig = useMemo(() => toFormConfig(collection, 'create'), [collection]);
  const editFormConfig = useMemo(() => toFormConfig(collection, 'edit'), [collection]);
  const filterConfig = useMemo(() => toFilterConfig(collection), [collection]);

  const fetchData = useCallback(async (currentState: CollectionState<T>) => {
    setState(prev => store.actions.setLoading(prev, true));
    try {
      const { data, total } = await provider.getList({
        sort: currentState.sorting,
        filter: currentState.columnFilters,
        search: currentState.globalFilter || undefined,
        pagination: {
          page: currentState.pagination.pageIndex + 1,
          pageSize: currentState.pagination.pageSize,
        },
      });
      setState(prev => {
        let next = store.actions.setItems(prev, data, total);
        next = store.actions.setLoading(next, false);
        next = store.actions.setError(next, null);
        return next;
      });
    } catch (err) {
      setState(prev => {
        let next = store.actions.setLoading(prev, false);
        next = store.actions.setError(next, err instanceof Error ? err.message : 'Unknown error');
        return next;
      });
    }
  }, [provider, store]);

  // Track previous fetch params to avoid redundant fetches
  const prevParamsRef = useRef('');

  useEffect(() => {
    const paramsKey = JSON.stringify({
      sorting: state.sorting,
      columnFilters: state.columnFilters,
      globalFilter: state.globalFilter,
      pagination: state.pagination,
    });
    if (paramsKey !== prevParamsRef.current) {
      prevParamsRef.current = paramsKey;
      fetchData(state);
    }
  }, [state.sorting, state.columnFilters, state.globalFilter, state.pagination, fetchData]);

  const setSorting = useCallback((sorting: SortingState[]) => {
    setState(prev => store.actions.setSorting(prev, sorting));
  }, [store]);

  const setColumnFilters = useCallback((filters: ColumnFilter[]) => {
    setState(prev => store.actions.setColumnFilters(prev, filters));
  }, [store]);

  const setGlobalFilter = useCallback((filter: string) => {
    setState(prev => store.actions.setGlobalFilter(prev, filter));
  }, [store]);

  const setPagination = useCallback((pagination: PaginationState) => {
    setState(prev => store.actions.setPagination(prev, pagination));
  }, [store]);

  const setRowSelection = useCallback((selection: Record<string, boolean>) => {
    setState(prev => store.actions.setRowSelection(prev, selection));
  }, [store]);

  const clearSelection = useCallback(() => {
    setState(prev => store.actions.clearSelection(prev));
  }, [store]);

  const refresh = useCallback(async () => {
    await fetchData(state);
  }, [fetchData, state]);

  const createItem = useCallback(async (data: Partial<T>) => {
    await provider.create(data);
    await fetchData(state);
  }, [provider, fetchData, state]);

  const updateItem = useCallback(async (id: string, data: Partial<T>) => {
    await provider.update(id, data);
    await fetchData(state);
  }, [provider, fetchData, state]);

  const deleteItem = useCallback(async (id: string) => {
    await provider.delete(id);
    await fetchData(state);
  }, [provider, fetchData, state]);

  const deleteSelected = useCallback(async () => {
    const selected = store.selectors.getSelectedItems(state);
    const idField = collection.idField;
    const ids = selected.map((item: any) => String(item[idField]));
    if (ids.length > 0) {
      await provider.deleteMany(ids);
      setState(prev => store.actions.clearSelection(prev));
      await fetchData(state);
    }
  }, [provider, store, state, collection, fetchData]);

  return {
    state,
    columnDefs,
    createFormConfig,
    editFormConfig,
    filterConfig,
    setSorting,
    setColumnFilters,
    setGlobalFilter,
    setPagination,
    setRowSelection,
    clearSelection,
    createItem,
    updateItem,
    deleteItem,
    deleteSelected,
    refresh,
    selectedItems: store.selectors.getSelectedItems(state),
    selectedCount: store.selectors.getSelectedCount(state),
    pageCount: store.selectors.getPageCount(state),
    hasSelection: store.selectors.hasSelection(state),
    collection,
    store,
  };
}
