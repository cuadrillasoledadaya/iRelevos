// ══════════════════════════════════════════════════════════════════
// ROLES — lógica de roles y posición física (ported from HTML)
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, Rol, RolCode, TramoSlot } from './types'

export const ROL_JERARQUIA: Record<RolCode, number> = {
  PAT: 3, COS: 3, FIJ: 2, COR: 1,
}

export function rolesDisponibles(tid: number): RolCode[] {
  return (tid === 1 || tid === 7) ? ['PAT', 'FIJ', 'COR'] : ['COS', 'FIJ', 'COR']
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function rolLabel(r: RolCode, _tid?: number): string {
  const m: Record<RolCode, string> = { PAT: 'Patero', COS: 'Costero', FIJ: 'Fijador', COR: 'Corriente' }
  return m[r] ?? r
}

export function rolEmoji(r: RolCode): string {
  const m: Record<RolCode, string> = { PAT: '⚓', COS: '⚓', FIJ: '🔩', COR: '〰️' }
  return m[r] ?? '?'
}

export function defaultRoles(n: number, tid: number): Rol[] {
  const roles: Rol[] = []
  for (let i = 0; i < n; i++) {
    const esPrimero = tid === 1 || tid === 7
    if (i < 2) roles.push({ pri: esPrimero ? 'PAT' : 'COS', sec: 'FIJ' })
    else if (i < 4) roles.push({ pri: 'FIJ', sec: esPrimero ? 'PAT' : 'COS' })
    else roles.push({ pri: 'COR', sec: 'FIJ' })
  }
  return roles
}

export function getRol(t: Trabajadera, i: number): Rol {
  return t.roles?.[i] ?? { pri: 'COR', sec: 'FIJ' }
}

export function esRolHabitual(t: Trabajadera, ci: number, rol: RolCode | null): boolean {
  if (rol === null) return true
  const r = getRol(t, ci)
  return r.pri === rol || r.sec === rol
}

export function idealRoles(tid: number): Partial<Record<RolCode, number>> {
  return (tid === 1 || tid === 7)
    ? { PAT: 2, FIJ: 2, COR: 1 }
    : { COS: 2, FIJ: 2, COR: 1 }
}

export function estructuraPaso(tid: number): RolCode[] {
  const esPriUlt = tid === 1 || tid === 7
  return esPriUlt
    ? ['PAT', 'FIJ', 'COR', 'FIJ', 'PAT']
    : ['COS', 'FIJ', 'COR', 'FIJ', 'COS']
}

export function rolDePosicion(t: Trabajadera, posIdx: number): RolCode {
  return estructuraPaso(t.id)[posIdx] ?? 'COR'
}

// Memoization cache para asignarRolesTramo
const _asignarRolesCache = new Map<string, Map<number, RolCode>>()
const MAX_PERMUTACIONES = 8 // >8! = 40320, usamos greedy

/**
 * Asigna roles óptimos a los costaleros dentro de un tramo.
 *
 * Complejidad:
 *  - Para ≤8 candidatos: O(n!) fuerza bruta (n ≤ 8 → max 40,320 permutaciones)
 *  - Para >8 candidatos: O(n²) greedy heurístico
 *
 * Memoiza por (tid, dentroIdxs) para evitar recálculos.
 */
export function asignarRolesTramo(
  t: Trabajadera,
  dentroIdxs: number[],
): Map<number, RolCode> {
  const estructura = estructuraPaso(t.id)
  const nPuestos = estructura.length
  const asignados = new Map<number, RolCode>()

  if (dentroIdxs.length === 0) return asignados

  // Memoization: evitar recalcular para el mismo (tid, dentroIdxs)
  const cacheKey = `${t.id}|${dentroIdxs.join(',')}`
  const cached = _asignarRolesCache.get(cacheKey)
  if (cached) return new Map(cached)

  const candidatos = dentroIdxs.slice(0, nPuestos)
  const extras = dentroIdxs.slice(nPuestos)

  let elMejorMapeo: Map<number, RolCode> | null = null

  if (candidatos.length <= MAX_PERMUTACIONES) {
    // ── FUERZA BRUTA ─────────────────────────────────────────────
    let mejorPuntuacion = -Infinity

    const calcularPuntuacion = (permutacion: number[]): number => {
      let score = 0
      for (let i = 0; i < permutacion.length; i++) {
        const ci = permutacion[i]
        const rolNecesario = estructura[i]
        const rolesCostalero = getRol(t, ci)

        if (rolesCostalero.pri === rolNecesario) {
          score += 100
        } else if (rolesCostalero.sec === rolNecesario) {
          score += 50
        } else {
          score -= 1000
        }
      }
      return score
    }

    const permutate = (arr: number[], m: number[] = []): Map<number, RolCode> | null => {
      if (arr.length === 0) {
        const score = calcularPuntuacion(m)
        if (score > mejorPuntuacion) {
          mejorPuntuacion = score
          const mapping = new Map<number, RolCode>()
          for (let i = 0; i < m.length; i++) {
            mapping.set(m[i], estructura[i])
          }
          return mapping
        }
        return null
      }

      let localMejorMapping: Map<number, RolCode> | null = null
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice()
        const next = curr.splice(i, 1)
        const res = permutate(curr, m.concat(next))
        if (res) localMejorMapping = res
      }
      return localMejorMapping
    }

    elMejorMapeo = permutate(candidatos)
  } else {
    // ── GREEDY HEURÍSTICO ────────────────────────────────────────
    // Para cada posición, elegir el costalero no usado con mejor score.
    const usados = new Set<number>()
    elMejorMapeo = new Map<number, RolCode>()

    for (let pos = 0; pos < estructura.length; pos++) {
      const rolNecesario = estructura[pos]
      let mejorCi = -1
      let mejorScore = -Infinity

      for (const ci of candidatos) {
        if (usados.has(ci)) continue
        const r = getRol(t, ci)
        let score = 0
        if (r.pri === rolNecesario) score = 100
        else if (r.sec === rolNecesario) score = 50
        else score = -1000

        if (score > mejorScore) {
          mejorScore = score
          mejorCi = ci
        }
      }

      if (mejorCi !== -1) {
        elMejorMapeo.set(mejorCi, rolNecesario)
        usados.add(mejorCi)
      }
    }
  }

  if (elMejorMapeo) {
    elMejorMapeo.forEach((rol, ci) => asignados.set(ci, rol))
  }

  extras.forEach(ci => {
    if (!asignados.has(ci)) asignados.set(ci, 'COR')
  })

  // Guardar en cache (copia defensiva)
  _asignarRolesCache.set(cacheKey, new Map(asignados))
  return asignados
}

