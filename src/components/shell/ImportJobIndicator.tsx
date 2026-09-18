"use client";

import { useEffect, useState } from "react";
import { useImportJob } from "@/lib/import/ImportJobContext";

export default function ImportJobIndicator() {
  const { job } = useImportJob();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (job) setVisible(true);
  }, [job?.id]);

  useEffect(() => {
    if (job && !job.activo) {
      const t = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(t);
    }
  }, [job?.activo, job?.id]);

  if (!job || !visible) return null;

  const pct = job.total > 0 ? Math.round((job.hecho / job.total) * 100) : 0;

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-72 rounded-[var(--radius-app)] border border-border bg-surface p-3 shadow-lg">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">
          {job.activo ? "Importando lista…" : "Importación completa"}
        </p>
        <button onClick={() => setVisible(false)} className="text-xs text-ink-faint hover:text-ink">
          ✕
        </button>
      </div>
      <p className="mb-1.5 truncate text-[11px] text-ink-faint" title={job.archivo}>
        {job.archivo} · hoja &quot;{job.hoja}&quot;
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
        <div
          className="h-full bg-copper transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-soft">
        {job.hecho} / {job.total} ({pct}%) · nuevos {job.nuevos} · actualizados {job.actualizados}
        {job.errores > 0 ? ` · errores ${job.errores}` : ""}
      </p>
    </div>
  );
}
