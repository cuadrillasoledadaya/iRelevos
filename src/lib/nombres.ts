// ══════════════════════════════════════════════════════════════════
// NOMBRES — utilidades de texto (ported from HTML sin cambios)
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera } from './types'

export function esc(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
}

export function nameAt(t: Trabajadera, idx: number): string {
  const i = +idx
  return t.nombres[i] ?? (i + 1).toString()
}

export function shortName(nombre: string): string {
  const s = String(nombre || '')
  const m = s.match(/^costalero\s+(\d+)$/i)
  if (m) return `C${m[1]}`
  const parts = s.trim().split(/\s+/)
  if (parts.length > 1) return parts[0].slice(0, 8)
  return s.slice(0, 8) || '?'
}

export function pillName(t: Trabajadera, idx: number): string {
  return shortName(nameAt(t, idx))
}

export function defaultNombres(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Costalero ${i + 1}`)
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 9)
}
