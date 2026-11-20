import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "reward";
type ButtonSize = "md" | "lg" | "sm";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-cafe text-crema hover:bg-cafe/90 active:bg-cafe/80",
  secondary: "bg-papel text-cafe ring-1 ring-cafe/15 hover:bg-limon-suave/60",
  ghost: "text-cafe/80 hover:bg-cafe/5 hover:text-cafe",
  danger: "bg-papel text-alerta ring-1 ring-alerta/40 hover:bg-alerta/10",
  reward: "bg-limon text-cafe ring-1 ring-cafe/15 hover:brightness-95",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-5 text-[15px] rounded-xl",
  lg: "h-14 px-6 text-base rounded-2xl",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 font-semibold transition select-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-[var(--radius-card)] bg-papel p-5 ring-1 ring-cafe/10 sm:p-6", className)}
      {...props}
    />
  );
}

export const inputClass =
  "block w-full h-12 rounded-xl bg-white px-4 text-[16px] text-cafe ring-1 ring-cafe/15 placeholder:text-cafe/35 focus:outline-none focus:ring-2 focus:ring-cafe";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputClass, "h-auto py-3 leading-relaxed", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-cafe/85">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm font-medium text-alerta">{error}</p>
      ) : hint ? (
        <p className="text-sm text-cafe/55">{hint}</p>
      ) : null}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "success" | "error" | "reward";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-limon-suave/70 text-cafe",
    success: "bg-limon-suave text-cafe ring-1 ring-limon",
    error: "bg-alerta/[0.07] text-alerta ring-1 ring-alerta/30",
    reward: "bg-limon/50 text-cafe ring-1 ring-limon",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-xl px-4 py-3 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "reward" | "success" }) {
  const tones = {
    neutral: "bg-cafe/[0.07] text-cafe/75",
    reward: "bg-limon text-cafe",
    success: "bg-azul/30 text-cafe",
  } as const;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
