import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * "debt" está reservado exclusivamente para adeudos y saldos pendientes.
 * "accent" es para atención/diferenciación general (nunca para errores).
 * "neutral" se usa para estados resueltos (p. ej. una sesión ya pagada):
 * un saldo liquidado nunca debe mostrarse en rojo.
 */
type Variant = "neutral" | "info" | "accent" | "debt";

const variantClasses: Record<Variant, string> = {
  neutral: "bg-dark/[0.06] text-dark",
  info: "bg-blue-secondary/15 text-blue-secondary",
  accent: "bg-orange-accent/15 text-orange-accent",
  debt: "bg-debt-red/10 text-debt-red",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
