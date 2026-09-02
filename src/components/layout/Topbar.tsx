export function Topbar({ title, description }: { title: string; description?: string }) {
  return (
    <header className="flex items-baseline justify-between border-b border-dark/10 px-10 py-8">
      <div>
        <h1 className="font-serif text-2xl text-dark">{title}</h1>
        {description ? <p className="mt-1 text-sm text-dark/60">{description}</p> : null}
      </div>
    </header>
  );
}
