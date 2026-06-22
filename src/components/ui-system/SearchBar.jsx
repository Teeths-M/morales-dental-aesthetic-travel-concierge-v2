/**
 * SearchBar
 *
 * Accessible search input with debounce, clear button, and optional filters.
 * Handles loading states, keyboard shortcuts (Cmd/Ctrl+K), and mobile responsiveness.
 *
 * Props:
 *   value       {string}        — Search query value
 *   onChange    {(value) => void} — Change handler (debounced internally)
 *   placeholder {string?}       — Placeholder text
 *   isLoading   {boolean?}      — Shows loading spinner
 *   onClear     {() => void?}   — Clear button handler
 *   shortcut    {string?}       — Keyboard shortcut hint (e.g. '⌘K')
 *   dark        {boolean?}      — Dark theme variant (default true)
 *   className   {string?}
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  isLoading = false,
  onClear,
  shortcut,
  dark = true,
  className = '',
}) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      onChange?.(localValue);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localValue, onChange]);

  // Keyboard shortcut (Cmd/Ctrl+K to focus)
  useEffect(() => {
    if (!shortcut) return;
    
    const handler = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcut]);

  const handleClear = () => {
    setLocalValue('');
    onClear?.();
    inputRef.current?.focus();
  };

  const showClear = localValue && !isLoading;

  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${
        isLoading ? 'text-white/20' : dark ? 'text-white/30' : 'text-muted-foreground/40'
      }`}>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full bg-transparent text-sm rounded-xl pl-10 pr-10 py-2.5
          border outline-none transition-all duration-150
          ${dark 
            ? 'border-white/[0.10] bg-white/[0.03] text-white placeholder:text-white/25 focus:border-white/[0.25] focus:ring-1 focus:ring-white/[0.12]' 
            : 'border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20'
          }
        `}
      />

      {/* Clear button */}
      {showClear && (
        <button
          onClick={handleClear}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-colors ${
            dark ? 'text-white/25 hover:text-white hover:bg-white/[0.05]' : 'text-muted-foreground/40 hover:text-foreground hover:bg-muted'
          }`}
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Shortcut hint */}
      {shortcut && !showClear && (
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium pointer-events-none ${
          dark ? 'text-white/20' : 'text-muted-foreground/40'
        }`}>
          {shortcut}
        </div>
      )}
    </div>
  );
}