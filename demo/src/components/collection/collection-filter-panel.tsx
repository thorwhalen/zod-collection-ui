import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { FilterFieldConfig, ColumnFilter } from 'zod-collection-ui';

interface CollectionFilterPanelProps {
  filters: FilterFieldConfig[];
  activeFilters: ColumnFilter[];
  onFiltersChange: (filters: ColumnFilter[]) => void;
  open: boolean;
}

function getFilterValue(activeFilters: ColumnFilter[], name: string): unknown {
  return activeFilters.find(f => f.id === name)?.value;
}

function setFilterValue(
  activeFilters: ColumnFilter[],
  name: string,
  value: unknown,
): ColumnFilter[] {
  const existing = activeFilters.filter(f => f.id !== name);
  if (value === '' || value === undefined || value === null) return existing;
  return [...existing, { id: name, value }];
}

export function CollectionFilterPanel({
  filters,
  activeFilters,
  onFiltersChange,
  open,
}: CollectionFilterPanelProps) {
  if (!open || filters.length === 0) return null;

  return (
    <div className="rounded-md border p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Filters</span>
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onFiltersChange([])}
          >
            Clear all
          </Button>
        )}
      </div>
      <Separator className="mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filters.map((filter) => (
          <FilterField
            key={filter.name}
            filter={filter}
            value={getFilterValue(activeFilters, filter.name)}
            onChange={(value) => {
              onFiltersChange(setFilterValue(activeFilters, filter.name, value));
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FilterField({
  filter,
  value,
  onChange,
}: {
  filter: FilterFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (filter.filterType) {
    case 'select':
    case 'multiSelect':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{filter.label}</Label>
          <Select
            value={typeof value === 'string' ? value : ''}
            onValueChange={(v) => onChange(v === '__all__' ? undefined : v)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder={`All ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {filter.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-2 pt-5">
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked || undefined)}
          />
          <Label className="text-xs">{filter.label}</Label>
        </div>
      );

    case 'range':
      const rangeValue = (typeof value === 'object' && value !== null) ? value as { min?: number; max?: number } : {};
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{filter.label}</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={filter.bounds?.min !== undefined ? `Min (${filter.bounds.min})` : 'Min'}
              className="h-8"
              value={rangeValue.min ?? ''}
              onChange={(e) => {
                const min = e.target.value ? Number(e.target.value) : undefined;
                const newVal = { ...rangeValue, min };
                onChange(min !== undefined || rangeValue.max !== undefined ? newVal : undefined);
              }}
            />
            <Input
              type="number"
              placeholder={filter.bounds?.max !== undefined ? `Max (${filter.bounds.max})` : 'Max'}
              className="h-8"
              value={rangeValue.max ?? ''}
              onChange={(e) => {
                const max = e.target.value ? Number(e.target.value) : undefined;
                const newVal = { ...rangeValue, max };
                onChange(rangeValue.min !== undefined || max !== undefined ? newVal : undefined);
              }}
            />
          </div>
        </div>
      );

    case 'search':
    case 'exact':
    case 'contains':
    default:
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{filter.label}</Label>
          <Input
            placeholder={`Filter ${filter.label.toLowerCase()}...`}
            className="h-8"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        </div>
      );
  }
}
