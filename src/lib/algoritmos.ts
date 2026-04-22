// ══════════════════════════════════════════════════════════════════
// ALGORITMOS — rotación de costaleros (ported from HTML sin cambios)
// Las funciones son puras — no tocan DOM ni estado React
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, TramoSlot, Analisis, PinState, DatosPerfil } from './types'
import { defaultNombres } from './nombres'
import { defaultRoles, ordenarDentroFisico } from './roles'

// ── Datos por defecto ──────────────────────────────────────────────

const BANCO_DEFAULT = [
  'Salida Iglesia', 'Calle Real', 'Plaza Mayor', 'Calle Nueva',
  'Vuelta Esquina', 'Bajada Cuesta', 'Paso Puerta', 'Tramo Largo',
  'Calle Ancha', 'Entrada Carrera', 'Final Carrera', 'Calle Estrecha',
]

export function datosVacios(): DatosPerfil {
  return {
    banco: [...BANCO_DEFAULT],
    trabajaderas: Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      nombres: defaultNombres(6),
      salidas: 2,
      roles: defaultRoles(6, i + 1),
      tramos: [`Tramo 1 (T${i + 1})`, `Tramo 2 (T${i + 1})`, `Tramo 3 (T${i + 1})`],
      plan: null, obj: null, analisis: null, pinned: null, bajas: [],
      regla5costaleros: false,
      puntuaciones: {},
      tramosClaves: [],
    })),
  }
}

export function migrarDatos(datos: DatosPerfil): DatosPerfil {
  datos.trabajaderas = datos.trabajaderas.map(t => {
    if (!t.nombres) {
      t.nombres = defaultNombres(6)
    }
    if (!t.salidas) t.salidas = 2
    if (!t.pinned) t.pinned = null
    if (!t.bajas) t.bajas = []
    if (!t.regla5costaleros) t.regla5costaleros = false
    if (!t.roles || t.roles.length !== t.nombres.length) {
      t.roles = defaultRoles(t.nombres.length, t.id)
    }
    if (!t.puntuaciones) t.puntuaciones = {}
    if (!t.tramosClaves) t.tramosClaves = []

    if (t.plan && t.plan[0]?.dentro?.length) {
      const idx = +t.plan[0].dentro[0]
      if (isNaN(idx) || idx >= t.nombres.length) {
        t.plan = null; t.obj = null; t.analisis = null
      }
    }
    return t
  })
  return datos
}

// ── Matemáticas de rotación ────────────────────────────────────────

export function objSalidas(
  total: number,
  numTramos: number,
  salidas: number,
  aplicaRegla5: boolean,
): Record<number, number> {
  const F = aplicaRegla5 ? 1 : (total - 5)
  const plazas = numTramos * F
  const base = Math.floor(plazas / total)
  const extras = plazas % total
  const obj: Record<number, number> = {}
  for (let i = 0; i < total; i++) obj[i] = i < extras ? base + 1 : base
  return obj
}

export function calcularCiclo(t: Trabajadera): { plan: TramoSlot[], objetivo: Record<number, number> } {
  const total = t.nombres.length
  const numTramos = t.tramos.length
  const salidas = t.salidas ?? 2
  const aplicaRegla5 = t.regla5costaleros && total === 5
  const F = aplicaRegla5 ? 1 : (total - 5)
  if (F <= 0 || numTramos <= 0) return { plan: [], objetivo: {} }

  const todos = Array.from({ length: total }, (_, i) => i)
  const obj = objSalidas(total, numTramos, salidas, aplicaRegla5)
  const rest: Record<number, number> = {}
  const ult: Record<number, number> = {}
  todos.forEach(c => { rest[c] = obj[c]; ult[c] = -99 })

  const plan: TramoSlot[] = []
  for (let ti = 0; ti < numTramos; ti++) {
    const esU = ti === numTramos - 1
    const dT0 = esU && plan[0] ? plan[0].fuera : []
    let cands = todos.filter(c => rest[c] > 0 && ult[c] !== ti - 1 && !(esU && dT0.includes(c)))
    if (cands.length < F) cands = todos.filter(c => rest[c] > 0 && ult[c] !== ti - 1)
    if (cands.length < F) cands = todos.filter(c => rest[c] > 0)
    cands.sort((a, b) => {
      if (rest[b] !== rest[a]) return rest[b] - rest[a]
      const aR = esU && dT0.includes(a) ? 1 : 0
      const bR = esU && dT0.includes(b) ? 1 : 0
      if (aR !== bR) return aR - bR
      return ult[a] - ult[b]
    })
    const fuera = cands.slice(0, F)
    fuera.forEach(c => { rest[c]--; ult[c] = ti })
    const dentro = todos.filter(c => !fuera.includes(c)).sort((a, b) => a - b)
    plan.push({ dentro: [...dentro], fuera: [...fuera].sort((a, b) => a - b) })
  }
  return { plan, objetivo: obj }
}

