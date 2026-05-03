// ══════════════════════════════════════════════════════════════════
// TRABAJADERA STORE — Slice de mutaciones de costaleros y tramos
// (Phase 4.1)
// Cada acción delega en mutar() que opera sobre el projectStore.
// ══════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import { defaultRoles } from '@/lib/roles'
import { tramosOptimos, aplicarSugerencias } from '@/lib/algoritmos'
import type { DatosPerfil, RolCode, Trabajadera } from '@/lib/types'

export interface TrabajaderaStore {
  setNombre: (tid: number, i: number, nombre: string) => void
  addCost: (tid: number) => void
  delCost: (tid: number, i: number) => void
  toggleBaja: (tid: number, i: number) => boolean
  setRolPri: (tid: number, i: number, rol: string) => void
  setRolSec: (tid: number, i: number, rol: string) => void
  toggleRegla5: (tid: number) => void
  addTrab: () => void
  setPuntuacion: (tid: number, nombre: string, pts: number) => void
  addCostUltimo: (tid: number, nombre: string, roles: string[]) => void
  setNombreTramo: (tid: number, ti: number, nombre: string) => void
  addTramo: (tid: number) => void
  delTramo: (tid: number, ti: number) => void
  setSalidas: (tid: number, salidas: number) => void
  usarBanco: (tid: number, ti: number, nombre: string) => void
  sugerirTramos: (tid: number, targetSalidas?: number) => void
  toggleTramoClave: (tid: number, ti: number) => void
  sugerirYCalcular: (tid: number) => void
}

type MutarFn = (fn: (draft: DatosPerfil) => void) => void
type GetTrabFn = (d: DatosPerfil, tid: number) => Trabajadera

/**
 * Crea el store de trabajadera. Recibe mutar() y getTrab() como
 * dependencias inyectadas (provistas por el root store).
 */
