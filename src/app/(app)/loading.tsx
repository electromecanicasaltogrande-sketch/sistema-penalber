export default function Loading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-border/60" />
      <div className="h-32 animate-pulse rounded-[var(--radius-app)] bg-border/40" />
      <div className="h-64 animate-pulse rounded-[var(--radius-app)] bg-border/40" />
    </div>
  );
}
