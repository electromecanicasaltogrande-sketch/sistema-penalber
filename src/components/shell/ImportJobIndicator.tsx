"use client";

import { useEffect, useRef } from "react";
import { useImportJob, type ImportJobState } from "@/lib/import/ImportJobContext";

export default function ImportJobIndicator() {
  const { jobs, cerrar } = useImportJob();

  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-72 flex-col gap-2.5">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onClose={() => cerrar(job.id)} />
      ))}
    </div>
  );
}

function JobCard({ job, onClose }: { job: ImportJobState; onClose: () => void }) {
  const { cerrar } = useImportJob();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!job.activo) {
      timerRef.current = setTimeout(() => cerrar(job.id), 6000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [job.activo, job.id, cerrar]);

  const pct = job.total > 0 ? Math.round((job.hecho / job.total) * 100) : 0;

  return (
    <div className="rounded-[var(--radius-app)] border border-border bg-surface p-3 shadow-lg">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">
          {job.activo ? "Importando lista…" : "Importación completa"}
        </p>
        <button onClick={onClose} className="text-xs text-ink-faint hover:text-ink">
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