export function getDentroFisico(t: Trabajadera, slot: TramoSlot): (number | null)[] {
  if (slot.dentroFisico) return slot.dentroFisico
  const asig = asignarRolesTramo(t, slot.dentro)
  const estructura = estructuraPaso(t.id)
  const porRol: Partial<Record<RolCode, number[]>> = {}
  asig.forEach((rol, ci) => {
    if (!porRol[rol]) porRol[rol] = []
    porRol[rol]!.push(ci)
  })
  const fisico: (number | null)[] = []
  const usados = new Set<number>()
  estructura.forEach(rol => {
    const disp = (porRol[rol] ?? []).filter(ci => !usados.has(ci))
    if (disp.length > 0) { fisico.push(disp[0]); usados.add(disp[0]) }
    else fisico.push(null)
  })

  // Evitar perder costaleros: los que no entraron en su rol ideal van a los huecos libres
  const noUsados = slot.dentro.filter(ci => !usados.has(ci))
  for (let i = 0; i < fisico.length; i++) {
    if (fisico[i] === null && noUsados.length > 0) {
      fisico[i] = noUsados.shift()!
    }
  }

  slot.dentroFisico = fisico
  return fisico
}

export function ordenarDentroFisico(t: Trabajadera, plan: TramoSlot[]): TramoSlot[] {
  plan.forEach(slot => {
    if (!slot.dentro || slot.dentro.length === 0) return
    const asig = asignarRolesTramo(t, slot.dentro)
    const estructura = estructuraPaso(t.id)
    const porRol: Partial<Record<RolCode, number[]>> = {}
    asig.forEach((rol, ci) => {
      if (!porRol[rol]) porRol[rol] = []
      porRol[rol]!.push(ci)
    })
    const nuevoDentro: (number | null)[] = []
    const usados = new Set<number>()
    estructura.forEach(rol => {
      const disponibles = (porRol[rol] ?? []).filter(ci => !usados.has(ci))
      if (disponibles.length > 0) {
        nuevoDentro.push(disponibles[0])
        usados.add(disponibles[0])
      } else {
        nuevoDentro.push(null)
      }
    })

    // Recuperar costaleros que no encajaron en roles y llenar los huecos
    const noUsados = slot.dentro.filter(ci => !usados.has(ci))
    for (let i = 0; i < nuevoDentro.length; i++) {
      if (nuevoDentro[i] === null && noUsados.length > 0) {
        nuevoDentro[i] = noUsados.shift()!
      }
    }
    // Si aún sobran personas (porque dentro > 5), las metemos al final
    noUsados.forEach(ci => nuevoDentro.push(ci))

    slot.dentro = nuevoDentro.filter((x): x is number => x !== null)
    slot.dentroFisico = nuevoDentro
  })
  return plan
}
