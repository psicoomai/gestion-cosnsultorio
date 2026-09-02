import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded border border-dark/20 bg-background px-3 py-2 text-sm text-dark placeholder:text-dark/35",
        "focus:border-blue-accent/60 focus:outline-none focus:ring-2 focus:ring-blue-accent/20",
        "disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
