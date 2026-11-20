import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "reward";
type ButtonSize = "md" | "lg" | "sm";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-terracota text-white hover:bg-terracota-oscuro active:bg-terracota-oscuro",
  secondary: "bg-papel text-tinta ring-1 ring-tinta/15 hover:bg-arena/60",
  ghost: "text-tinta/80 hover:bg-tinta/5 hover:text-tinta",
  danger: "bg-papel text-terracota-oscuro ring-1 ring-terracota/40 hover:bg-terracota/10",
  reward: "bg-ocre text-tinta hover:brightness-95",
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
      className={cx("rounded-[var(--radius-card)] bg-papel p-5 ring-1 ring-tinta/10 sm:p-6", className)}
      {...props}
    />
  );
}

export const inputClass =
  "block w-full h-12 rounded-xl bg-white px-4 text-[16px] text-tinta ring-1 ring-tinta/15 placeholder:text-tinta/35 focus:outline-none focus:ring-2 focus:ring-terracota";

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
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-tinta/85">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm font-medium text-terracota-oscuro">{error}</p>
      ) : hint ? (
        <p className="text-sm text-tinta/55">{hint}</p>
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
    info: "bg-arena/60 text-tinta",
    success: "bg-salvia/10 text-salvia ring-1 ring-salvia/25",
    error: "bg-terracota/10 text-terracota-oscuro ring-1 ring-terracota/30",
    reward: "bg-ocre/20 text-tinta ring-1 ring-ocre/50",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-xl px-4 py-3 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "reward" | "success" }) {
  const tones = {
    neutral: "bg-tinta/[0.07] text-tinta/75",
    reward: "bg-ocre/25 text-tinta",
    success: "bg-salvia/12 text-salvia",
  } as const;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
