// ══════════════════════════════════════════════════════════════════
// PDF MASIVO — Una página por costalero para WhatsApp
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from '../types'
import { mapMasivo } from './mappers/mapMasivo'
import { masivoPage } from './templates/masivoPage'
import { masivoBaseCSS } from './styles/masivo'

export function exportarPDFMasivoTodas(trabajaderas: Trabajadera[], nombrePaso: string): void {
  const conPlan = trabajaderas.filter(t => t.plan && t.analisis)
  if (!conPlan.length) {
    alert('⚠ Calcula las rotaciones de al menos una trabajadera primero.')
    return
  }

  const paginas: string[] = []

  conPlan.forEach(t => {
    const activos = t.nombres
      .map((nombre, ci) => ({ nombre, ci }))
      .filter(({ ci }) => !t.bajas?.includes(ci))

    activos.forEach(({ nombre: nombreCostalero, ci: costaleroIdx }) => {
      const data = mapMasivo(t, nombreCostalero, costaleroIdx, nombrePaso)
      paginas.push(masivoPage(data))
    })
  })

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Relevos — ${nombrePaso}</title>
<style>${masivoBaseCSS()}</style></head><body>${paginas.join('')}<script>window.onload=function(){window.print();}<\/script></body></html>`

  const win = window.open('', '_blank')
  if (!win) { alert('⚠ Permite ventanas emergentes para generar el PDF.'); return }
  win.document.write(html)
  win.document.close()
}