export function tramosOptimos(total: number, salidas: number): number {
  const F = total - 5
  if (F <= 0) return 0
  const base = Math.ceil((total * salidas) / F)
  for (let n = base; n <= base + total * 3; n++) {
    const t: Trabajadera = {
      id: 1, nombres: Array(total).fill(''), tramos: Array(n).fill(''),
      salidas, roles: [], bajas: [], regla5costaleros: false,
      plan: null, obj: null, analisis: null, pinned: null,
      puntuaciones: {}, tramosClaves: [],
    }
    const { plan } = calcularCiclo(t)
    if (!plan || !plan.every(s => s.dentro.length === 5)) continue
    if (plan[0].fuera.filter(c => plan[n - 1].fuera.includes(c)).length === 0) return n
  }
  return base
}

export function analizar(
  plan: TramoSlot[],
  total: number,
  obj: Record<number, number>,
  t?: Trabajadera,
): Analisis {
  const conteo: Record<number, number> = {}
  for (let i = 0; i < total; i++) conteo[i] = 0
  plan.forEach(tramo => tramo.fuera.forEach(i => { conteo[i]++ }))
  const okObj = Object.keys(conteo).every(i => conteo[+i] === (obj[+i] ?? 0))
  const aplicaRegla5 = t?.regla5costaleros && total === 5
  const dentro_esperado = aplicaRegla5 ? 4 : 5
  const dentro5 = plan.every(tramo => tramo.dentro.length === dentro_esperado)
  const primer = plan[0]?.fuera ?? []
  const ultimo = plan[plan.length - 1]?.fuera ?? []
  const rep = primer.filter(c => ultimo.includes(c))
  let cons = 0
  for (let ti = 1; ti < plan.length; ti++) {
    plan[ti].fuera.forEach(c => { if (plan[ti - 1].fuera.includes(c)) cons++ })
  }
  return { conteo, okObj, dentro5, primer, ultimo, rep, cons }
}

// ── Plan Híbrido ───────────────────────────────────────────────────

export function getPinned(t: Trabajadera): PinState[][] {
  if (!t.pinned) {
    t.pinned = Array.from({ length: t.tramos.length }, () =>
      Array<PinState>(t.nombres.length).fill('L'))
  }
  while (t.pinned.length < t.tramos.length) {
    t.pinned.push(Array<PinState>(t.nombres.length).fill('L'))
  }
  t.pinned = t.pinned.slice(0, t.tramos.length)
  t.pinned = t.pinned.map(row => {
    while (row.length < t.nombres.length) row.push('L')
    return row.slice(0, t.nombres.length)
  })
  return t.pinned
}

export function countPinned(t: Trabajadera): { d: number; f: number; total: number } {
  const p = getPinned(t)
  let d = 0, f = 0
  p.forEach(row => row.forEach(v => { if (v === 'D') d++; if (v === 'F' || v === 'LF') f++ }))
  return { d, f, total: d + f }
}

export function validarPinned(t: Trabajadera): string[] {
  const p = getPinned(t)
  const total = t.nombres.length
  const aplicaRegla5 = t.regla5costaleros && total === 5
  const F = aplicaRegla5 ? 1 : (total - 5)
  const nAct = t.tramos.length
  const errs: string[] = []

  for (let ti = 0; ti < nAct; ti++) {
    const row = p[ti]
    const forzDentro = row.filter(v => v === 'D').length
    const forzFuera = row.filter(v => v === 'F' || v === 'LF').length
    const libres = row.filter(v => v === 'L').length
    if (forzDentro > 5) errs.push(`Tramo ${ti + 1}: ${forzDentro} fijados dentro (máx. 5)`)
    if (forzFuera > F) errs.push(`Tramo ${ti + 1}: ${forzFuera} fijados fuera (máx. ${F})`)
    if (forzDentro + libres < 5) errs.push(`Tramo ${ti + 1}: imposible completar 5 dentro con ${forzDentro} fijos y ${libres} libres`)
    if (forzFuera + libres < F) errs.push(`Tramo ${ti + 1}: imposible completar ${F} fuera con ${forzFuera} fijos y ${libres} libres`)
  }
  return errs
}

export interface SugerenciaRes {
  top3: { nombre: string; idx: number; puntuacion: number }[]
  tramosClaves: number[]
  ultimoIdx: number
}

