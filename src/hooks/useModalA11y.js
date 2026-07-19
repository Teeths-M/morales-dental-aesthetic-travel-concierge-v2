import { useEffect, useRef } from 'react';

/**
 * useModalA11y — the four things every modal owes a keyboard user.
 *
 * The app had 47 modal overlays and 3 of them handled Escape. Without focus
 * management a modal is not "slightly awkward" for someone using a keyboard or
 * a screen reader — it is a trap in the literal sense: Tab walks out of the
 * dialog into the page behind it, which is still there, still focusable, and
 * now invisible under an overlay. There is no way back except a mouse.
 *
 * Provides:
 *   1. Focus moves INTO the dialog on open (first focusable, or the container).
 *   2. Tab and Shift+Tab cycle within it and cannot escape.
 *   3. Escape closes it — unless it is a gate (see closeOnEscape).
 *   4. Focus returns to whatever was focused before, on close. Losing focus to
 *      <body> is disorienting; a screen reader user is dumped at the top of the
 *      page with no idea what happened.
 *
 * Also locks body scroll, because a scrolling background under a modal is the
 * other thing that makes them feel broken on a phone.
 *
 * @param {object}   opts
 * @param {boolean}  opts.isOpen
 * @param {Function} opts.onClose
 * @param {boolean} [opts.closeOnEscape=true]
 *   Set FALSE for a hard gate — a dialog the user must answer rather than
 *   dismiss (the procedure-selection gate, a safety block). Those still get the
 *   focus trap; they just cannot be escaped out of, because dismissing them
 *   would bypass the decision they exist to force. Do not set this false for
 *   ordinary dialogs: an inescapable modal is its own accessibility failure.
 * @returns {React.RefObject} ref to spread onto the dialog container
 */
export function useModalA11y({ isOpen, onClose, closeOnEscape = true }) {
  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement;

    const FOCUSABLE = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const getFocusable = () => {
      const node = containerRef.current;
      if (!node) return [];
      return Array.from(node.querySelectorAll(FOCUSABLE))
        .filter(el => el.offsetParent !== null || el === document.activeElement);
    };

    // Move focus in. Delayed a frame so entry animations have mounted content.
    const t = setTimeout(() => {
      const items = getFocusable();
      if (items.length) items[0].focus();
      else containerRef.current?.focus();
    }, 50);

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (!items.length) {
        // Nothing focusable inside — keep focus on the container rather than
        // letting Tab wander into the page underneath.
        e.preventDefault();
        containerRef.current?.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Wrap at both ends, and pull focus back if it has already escaped.
      if (e.shiftKey && (active === first || !containerRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !containerRef.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      // Restore focus, but only if the element is still in the document —
      // it may have been unmounted by whatever the dialog just did.
      const prev = previouslyFocused.current;
      if (prev && document.contains(prev) && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [isOpen, onClose, closeOnEscape]);

  return containerRef;
}

export default useModalA11y;
