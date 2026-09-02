export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-dark/20 px-6 py-14 text-center">
      <p className="font-serif text-lg text-dark">{title}</p>
      {description ? <p className="text-sm text-dark/60">{description}</p> : null}
    </div>
  );
}
