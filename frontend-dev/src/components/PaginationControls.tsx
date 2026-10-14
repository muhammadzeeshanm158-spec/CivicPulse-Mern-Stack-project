import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
}) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination Controls"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-4 text-xs"
    >
      <p className="text-slate-600">
        Page <span className="font-bold text-slate-900">{currentPage}</span> of{" "}
        <span className="font-bold text-slate-900">{totalPages}</span>
        {totalItems !== undefined && (
          <span className="ml-1 text-slate-500">
            ({totalItems} total items)
          </span>
        )}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Go to previous page"
          className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (page) =>
              page === 1 ||
              page === totalPages ||
              Math.abs(page - currentPage) <= 1,
          )
          .map((page, index, array) => {
            const showEllipsis = index > 0 && page - array[index - 1] > 1;
            return (
              <React.Fragment key={page}>
                {showEllipsis && (
                  <span className="px-1 text-slate-500" aria-hidden="true">
                    ...
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                  className={`w-7 h-7 rounded-xl text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                    currentPage === page
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              </React.Fragment>
            );
          })}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Go to next page"
          className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default PaginationControls;
