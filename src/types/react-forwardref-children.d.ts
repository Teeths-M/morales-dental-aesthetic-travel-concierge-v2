/**
 * Global type patch for shadcn/ui components.
 *
 * shadcn primitives are untyped .jsx files. TypeScript infers React.forwardRef
 * without type params as ForwardRefExoticComponent<RefAttributes<any>>, which
 * has no prop slots — so even `children` and `className` error.
 *
 * Augmenting RefAttributes to include children lets all forwardRef components
 * accept children without editing the generated shadcn source files.
 */
import 'react';

declare module 'react' {
  interface RefAttributes<T> {
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
    value?: string | number | readonly string[];
    defaultValue?: string | number | readonly string[];
    placeholder?: string;
    type?: string;
    name?: string;
    id?: string;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    autoComplete?: string;
    autoFocus?: boolean;
    tabIndex?: number;
    role?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-hidden'?: boolean | 'true' | 'false';
    onChange?: (event: any) => void;
    onKeyDown?: (event: any) => void;
    onKeyUp?: (event: any) => void;
    onFocus?: (event: any) => void;
    onBlur?: (event: any) => void;
    onClick?: (event: any) => void;
    onSubmit?: (event: any) => void;
    asChild?: boolean;
    variant?: string;
    size?: string;
    label?: string;
    htmlFor?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    alignOffset?: number;
    modal?: boolean;
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    multiple?: boolean;
    accept?: string;
    rows?: number;
    cols?: number;
    href?: string;
    target?: string;
    rel?: string;
    src?: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
    title?: string;
    orientation?: 'horizontal' | 'vertical';
    decorative?: boolean;
    collapsible?: boolean;
    dir?: string;
    loop?: boolean;
    delayDuration?: number;
    index?: number;
    center?: [number, number] | { lat: number; lng: number };
    zoom?: number;
    scrollWheelZoom?: boolean;
    zoomControl?: boolean;
    attributionControl?: boolean;
    radius?: number;
    pathOptions?: Record<string, any>;
    url?: string;
    subdomains?: string | string[];
    maxZoom?: number;
    attribution?: string;
    position?: [number, number] | { lat: number; lng: number } | string;
    icon?: any;
    maxWidth?: number;
    minWidth?: number;
    permanent?: boolean;
    interactive?: boolean;
    footer?: ReactNode;
    header?: ReactNode;
    icon?: ReactNode;
    title?: string;
    subtitle?: string;
    description?: string;
    label?: string;
    shortcode?: string | null;
    patientName?: string;
    trigger?: ReactNode;
    content?: ReactNode;
    asChild?: boolean;
    key?: string | number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    inputMode?: string;
    spellCheck?: boolean;
    wrap?: string;
    form?: string;
    list?: string;
    hidden?: boolean;
    draggable?: boolean;
    'data-state'?: string;
    'data-side'?: string;
    'data-align'?: string;
    'data-disabled'?: boolean | string;
    'data-radix-popper-content-wrapper'?: string;
  }
}