export function generarSugerencias(t: Trabajadera): SugerenciaRes {
  const top3 = t.nombres
    .map((nombre, idx) => ({
      nombre,
      idx,
      puntuacion: t.puntuaciones[nombre] || 0,
    }))
    .filter((x) => x.puntuacion > 0)
    .sort((a, b) => b.puntuacion - a.puntuacion)
    .slice(0, 3)

  return { top3, tramosClaves: t.tramosClaves || [], ultimoIdx: t.tramos.length - 1 }
}

export function aplicarSugerencias(t: Trabajadera): void {
  const { top3, tramosClaves, ultimoIdx } = generarSugerencias(t)
  if (top3.length === 0) {
    throw new Error('¡Error! No hay ningún costalero con valoración asignada (Página de Equipo).')
  }

  const p = getPinned(t)
  const targets = Array.from(new Set([...tramosClaves, ultimoIdx]))

  // 1. Limpiar PINS actuales 'D' en los tramos objetivo
  targets.forEach(ti => {
    if (p[ti]) {
      p[ti] = p[ti].map(v => v === 'D' ? 'L' : v)
    }
  })

  // 2. Aplicar PINS: Los 3 mejores van D (Dentro)
  targets.forEach(ti => {
    if (p[ti]) {
      top3.forEach(c => {
        p[ti][c.idx] = 'D'
      })
    }
  })
}

export function completarAuto(t: Trabajadera): { plan: TramoSlot[]; obj: Record<number, number>; analisis: Analisis } | { error: string[] } {
  const errs = validarPinned(t)
  if (errs.length) return { error: errs }

  const p = getPinned(t)
  const total = t.nombres.length
  const aplicaRegla5 = t.regla5costaleros && total === 5
  const F = aplicaRegla5 ? 1 : (total - 5)
  const nAct = t.tramos.length
  const todos = Array.from({ length: total }, (_, i) => i)
  const salidas = t.salidas ?? 2
  const obj = objSalidas(total, nAct, salidas, aplicaRegla5)

  const usadas: Record<number, number> = {}
  todos.forEach(c => { usadas[c] = 0 })
  for (let ti = 0; ti < nAct; ti++) {
    p[ti].forEach((v, ci) => { if (v === 'F' || v === 'LF') usadas[ci]++ })
  }

  const rest: Record<number, number> = {}
  todos.forEach(c => { rest[c] = Math.max(0, (obj[c] ?? 0) - usadas[c]) })

  const ult: Record<number, number> = {}
  todos.forEach(c => { ult[c] = -99 })
  const plan: TramoSlot[] = []

  for (let ti = 0; ti < nAct; ti++) {
    const row = p[ti]
    const esU = ti === nAct - 1
    const dT0 = esU && plan[0] ? plan[0].fuera : []

    const forzDentro = todos.filter(c => row[c] === 'D')
    const forzFuera = todos.filter(c => row[c] === 'F' || row[c] === 'LF')
    const libres = todos.filter(c => row[c] === 'L')
    const needFuera = F - forzFuera.length

    let candsFuera = libres.filter(c => {
      if (rest[c] <= 0) return false
      if (ult[c] === ti - 1) return false
      if (esU && dT0.includes(c)) return false
      return true
    })
    if (candsFuera.length < needFuera) candsFuera = libres.filter(c => rest[c] > 0 && ult[c] !== ti - 1)
    if (candsFuera.length < needFuera) candsFuera = libres.filter(c => rest[c] > 0)
    if (candsFuera.length < needFuera) candsFuera = libres.filter(c => !forzDentro.includes(c))

    candsFuera.sort((a, b) => {
      if (rest[b] !== rest[a]) return rest[b] - rest[a]
      const aR = esU && dT0.includes(a) ? 1 : 0
      const bR = esU && dT0.includes(b) ? 1 : 0
      if (aR !== bR) return aR - bR
      return ult[a] - ult[b]
    })

    const autoFuera = candsFuera.slice(0, needFuera)
    const fuera = [...forzFuera, ...autoFuera].sort((a, b) => a - b)
    fuera.forEach(c => {
      if (p[ti][c] === 'L' || p[ti][c] === 'LF') { rest[c] = Math.max(0, rest[c] - 1) }
      ult[c] = ti
    })

    const dentro = todos.filter(c => !fuera.includes(c)).sort((a, b) => a - b)
    plan.push({ dentro, fuera })
  }

  // Aplicar orden físico bajo el paso (PAT/COS -> FIJ -> COR -> FIJ -> PAT/COS)
  const planOrdenado = ordenarDentroFisico(t, plan)

  const an = analizar(planOrdenado, total, obj, t)
  return { plan: planOrdenado, obj, analisis: an }
}

export function getFueraPorTramo(t: Trabajadera): number {
  const aplicaRegla5 = t.regla5costaleros && t.nombres.length === 5
  return aplicaRegla5 ? 1 : (t.nombres.length - 5)
}
