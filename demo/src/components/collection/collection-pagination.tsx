import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CollectionPaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalCount: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions: number[];
}

export function CollectionPagination({
  pageIndex,
  pageSize,
  pageCount,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
}: CollectionPaginationProps) {
  if (totalCount === 0) return null;

  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between px-2 py-2">
      <div className="text-sm text-muted-foreground">
        Showing {start}-{end} of {totalCount}
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onPageChange(0)}
            disabled={pageIndex === 0}
          >
            &laquo;
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            &lsaquo;
          </Button>
          <span className="text-sm px-2">
            Page {pageIndex + 1} of {pageCount || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            &rsaquo;
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            &raquo;
          </Button>
        </div>
      </div>
    </div>
  );
}
