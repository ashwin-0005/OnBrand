export function PagePlaceholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-4xl font-bold">{title}</h1>
      <p className="mt-6 rounded-[var(--radius-card)] bg-card-light p-8 text-muted">This page is built in {phase}.</p>
    </div>
  );
}
