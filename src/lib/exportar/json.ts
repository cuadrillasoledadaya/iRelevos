// ══════════════════════════════════════════════════════════════════
// JSON — Exportar/importar datos en formato JSON
// ══════════════════════════════════════════════════════════════════

import type { Perfil } from '../types'
import { newId } from '../nombres'
import { migrarDatos } from '../algoritmos'

export function exportarDatos(datos: unknown): void {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `costaleros_backup_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportarPerfil(p: Perfil): void {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const fecha = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `perfil_${p.nombre.replace(/[^a-z0-9]/gi, '_')}_${fecha}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportResult = 
  | { ok: true; perfiles: Perfil[]; message: string }
  | { ok: false; error: string }

export function parsearImport(text: string, fileName: string): ImportResult {
  try {
    const p = JSON.parse(text)

    // FORMATO 1: perfil individual
    if (p.datos && p.nombre && p.id) {
      const perfil: Perfil = { ...p, id: newId(), creadoEn: Date.now() }
      perfil.datos = migrarDatos(perfil.datos)
      return { ok: true, perfiles: [perfil], message: `✓ Perfil "${perfil.nombre}" importado` }
    }

    // FORMATO 2: backup completo {id1:{...}, id2:{...}}
    const valores = Object.values(p) as Perfil[]
    if (valores.length > 0 && valores.every(v => v && v.datos && v.nombre)) {
      const perfiles = valores.map(v => {
        const nuevo: Perfil = { ...v, id: newId(), creadoEn: v.creadoEn ?? Date.now() }
        nuevo.datos = migrarDatos(nuevo.datos)
        return nuevo
      })
      return { ok: true, perfiles, message: `✓ ${perfiles.length} perfil${perfiles.length > 1 ? 'es' : ''} importado${perfiles.length > 1 ? 's' : ''}` }
    }

    // FORMATO 3: legacy con trabajaderas directamente
    if (p.trabajaderas) {
      const nombre = fileName.replace(/\.json$/i, '').replace(/[_-]/g, ' ') || 'Importado'
      const perfil: Perfil = { id: newId(), nombre, creadoEn: Date.now(), datos: migrarDatos(p) }
      return { ok: true, perfiles: [perfil], message: `✓ Datos importados como perfil "${nombre}"` }
    }

    return { ok: false, error: 'El archivo no tiene un formato reconocido' }
  } catch (err: unknown) {
    return { ok: false, error: `Error al importar: ${err instanceof Error ? err.message : 'desconocido'}` }
  }
}
