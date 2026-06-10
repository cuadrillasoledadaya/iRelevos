// ══════════════════════════════════════════════════════════════════
// PDF CAPATAZ — Hoja del capataz con análisis de rotaciones
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from '../types'
import { mapCapataz } from './mappers/mapCapataz'
import { capatazPage } from './templates/capatazPage'
import { capatazBaseCSS } from './styles/capataz'

export function exportarPDF(trabajaderas: Trabajadera[], fecha?: string): void {
  const conPlan = trabajaderas.filter(t => t.plan && t.analisis)
  if (!conPlan.length) {
    alert('⚠ Calcula las rotaciones de al menos una trabajadera primero.')
    return
  }

  const paginas = conPlan
    .map(t => capatazPage(mapCapataz(t, fecha)))
    .join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Hoja del Capataz — Costaleros</title>
<style>${capatazBaseCSS()}</style></head><body>${paginas}<script>window.onload=function(){window.print();}<\/script></body></html>`

  const win = window.open('', '_blank')
  if (!win) { alert('⚠ Permite ventanas emergentes para generar el PDF.'); return }
  win.document.write(html)
  win.document.close()
}
