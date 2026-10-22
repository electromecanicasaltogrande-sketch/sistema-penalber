"use client";

import { useRef, useState } from "react";
import { money } from "@/lib/format";
import { descargarComoPDF } from "@/lib/print-pdf";
import { EMPRESAS } from "@/lib/empresas";
import { amountToWords } from "@/lib/ventas/print";

export interface ReciboLinea {
  comprobante: string;
  detalle: string;
  monto: number;
  fecha?: string;
}

export interface ReciboData {
  titulo: string;
  numero: string;
  cliente: string;
  lineas: ReciboLinea[];
  totalAplicado: number;
  saldoRestante: number;
  fecha: string;
  hora?: string;
  empresaCuit?: string;
  clienteCuit?: string;
  clienteDomicilio?: string;
  clienteLocalidad?: string;
  formaPago?: string;
}

function Contenido({ recibo }: { recibo: ReciboData }) {
  const emp = EMPRESAS.find((e) => e.cuit === recibo.empresaCuit) ?? EMPRESAS[0];
  return (
    <div className="bg-white p-8 text-[12px] text-black">
      <div className="flex items-start justify-between border-b line-40 pb-3">
        <div className="w-1/3">
          <p className="font-bold">{emp.razonSocial}</p>
          <p className="mt-1 leading-snug ink-70">
            {emp.titular.toUpperCase()}
            <br />
            {emp.domicilio}
            <br />
            Tel.: {emp.telefono}
            {emp.email && (
              <>
                <br />
                e-mail: {emp.email}
              </>
            )}
            {emp.whatsapp && (
              <>
                <br />
                WhatsApp {emp.whatsapp}
              </>
            )}
            <br />
            {emp.condicionIva}
          </p>
        </div>
        <div className="flex w-16 flex-col items-center border line-50 py-1 text-center">
          <span className="text-2xl font-bold">X</span>
          <span className="text-[7px] leading-tight">DOCUMENTO NO VÁLIDO COMO FACTURA</span>
        </div>
        <div className="w-1/3 text-right">
          <p className="font-bold uppercase">{recibo.titulo}</p>
          <p>N° {recibo.numero}</p>
          <p className="mt-1.5">CUIT: {emp.cuit}</p>
          <p>Inicio Act.: {emp.inicioActividades}</p>
          <p>Ingresos Brutos: {emp.ingresosBrutos}</p>
          <p>
            Fecha: {recibo.fecha}
            {recibo.hora ? ` ${recibo.hora}` : ""}
          </p>
        </div>
      </div>

      <div className="border-b line-40 py-2">
        <p>
          <b>R.SOC/NOMBRE:</b> {recibo.cliente}
          {recibo.clienteCuit ? `   ${recibo.clienteCuit}` : ""}
        </p>
        <p>
          <b>DIRECCIÓN:</b> {recibo.clienteDomicilio ?? ""}
        </p>
        <p>
          <b>LOCALIDAD:</b> {recibo.clienteLocalidad ?? ""}
        </p>
      </div>

      <p className="mt-3">
        Recibí de <b>{recibo.cliente}</b> la cantidad de <b>PESOS {amountToWords(recibo.totalAplicado)}</b>
      </p>
      <p className="mt-1">para ser afectados a los siguientes comprobantes:</p>

      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="border-b line-40 text-left">
            <th className="py-1">Comprobante imputado</th>
            <th className="py-1">Fecha</th>
            <th className="py-1">Detalle</th>
            <th className="py-1 text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {recibo.lineas.map((l, i) => (
            <tr key={i} className="border-b line-10">
              <td className="py-1">{l.comprobante}</td>
              <td className="py-1">{l.fecha ?? ""}</td>
              <td className="py-1">{l.detalle}</td>
              <td className="py-1 text-right">{l.monto.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 font-bold">Valores recibidos:</p>
      <p>
        {recibo.formaPago ?? "Efectivo"} - Importe: {recibo.totalAplicado.toFixed(2)}
      </p>

      <div className="mt-4 flex justify-end">
        <div className="w-64 text-right">
          <p className="border-t line-40 pt-1.5 text-sm font-bold">MONTO TOTAL RECIBO: {recibo.totalAplicado.toFixed(2)}</p>
          <p className="mt-1 ink-60">Saldo restante: {money(recibo.saldoRestante)}</p>
        </div>
      </div>
      <div className="mt-14 flex justify-end">
        <div className="w-56 border-t line-40 pt-1.5 text-center text-xs ink-60">Firma / Aclaración</div>
      </div>
    </div>
  );
}

export default function ReciboPago({ recibo, onClose }: { recibo: ReciboData; onClose: () => void }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!previewRef.current) return;
    setGuardando(true);
    try {
      await descargarComoPDF(previewRef.current, `${recibo.numero.replace(/\s+/g, "_")}.pdf`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 print:hidden">
        <div className="relative flex max-h-full w-full max-w-lg flex-col rounded-[var(--radius-app)] border border-border bg-surface shadow-lg">
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink-soft shadow-sm hover:text-danger"
          >
            ✕
          </button>
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
              {recibo.titulo}
            </h2>
            <span className="text-xs text-ink-faint">Ya se guardó en el sistema</span>
          </div>

          <div className="overflow-y-auto bg-bg p-4">
            <div ref={previewRef} className="shadow-sm">
              <Contenido recibo={recibo} />
            </div>
          </div>

          <div className="flex gap-2 border-t border-border px-5 py-3.5">
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg disabled:opacity-60"
            >
              {guardando ? "Generando…" : "Guardar"}
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark"
            >
              🖨 Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className="print-only hidden print:block">
        <Contenido recibo={recibo} />
      </div>
    </>
  );
}
