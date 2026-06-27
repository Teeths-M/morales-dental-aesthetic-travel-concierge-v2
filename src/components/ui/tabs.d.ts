import * as React from 'react';
export declare const Tabs: React.FC<React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (value: string) => void; orientation?: 'horizontal' | 'vertical'; activationMode?: 'automatic' | 'manual' }>;
export declare const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export declare const TabsTrigger: React.FC<React.HTMLAttributes<HTMLButtonElement> & { value: string; disabled?: boolean }>;
export declare const TabsContent: React.FC<React.HTMLAttributes<HTMLDivElement> & { value: string; forceMount?: boolean }>;
