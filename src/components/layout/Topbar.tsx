import type { ReactNode } from "react";

export function Topbar({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-dark/10 px-10 py-8">
      <div>
        <h1 className="font-serif text-2xl text-dark">{title}</h1>
        {description ? <p className="mt-1 text-sm text-dark/60">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}
