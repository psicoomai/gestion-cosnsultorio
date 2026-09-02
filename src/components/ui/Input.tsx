import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded border border-dark/20 bg-background px-3 text-sm text-dark placeholder:text-dark/35",
        "focus:border-blue-accent/60 focus:outline-none focus:ring-2 focus:ring-blue-accent/20",
        "disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
