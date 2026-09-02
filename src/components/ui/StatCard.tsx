import { cn } from "@/lib/cn";

type Tone = "neutral" | "debt";

const toneClasses: Record<Tone, string> = {
  neutral: "text-dark",
  debt: "text-debt-red",
};

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  className?: string;
}

export function StatCard({ label, value, hint, tone = "neutral", className }: StatCardProps) {
  return (
    <div className={cn("rounded-md border border-dark/10 bg-background p-5 shadow-soft", className)}>
      <p className="text-xs font-semibold uppercase tracking-wideish text-dark/55">{label}</p>
      <p className={cn("mt-2 font-serif text-2xl", toneClasses[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-dark/50">{hint}</p> : null}
    </div>
  );
}
