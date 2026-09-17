import { saldo, type CtaCteComprobante } from "./types";

export interface AplicacionPago {
  comprobante: CtaCteComprobante;
  montoAplicado: number;
  saldoRestante: number;
}

export interface DistribuirPagoResult {
  aplicaciones: AplicacionPago[];
  aplicado: number;
  sobrante: number;
}

/**
 * Reparte un importe entregado por el cliente entre los comprobantes
 * objetivo (los seleccionados, o todos los pendientes filtrados —
 * más viejos primero — si no se seleccionó ninguno). Si `descuento10`
 * está activo, cada peso entregado cancela 1/0.9 de deuda (10% off).
 */
export function distribuirPago(
  monto: number,
  objetivos: CtaCteComprobante[],
  descuento10: boolean,
): DistribuirPagoResult {
  let restante = monto;
  const aplicaciones: AplicacionPago[] = [];

  const ordenados = [...objetivos].sort((a, b) => a.fecha.localeCompare(b.fecha));

  for (const cp of ordenados) {
    if (restante <= 0) break;
    const saldoAntes = saldo(cp);
    const objetivoPeso = descuento10 ? saldoAntes * 0.9 : saldoAntes;
    if (objetivoPeso <= 0) continue;
    const aplicar = Math.min(restante, objetivoPeso);
    const cancelaDeuda = descuento10 ? aplicar / 0.9 : aplicar;
    const nuevoMontoPagado = cp.montoPagado + cancelaDeuda;
    restante -= aplicar;
    aplicaciones.push({
      comprobante: { ...cp, montoPagado: nuevoMontoPagado },
      montoAplicado: aplicar,
      saldoRestante: Math.max(0, cp.total - nuevoMontoPagado),
    });
  }

  return { aplicaciones, aplicado: monto - restante, sobrante: restante };
}
