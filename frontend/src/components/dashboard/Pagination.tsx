import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  loading,
  onPageChange,
}: PaginationProps) {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="table-footer">
      <span>
        Showing <strong>{from}–{to}</strong> of <strong>{total}</strong> emails
      </span>

      <div className="pagination">
        <button
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page * pageSize >= total || loading}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
