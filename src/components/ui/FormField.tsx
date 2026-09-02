import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function FormField({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wideish text-dark/60">
        {label}
        {required ? <span className="text-dark/40"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-dark/45">{hint}</p> : null}
    </div>
  );
}
