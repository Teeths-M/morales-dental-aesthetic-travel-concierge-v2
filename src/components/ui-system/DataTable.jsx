// @ts-nocheck — pre-existing type gaps in custom ui-system components
/**
 * DataTable
 *
 * Production-grade data table for admin and partner dashboards.
 * Handles loading skeletons, empty states, sorting, and responsive collapse to cards on mobile.
 *
 * Props:
 *   columns      {Array<{ key, label, render?, sortable?, align?, width? }>}
 *   data         {Array<object>}
 *   isLoading    {boolean}
 *   emptyIcon    {ReactNode?}
 *   emptyTitle   {string?}
 *   emptyMessage {string?}
 *   emptyAction  {ReactNode?}
 *   onRowClick   {(row) => void?}
 *   keyField     {string}  â€” unique key per row, default 'id'
 *   className    {string?}
 *   skeletonRows {number}  â€” default 5
 */

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react';

function SkeletonCell({ wide }) {
  return (
    <div
      className="h-4 rounded animate-pulse bg-white/[0.06]"
      style={{ width: wide ? '70%' : '45%' }}
    />
  );
}

function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 text-white/20">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <p className="text-sm font-semibold text-white/60 mb-1">{title || 'No data yet'}</p>
      {message && <p className="text-xs text-white/30 max-w-xs mb-4">{message}</p>}
      {action}
    </div>
  );
}

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  emptyAction,
  onRowClick,
  keyField = 'id',
  className = '',
  skeletonRows = 5,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3 h-3 text-white/20" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-white/60" />
      : <ChevronDown className="w-3 h-3 text-white/60" />;
  };

  return (
    <div className={`rounded-2xl border border-white/[0.07] bg-[#0A101D] overflow-hidden ${className}`}>
      {/* â”€â”€ Desktop Table â”€â”€ */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 text-left text-[11px] font-semibold tracking-wider uppercase text-white/30 select-none ${col.sortable ? 'cursor-pointer hover:text-white/50 transition-colors' : ''} ${col.align === 'right' ? 'text-right' : ''}`}
                  style={col.width ? { width: col.width } : {}}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {columns.map((col, j) => (
                      <td key={col.key} className="px-5 py-4">
                        <SkeletonCell wide={j === 0} />
                      </td>
                    ))}
                  </tr>
                ))
              : sortedData.length === 0
              ? (
                  <tr>
                    <td colSpan={columns.length}>
                      <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} action={emptyAction} />
                    </td>
                  </tr>
                )
              : sortedData.map((row) => (
                  <tr
                    key={row[keyField] || Math.random()}
                    className={`border-b border-white/[0.04] last:border-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-white/[0.025]' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-5 py-4 text-white/70 ${col.align === 'right' ? 'text-right' : ''}`}
                      >
                        {col.render ? col.render(row[col.key], row) : (
                          <span className="text-sm">{row[col.key] ?? 'â€”'}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* â”€â”€ Mobile Card Stack â”€â”€ */}
      <div className="md:hidden divide-y divide-white/[0.05]">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2.5">
                <SkeletonCell wide />
                <SkeletonCell />
                <SkeletonCell />
              </div>
            ))
          : sortedData.length === 0
          ? <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} action={emptyAction} />
          : sortedData.map((row) => (
              <div
                key={row[keyField] || Math.random()}
                className={`p-4 space-y-2 ${onRowClick ? 'cursor-pointer active:bg-white/[0.03]' : ''}`}
                onClick={() => onRowClick?.(row)}
                role={onRowClick ? 'button' : undefined}
              >
                {columns.map((col, i) => (
                  <div key={col.key} className={`flex items-start justify-between gap-3 ${i === 0 ? '' : ''}`}>
                    {i > 0 && (
                      <span className="text-[10px] uppercase tracking-wider text-white/25 font-semibold pt-0.5 min-w-[80px]">
                        {col.label}
                      </span>
                    )}
                    <span className={`${i === 0 ? 'text-sm font-medium text-white' : 'text-xs text-white/60 text-right flex-1'}`}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? 'â€”')}
                    </span>
                  </div>
                ))}
              </div>
            ))
        }
      </div>
    </div>
  );
}
