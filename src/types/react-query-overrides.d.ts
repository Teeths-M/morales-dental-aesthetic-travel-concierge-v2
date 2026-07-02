// Global override: changes useMutation's TVariables default from void → any.
// Without this, TanStack Query v5 types every mutationFn parameter as void in JS
// projects (no TypeScript generics on the call site), causing hundreds of spurious
// type errors when passing variables to mutate().
import type {
  UseMutationOptions,
  UseMutationResult,
  QueryClient,
} from '@tanstack/react-query';

declare module '@tanstack/react-query' {
  export function useMutation<
    TData = unknown,
    TError = Error,
    TVariables = any,
    TContext = unknown,
  >(
    options: UseMutationOptions<TData, TError, TVariables, TContext>,
    queryClient?: QueryClient,
  ): UseMutationResult<TData, TError, TVariables, TContext>;
}
