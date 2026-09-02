import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "info" | "accent" | "debt";

const variantClasses: Record<Variant, string> = {
  info: "border-blue-secondary/30 bg-blue-secondary/[0.06] text-dark",
  accent: "border-orange-accent/30 bg-orange-accent/[0.06] text-dark",
  debt: "border-debt-red/30 bg-debt-red/[0.06] text-dark",
};

const dotClasses: Record<Variant, string> = {
  info: "bg-blue-secondary",
  accent: "bg-orange-accent",
  debt: "bg-debt-red",
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  title: string;
}

export function Alert({ className, variant = "info", title, children, ...props }: AlertProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border px-4 py-3 text-sm",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dotClasses[variant])} />
      <div>
        <p className="font-medium">{title}</p>
        {children ? <p className="mt-0.5 text-dark/70">{children}</p> : null}
      </div>
    </div>
  );
}
