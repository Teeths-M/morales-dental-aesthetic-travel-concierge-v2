"use client";
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { useEffect, useRef } from "react"
import { buzz } from "@/lib/buzz"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()
  const prevCountRef = useRef(0)

  // Observe sonner toast changes — buzz whenever a new toast is added
  useEffect(() => {
    const unsubscribe = toast.onChange?.((toasts) => {
      const current = Array.isArray(toasts) ? toasts.length : (toasts?.toasts?.length ?? 0);
      if (current > prevCountRef.current) {
        // Detect type from the newest toast and pick buzz pattern
        const newest = Array.isArray(toasts) ? toasts[0] : toasts?.toasts?.[0];
        const type = newest?.type || 'info';
        buzz(type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info');
      }
      prevCountRef.current = current;
    });
    return () => unsubscribe?.();
  }, []);

  return (
    (<Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />)
  );
}

export { Toaster }
