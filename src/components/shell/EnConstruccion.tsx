export default function EnConstruccion({ modulo }: { modulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-app)] border border-dashed border-border bg-surface px-6 py-20 text-center">
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
        {modulo}
      </p>
      <p className="mt-1.5 max-w-sm text-sm text-ink-faint">
        Este módulo todavía no está construido. Se va agregando en orden según
        el plan del sistema.
      </p>
    </div>
  );
}
