import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCount } from "../format";

interface UserPaginationProps {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}

export function UserPagination({
  pagination,
  onPageChange,
}: UserPaginationProps) {
  const { page, pageSize, total, totalPages } = pagination;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="User list pages"
      className="flex items-center justify-between gap-4"
    >
      <p className="text-sm wd-text-muted tabular-nums">
        {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="wd-btn-ghost inline-flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} aria-hidden />
          Previous
        </button>
        <span className="text-sm wd-text-muted tabular-nums">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="wd-btn-ghost inline-flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