export function createTrabajaderaStore(
  mutar: MutarFn,
  getTrabFn: GetTrabFn,
) {
  return create<TrabajaderaStore>()(() => ({
    // ── Costaleros ───────────────────────────────────────────────

    setNombre: (tid, i, nombre) => {
      mutar(d => {
        getTrabFn(d, tid).nombres[i] = nombre
      })
    },

    addCost: (tid) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        t.nombres.push(`Costalero ${t.nombres.length + 1}`)
        if (!t.roles) t.roles = defaultRoles(t.nombres.length - 1, tid)
        t.roles.push({ pri: 'COR', sec: 'FIJ' })
        t.plan = null
        t.obj = null
        t.analisis = null
        t.pinned = null
      })
    },

    delCost: (tid, i) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        const bajas = t.bajas ?? []
        t.nombres.splice(i, 1)
        t.roles?.splice(i, 1)
        t.bajas = bajas.filter(b => b !== i).map(b => (b > i ? b - 1 : b))
        t.plan = null
        t.obj = null
        t.analisis = null
        t.pinned = null
      })
    },

    toggleBaja: (tid, i): boolean => {
      let ok = true
      mutar(d => {
        const t = getTrabFn(d, tid)
        if (!t.bajas) t.bajas = []
        const idx = t.bajas.indexOf(i)
        if (idx >= 0) {
          t.bajas.splice(idx, 1)
        } else {
          const activos = t.nombres.length - t.bajas.length
          if (activos <= 6) {
            ok = false
            return
          }
          t.bajas.push(i)
        }
        t.plan = null
        t.obj = null
        t.analisis = null
        t.pinned = null
      })
      return ok
    },

    setRolPri: (tid, i, rol) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        if (!t.roles[i]) t.roles[i] = { pri: 'COR', sec: 'FIJ' }
        t.roles[i].pri = rol as RolCode
        if (t.roles[i].sec === rol) t.roles[i].sec = 'COR'
        if (t.plan) t.plan.forEach(slot => {
          delete slot.dentroFisico
        })
        t.analisis = null
      })
    },

    setRolSec: (tid, i, rol) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        if (!t.roles[i]) t.roles[i] = { pri: 'COR', sec: 'FIJ' }
        t.roles[i].sec = rol as RolCode
        if (t.plan) t.plan.forEach(slot => {
          delete slot.dentroFisico
        })
        t.analisis = null
      })
    },

    toggleRegla5: (tid) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        t.regla5costaleros = !t.regla5costaleros
        t.plan = null
        t.obj = null
        t.analisis = null
        t.pinned = null
      })
    },

    addTrab: () => {
      mutar(d => {
        const nextId = d.trabajaderas.length + 1
        d.trabajaderas.push({
          id: nextId,
          nombres: [
            'Costalero 1', 'Costalero 2', 'Costalero 3',
            'Costalero 4', 'Costalero 5', 'Costalero 6',
          ],
          salidas: 2,
          roles: defaultRoles(6, nextId),
          tramos: [
            `Tramo 1 (T${nextId})`,
            `Tramo 2 (T${nextId})`,
            `Tramo 3 (T${nextId})`,
          ],
          plan: null,
          obj: null,
          analisis: null,
          pinned: null,
          bajas: [],
          regla5costaleros: false,
          puntuaciones: {},
          tramosClaves: [],
        })
      })
    },

    setPuntuacion: (tid, nombre, pts) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        if (!t.puntuaciones) t.puntuaciones = {}
        t.puntuaciones[nombre] = pts
      })
    },

    addCostUltimo: (tid, nombre, roles) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        const nuevoIdx = t.nombres.length
        t.nombres.push(nombre)
        t.roles.push({
          pri: roles[0] as RolCode,
          sec: (roles[1] || 'COR') as RolCode,
        })
        if (t.plan) {
          t.plan.forEach(slot => {
            slot.fuera.push(nuevoIdx)
          })
        }
        if (t.pinned) {
          t.pinned.forEach(row => row.push('L'))
        }
        t.obj = null
        t.analisis = null
      })
    },

    // ── Tramos ───────────────────────────────────────────────────

    setNombreTramo: (tid, ti, nombre) => {
      mutar(d => {
        getTrabFn(d, tid).tramos[ti] = nombre
      })
    },

    addTramo: (tid) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        t.tramos.push(`Tramo ${t.tramos.length + 1} (T${tid})`)
        t.plan = null
        t.obj = null
        t.analisis = null
        t.pinned = null
      })
    },

    delTramo: (tid, ti) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        t.tramos.splice(ti, 1)
        t.plan = null
        t.obj = null
        t.analisis = null
        t.pinned = null
      })
    },

    setSalidas: (tid, salidas) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        t.salidas = salidas
        t.plan = null
        t.obj = null
        t.analisis = null
        t.pinned = null
      })
    },

    usarBanco: (tid, ti, nombre) => {
      mutar(d => {
        getTrabFn(d, tid).tramos[ti] = nombre
      })
    },

    sugerirTramos: (tid, targetSalidas?) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        if (targetSalidas !== undefined) t.salidas = targetSalidas
        const nActivos = t.nombres.length - (t.bajas?.length ?? 0)
        const nOpt = tramosOptimos(nActivos, t.salidas ?? 2)
        const actual = t.tramos.length
        if (actual < nOpt) {
          for (let i = actual; i < nOpt; i++) {
            t.tramos.push(`Tramo ${i + 1} (T${tid})`)
          }
        } else if (actual > nOpt) {
          t.tramos = t.tramos.slice(0, nOpt)
        }
        t.plan = null
        t.obj = null
        t.analisis = null
        t.pinned = null
      })
    },

    toggleTramoClave: (tid, ti) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        if (!t.tramosClaves) t.tramosClaves = []
        const idx = t.tramosClaves.indexOf(ti)
        if (idx >= 0) {
          t.tramosClaves.splice(idx, 1)
        } else {
          t.tramosClaves.push(ti)
        }
        t.tramosClaves.sort((a, b) => a - b)
      })
    },

    sugerirYCalcular: (tid) => {
      mutar(d => {
        const t = getTrabFn(d, tid)
        try {
          aplicarSugerencias(t)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          if (typeof alert !== 'undefined') alert(msg)
        }
      })
    },
  }))
}
