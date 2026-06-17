/**
 * Pagination
 *
 * Accessible pagination controls for data tables and lists.
 * Handles page navigation, page size selection, and responsive behavior.
 *
 * Props:
 *   currentPage    {number}        — Current page (1-indexed)
 *   totalPages     {number}        — Total number of pages
 *   pageSize       {number?}       — Items per page (optional, shows selector)
 *   totalItems     {number?}       — Total item count (for display)
 *   onPageChange   {(page) => void} — Page change handler
 *   onPageSizeChange? {(size) => void} — Page size change handler (optional)
 *   pageSizes      {number[]?}     — Available page sizes (default [10, 20, 50, 100])
 *   dark           {boolean?}      — Dark theme variant (default true)
 *   className      {string?}
 */

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizes = DEFAULT_PAGE_SIZES,
  dark = true,
  className = '',
}) {
  const canGoFirst = currentPage > 1;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const canGoLast = currentPage < totalPages;

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    onPageChange?.(newPage);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between gap-4 flex-wrap ${className}`}>
      {/* Left side - Page size selector */}
      {onPageSizeChange && pageSize && (
        <div className="flex items-center gap-2">
          <span className={`text-xs ${dark ? 'text-white/40' : 'text-muted-foreground'}`}>
            Show
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={`
              text-xs rounded-lg px-2 py-1.5 outline-none transition-all
              ${dark 
                ? 'bg-white/[0.03] border border-white/[0.10] text-white focus:border-white/[0.25]' 
                : 'bg-background border border-input text-foreground focus:border-primary'
              }
            `}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size} className={dark ? 'bg-[#0D1525] text-white' : ''}>
                {size} per page
              </option>
            ))}
          </select>
          {totalItems && (
            <span className={`text-xs ${dark ? 'text-white/30' : 'text-muted-foreground/60'}`}>
              of {totalItems.toLocaleString()} items
            </span>
          )}
        </div>
      )}

      {/* Right side - Pagination controls */}
      <div className="flex items-center gap-1 ml-auto">
        {/* First page */}
        <button
          onClick={() => handlePageChange(1)}
          disabled={!canGoFirst}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${
            dark 
              ? 'text-white/30 hover:text-white hover:bg-white/[0.05]' 
              : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
          }`}
          aria-label="Go to first page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous page */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${
            dark 
              ? 'text-white/30 hover:text-white hover:bg-white/[0.05]' 
              : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
          }`}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`
                min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-all
                ${page === currentPage
                  ? dark 
                    ? 'bg-white text-[#060B16]' 
                    : 'bg-primary text-primary-foreground'
                  : dark
                    ? 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next page */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${
            dark 
              ? 'text-white/30 hover:text-white hover:bg-white/[0.05]' 
              : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
          }`}
          aria-label="Go to next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last page */}
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={!canGoLast}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${
            dark 
              ? 'text-white/30 hover:text-white hover:bg-white/[0.05]' 
              : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
          }`}
          aria-label="Go to last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}