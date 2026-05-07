// ══════════════════════════════════════════════════════════════════
// HTML HELPERS — Re-exports from engine + hoyFormateado
// ══════════════════════════════════════════════════════════════════

export { buildPrintDoc, abrirVentanaImpresion } from './engine/print'

export function hoyFormateado(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase())
}
