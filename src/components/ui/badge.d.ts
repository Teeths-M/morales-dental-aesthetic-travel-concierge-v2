import * as React from 'react';
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}
export declare function Badge(props: BadgeProps): React.ReactElement;
export declare const badgeVariants: (props?: { variant?: BadgeVariant; className?: string }) => string;
