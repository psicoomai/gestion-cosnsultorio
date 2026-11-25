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
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-dark/10 px-4 py-5 md:px-10 md:py-8">
      <div>
        <h1 className="font-serif text-2xl text-dark">{title}</h1>
        {description ? <p className="mt-1 text-sm text-dark/60">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
