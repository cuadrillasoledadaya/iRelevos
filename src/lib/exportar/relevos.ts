// ══════════════════════════════════════════════════════════════════
// RELEVOS — Exportar tablas de relevos para imprimir
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from '../types'
import { mapRelevos } from './mappers/mapRelevos'
import { relevosPage } from './templates/relevosPage'
import { abrirVentanaImpresion } from './engine/print'

export function exportarRelevos(trabajaderas: Trabajadera[]): void {
  const html = trabajaderas
    .map(t => relevosPage(mapRelevos(t)))
    .join('')

  abrirVentanaImpresion(html, 'Relevos de Costaleros', 'relevos')
}

export function exportarRelevosIndividual(t: Trabajadera, costaleroIdx: number, nombreCostalero: string): void {
  const html = relevosPage(mapRelevos(t, costaleroIdx))

  abrirVentanaImpresion(html, `Relevos - ${nombreCostalero}`, 'relevos-individual')
}

export function exportarRelevosMultiplesItems(t: Trabajadera, indices: number[]): void {
  const html = indices
    .map(idx => {
      const pageHTML = relevosPage(mapRelevos(t, idx))
      return `<div style="page-break-after:always; margin-bottom: 40px;">${pageHTML}</div>`
    })
    .join('')

  abrirVentanaImpresion(html, `Relevos - Trabajadera ${t.id}`, 'relevos-individual')
}
