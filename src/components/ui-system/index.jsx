/**
 * UI System — Central export barrel
 * 
 * Import from here to keep component paths stable across refactors:
 * 
 *   import { StatusBadge, DataTable, StatCard } from '@/components/ui-system';
 */

export { default as StatusBadge }     from './StatusBadge';
export { default as DataTable }       from './DataTable';
export { default as PageHeader }      from './PageHeader';
export { default as StatCard }        from './StatCard';
export { default as ActionMenu }      from './ActionMenu';
export { default as FormField }       from './FormField';
export { default as ConfirmDialog }   from './ConfirmDialog';
export { default as InlineAlert }     from './InlineAlert';
export { default as LoadingSpinner, SectionLoader, PageLoader } from './LoadingSpinner';
export { default as EmptyState }      from './EmptyState';
export { default as SearchBar }       from './SearchBar';
export { default as Pagination }      from './Pagination';
export { default as ProgressBar }     from './ProgressBar';

// ── App-level state & layout helpers ──
export { default as SectionHeader }   from './SectionHeader';
export { default as SkeletonBlock }   from './SkeletonBlock';
export { default as LoadingState }    from './LoadingState';
export { default as ErrorState }      from './ErrorState';
export { default as AccessDenied }    from './AccessDenied';
export { default as FilterBar }       from './FilterBar';
export { default as FormSection }     from './FormSection';
export { default as ResponsiveTabs }  from './ResponsiveTabs';
export { default as MobileSheet }     from './MobileSheet';

// ── Country / city pickers ──
export { default as SearchSelect }       from './SearchSelect';
export { default as CountryCitySelect }  from './CountryCitySelect';

// ── Data display standards (formatting helpers) ──
export {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelative,
  displayField,
  humanize,
  truncate,
  EMPTY,
} from '@/lib/format';