import React from 'react';
import { cn } from '@/lib/utils';
import { useMobileTheme } from '@/context/MobileThemeContext';

/**
 * MSafeThemeScope — puts the resolved day/night theme onto the DOM for exactly
 * the screens it should reach.
 *
 * `active` is the scope guard, not a style switch: when it is false (the public
 * marketing site, the landing page, or a signed-out visitor) no attribute and no
 * `dark` class is written at all, so the public site renders byte-identically to
 * how it did before this existed. Nothing here reloads or remounts anything —
 * the attribute simply changes, and the tokens underneath it change with it.
 *
 * The `dark` class is the app's existing token switch (src/index.css), so any
 * component already built on semantic tokens follows the theme for free, while
 * screens that hardcode their own colours keep their own look until they are
 * revisited screen by screen.
 */
export default function MSafeThemeScope({ active = false, className, children, ...rest }) {
  const { resolved } = useMobileTheme();

  if (!active) {
    return <div className={className} {...rest}>{children}</div>;
  }

  return (
    <div
      data-msafe-theme={resolved}
      className={cn(resolved === 'night' && 'dark', className)}
      {...rest}
    >
      {children}
    </div>
  );
}