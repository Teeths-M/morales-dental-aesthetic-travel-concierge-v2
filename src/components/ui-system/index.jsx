/**
 * UI System — Central export barrel
 * 
 * Import from here to keep component paths stable across refactors:
 * 
 *   import { StatusBadge, DataTable, StatCard } from '@/components/ui-system';
 */

export { default as StatusBadge }  from './StatusBadge';
export { default as DataTable }    from './DataTable';
export { default as PageHeader }   from './PageHeader';
export { default as StatCard }     from './StatCard';
export { default as ActionMenu }   from './ActionMenu';
export { default as FormField }    from './FormField';
export { default as ConfirmDialog } from './ConfirmDialog';
export { default as InlineAlert }  from './InlineAlert';
export { default as LoadingSpinner, SectionLoader, PageLoader } from './LoadingSpinner';