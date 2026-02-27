import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { renderCell, type CellMeta } from './cell-renderers';
import type { CollectionDefinition, ColumnConfig, SortingState } from 'zod-collection-ui';

interface CollectionTableProps<T> {
  data: T[];
  columnDefs: ColumnConfig[];
  sorting: SortingState[];
  onSortingChange: (sorting: SortingState[]) => void;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: (selection: Record<string, boolean>) => void;
  columnVisibility: Record<string, boolean>;
  onRowClick?: (item: T) => void;
  collection: CollectionDefinition<any>;
}

export function CollectionTable<T extends Record<string, any>>({
  data,
  columnDefs,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onRowClick,
  collection,
}: CollectionTableProps<T>) {
  const itemOps = collection.getOperations('item');

  const columns: ColumnDef<T, any>[] = useMemo(() => {
    const cols: ColumnDef<T, any>[] = [];

    // Selection column
    const isSelectable = collection.affordances.selectable;
    if (isSelectable) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      });
    }

    // Data columns from ColumnConfig
    for (const colDef of columnDefs) {
      if (colDef.id === 'select' || colDef.id === 'actions') continue;
      if (!colDef.accessorKey) continue;

      const meta = colDef.meta as CellMeta;
      cols.push({
        id: colDef.id,
        accessorKey: colDef.accessorKey,
        header: colDef.header,
        cell: ({ getValue }) => renderCell(getValue(), meta),
        enableSorting: colDef.enableSorting,
        enableHiding: colDef.enableHiding,
        size: colDef.size,
        minSize: colDef.minSize,
        maxSize: colDef.maxSize,
      });
    }

    // Actions column
    if (itemOps.length > 0) {
      cols.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="text-lg">\u22EE</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {itemOps.map((op) => (
                <DropdownMenuItem
                  key={op.name}
                  onClick={() => {
                    console.log(`Operation "${op.name}" on item:`, row.original);
                  }}
                  className={op.variant === 'destructive' ? 'text-destructive' : ''}
                >
                  {op.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
      });
    }

    return cols;
  }, [columnDefs, collection, itemOps]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      onRowSelectionChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableRowSelection: !!collection.affordances.selectable,
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = sorting.find(s => s.id === header.column.id);
                return (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={canSort ? 'cursor-pointer select-none' : ''}
                    onClick={canSort ? () => {
                      if (!sorted) {
                        onSortingChange([{ id: header.column.id, desc: false }]);
                      } else if (!sorted.desc) {
                        onSortingChange([{ id: header.column.id, desc: true }]);
                      } else {
                        onSortingChange([]);
                      }
                    } : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted && (
                        <span className="text-xs">
                          {sorted.desc ? ' \u2193' : ' \u2191'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? 'selected' : undefined}
                className={onRowClick ? 'cursor-pointer' : ''}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
