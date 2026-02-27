import { useState } from 'react';
import { useCollection } from '@/hooks/use-collection';
import { CollectionTable } from './collection-table';
import { CollectionToolbar } from './collection-toolbar';
import { CollectionFilterPanel } from './collection-filter-panel';
import { CollectionPagination } from './collection-pagination';
import { CollectionFormDialog } from './collection-form-dialog';
import type { CollectionDefinition, DataProvider } from 'zod-collection-ui';

interface CollectionViewProps<T extends Record<string, any>> {
  collection: CollectionDefinition<any>;
  provider: DataProvider<T>;
  title?: string;
  description?: string;
}

export function CollectionView<T extends Record<string, any>>({
  collection,
  provider,
  title,
  description,
}: CollectionViewProps<T>) {
  const col = useCollection<T>({ collection, provider });
  const [showFilters, setShowFilters] = useState(false);
  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    item?: T;
  }>({ open: false, mode: 'create' });

  const paginationConfig = collection.affordances.pagination;
  const searchConfig = collection.affordances.search;
  const pageSizeOptions =
    paginationConfig && typeof paginationConfig === 'object'
      ? paginationConfig.pageSizeOptions ?? [10, 25, 50]
      : [10, 25, 50];
  const searchPlaceholder =
    searchConfig && typeof searchConfig === 'object'
      ? searchConfig.placeholder ?? 'Search...'
      : 'Search...';
  const debounceMs =
    searchConfig && typeof searchConfig === 'object'
      ? searchConfig.debounce ?? 300
      : 300;

  return (
    <div className="space-y-4">
      {(title || description) && (
        <div>
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      {col.state.error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          Error: {col.state.error}
        </div>
      )}

      <CollectionToolbar
        globalFilter={col.state.globalFilter}
        onGlobalFilterChange={col.setGlobalFilter}
        searchPlaceholder={searchPlaceholder}
        debounceMs={debounceMs}
        onCreateClick={() => setFormDialog({ open: true, mode: 'create' })}
        onFilterToggle={() => setShowFilters(!showFilters)}
        showFilters={showFilters}
        canCreate={collection.affordances.create ?? false}
        hasSelection={col.hasSelection}
        selectedCount={col.selectedCount}
        onDeleteSelected={collection.affordances.bulkDelete ? col.deleteSelected : undefined}
        selectionOperations={collection.getOperations('selection')}
        onRefresh={col.refresh}
      />

      <CollectionFilterPanel
        filters={col.filterConfig}
        activeFilters={col.state.columnFilters}
        onFiltersChange={col.setColumnFilters}
        open={showFilters}
      />

      <div className="relative">
        {col.state.loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
        <CollectionTable
          data={col.state.items}
          columnDefs={col.columnDefs}
          sorting={col.state.sorting}
          onSortingChange={col.setSorting}
          rowSelection={col.state.rowSelection}
          onRowSelectionChange={col.setRowSelection}
          columnVisibility={col.state.columnVisibility}
          onRowClick={(item) => setFormDialog({ open: true, mode: 'edit', item })}
          collection={collection}
        />
      </div>

      <CollectionPagination
        pageIndex={col.state.pagination.pageIndex}
        pageSize={col.state.pagination.pageSize}
        pageCount={col.pageCount}
        totalCount={col.state.totalCount}
        onPageChange={(idx) =>
          col.setPagination({ ...col.state.pagination, pageIndex: idx })
        }
        onPageSizeChange={(size) =>
          col.setPagination({ pageIndex: 0, pageSize: size })
        }
        pageSizeOptions={pageSizeOptions}
      />

      <CollectionFormDialog
        open={formDialog.open}
        onOpenChange={(open) =>
          setFormDialog((prev) => ({ ...prev, open }))
        }
        mode={formDialog.mode}
        formConfig={
          formDialog.mode === 'create'
            ? col.createFormConfig
            : col.editFormConfig
        }
        initialValues={formDialog.item as Record<string, any> | undefined}
        onSubmit={async (data) => {
          if (formDialog.mode === 'create') {
            await col.createItem(data as Partial<T>);
          } else {
            const id = (formDialog.item as any)?.[collection.idField];
            if (id) await col.updateItem(id, data as Partial<T>);
          }
        }}
        title={
          formDialog.mode === 'create' ? 'Create New' : 'Edit'
        }
      />
    </div>
  );
}
