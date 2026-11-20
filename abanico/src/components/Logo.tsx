import { FanIcon } from "@/components/icons";
import { cx } from "@/components/ui";

export function Logo({ name, className, light = false }: { name: string; className?: string; light?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <FanIcon className={cx("h-7 w-7", light ? "text-ocre" : "text-terracota")} />
      <span className={cx("font-display text-[22px] font-semibold leading-none tracking-tight", light ? "text-papel" : "text-tinta")}>
        {name}
      </span>
    </span>
  );
}
