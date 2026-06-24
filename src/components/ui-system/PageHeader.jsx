/**
 * PageHeader
 *
 * Consistent page-level heading for all dashboard and admin pages.
 * Handles breadcrumbs, actions slot, back navigation, and loading state.
 *
 * Props:
 *   title        {string}
 *   subtitle     {string?}
 *   breadcrumbs  {Array<{ label, path? }>?}
 *   actions      {ReactNode?}    — right-aligned action buttons
 *   backPath     {string?}       — renders a back chevron if provided
 *   badge        {ReactNode?}    — e.g. <StatusBadge status="active" />
 *   isLoading    {boolean?}
 *   dark         {boolean?}      — dark bg variant (default true for admin)
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';

function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-3 w-16 rounded animate-pulse bg-white/[0.06]" />
      <div className="h-3 w-3 rounded animate-pulse bg-white/[0.04]" />
      <div className="h-3 w-24 rounded animate-pulse bg-white/[0.06]" />
    </div>
  );
}

function TitleSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-7 w-56 rounded animate-pulse bg-white/[0.06]" />
      <div className="h-4 w-80 rounded animate-pulse bg-white/[0.04]" />
    </div>
  );
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  backPath,
  badge,
  isLoading = false,
  dark = true,
  className = '',
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else if (window.history.state?.idx > 0) {
      navigate(-1);
    }
  };

  return (
    <div className={`${dark ? 'border-b border-white/[0.06]' : 'border-b border-border'} pb-5 mb-6 ${className}`}>
      {/* Breadcrumbs */}
      {isLoading ? (
        <BreadcrumbSkeleton />
      ) : breadcrumbs?.length ? (
        <nav className="flex items-center gap-1.5 mb-3" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className={`w-3 h-3 flex-shrink-0 ${dark ? 'text-white/20' : 'text-muted-foreground/40'}`} />}
              {crumb.path && i < breadcrumbs.length - 1 ? (
                <Link
                  to={crumb.path}
                  className={`text-[11px] font-medium tracking-wide transition-colors ${dark ? 'text-white/30 hover:text-white/60' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={`text-[11px] font-medium tracking-wide ${dark ? 'text-white/50' : 'text-foreground/70'}`}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : null}

      {/* Main row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {/* Back button */}
          {backPath && (
            <button
              onClick={handleBack}
              className={`mt-0.5 p-1.5 rounded-lg transition-colors flex-shrink-0 ${dark ? 'text-white/30 hover:text-white hover:bg-white/[0.05]' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Title + badge */}
          {isLoading ? (
            <TitleSkeleton />
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className={`font-display text-2xl font-semibold leading-tight truncate ${dark ? 'text-white' : 'text-foreground'}`}>
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && (
                <p className={`mt-1 text-sm leading-relaxed ${dark ? 'text-white/40' : 'text-muted-foreground'}`}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions slot */}
        {!isLoading && actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}