import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const BADGE_CLASS_MAP: Record<string, string> = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ghost: 'bg-gray-100 text-gray-600 border-gray-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const SHADCN_VARIANTS = new Set(['default', 'secondary', 'destructive', 'outline']);

function renderBadge(value: string, variantName: string): ReactNode {
  if (SHADCN_VARIANTS.has(variantName)) {
    return (
      <Badge variant={variantName as any}>
        {formatEnumValue(value)}
      </Badge>
    );
  }
  const customClass = BADGE_CLASS_MAP[variantName] ?? BADGE_CLASS_MAP.ghost;
  return (
    <Badge variant="outline" className={cn(customClass)}>
      {formatEnumValue(value)}
    </Badge>
  );
}

function formatEnumValue(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  if (typeof value === 'string') {
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return String(value ?? '');
}

function renderStars(value: number): ReactNode {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25;
  const stars: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('\u2605');
    else if (i === full && hasHalf) stars.push('\u00BD');
    else stars.push('\u2606');
  }
  return <span className="text-yellow-500 tracking-wider">{stars.join('')}</span>;
}

export interface CellMeta {
  zodType: string;
  filterType?: string | boolean;
  editable?: boolean;
  inlineEditable?: boolean;
  displayFormat?: string;
  badge?: Record<string, string>;
  copyable?: boolean;
  truncate?: number;
  tooltip?: boolean;
  enumValues?: string[];
  numericBounds?: { min?: number; max?: number };
  pinned?: 'left' | 'right' | false;
}

export function renderCell(value: unknown, meta: CellMeta): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  // Badge rendering for enums
  if (meta.badge && typeof value === 'string' && value in meta.badge) {
    return renderBadge(value, meta.badge[value]);
  }

  // Display format overrides
  if (meta.displayFormat === 'currency' && typeof value === 'number') {
    return <span className="font-mono tabular-nums">{formatCurrency(value)}</span>;
  }

  if (meta.displayFormat === 'stars' && typeof value === 'number') {
    return renderStars(value);
  }

  // Date rendering
  if (meta.zodType === 'date' || meta.displayFormat === 'date') {
    return <span className="text-muted-foreground">{formatDate(value)}</span>;
  }

  // Boolean rendering
  if (meta.zodType === 'boolean') {
    return value
      ? <span className="text-green-600 font-medium">Yes</span>
      : <span className="text-muted-foreground">No</span>;
  }

  // Array rendering
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <Badge key={i} variant="outline" className="text-xs">{String(v)}</Badge>
        ))}
      </div>
    );
  }

  // Truncation
  const strValue = String(value);
  if (meta.truncate && strValue.length > meta.truncate) {
    return (
      <span title={strValue}>
        {strValue.slice(0, meta.truncate)}...
      </span>
    );
  }

  // Copyable
  if (meta.copyable) {
    return (
      <span className="font-mono text-sm flex items-center gap-1">
        {strValue}
        <button
          className="text-muted-foreground hover:text-foreground text-xs"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(strValue);
          }}
          title="Copy"
        >
          \u29C9
        </button>
      </span>
    );
  }

  return strValue;
}
