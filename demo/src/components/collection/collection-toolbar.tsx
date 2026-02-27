import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { OperationDefinition } from 'zod-collection-ui';

interface CollectionToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  searchPlaceholder?: string;
  debounceMs?: number;
  onCreateClick: () => void;
  onFilterToggle: () => void;
  showFilters: boolean;
  canCreate: boolean;
  hasSelection: boolean;
  selectedCount: number;
  onDeleteSelected?: () => void;
  selectionOperations: OperationDefinition[];
  onRefresh?: () => void;
}

export function CollectionToolbar({
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder = 'Search...',
  debounceMs = 300,
  onCreateClick,
  onFilterToggle,
  showFilters,
  canCreate,
  hasSelection,
  selectedCount,
  onDeleteSelected,
  selectionOperations,
  onRefresh,
}: CollectionToolbarProps) {
  const [localSearch, setLocalSearch] = useState(globalFilter);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onGlobalFilterChange(localSearch);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localSearch, debounceMs, onGlobalFilterChange]);

  // Sync external changes
  useEffect(() => {
    setLocalSearch(globalFilter);
  }, [globalFilter]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <Input
        placeholder={searchPlaceholder}
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        className="max-w-sm h-9"
      />

      {/* Filter toggle */}
      <Button
        variant={showFilters ? 'secondary' : 'outline'}
        size="sm"
        onClick={onFilterToggle}
      >
        {showFilters ? 'Hide Filters' : 'Filters'}
      </Button>

      {/* Create */}
      {canCreate && (
        <Button size="sm" onClick={onCreateClick}>
          + New
        </Button>
      )}

      {/* Refresh */}
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Selection actions */}
      {hasSelection && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{selectedCount} selected</Badge>
          {onDeleteSelected && (
            <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
              Delete Selected
            </Button>
          )}
          {selectionOperations.map((op) => (
            <Button
              key={op.name}
              variant={(op.variant as any) ?? 'outline'}
              size="sm"
              onClick={() => console.log(`Bulk operation "${op.name}"`)}
            >
              {op.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
