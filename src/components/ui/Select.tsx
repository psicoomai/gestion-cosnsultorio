import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded border border-dark/20 bg-background px-3 text-sm text-dark",
        "focus:border-blue-accent/60 focus:outline-none focus:ring-2 focus:ring-blue-accent/20",
        "disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);

Select.displayName = "Select";
