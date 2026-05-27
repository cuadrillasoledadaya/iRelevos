// ══════════════════════════════════════════════════════════════════
// ROLES — lógica de roles y posición física con izquierdo/derecho
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, Rol, RolCode, TramoSlot } from './types'

// ── Helpers para roles con lado ──────────────────────────────────

/** Extrae el rol base sin lado: PAT_D → PAT, COR → COR */
export function rolBase(r: RolCode): 'PAT' | 'COS' | 'FIJ' | 'COR' {
  if (r === 'PAT_D' || r === 'PAT_I') return 'PAT'
  if (r === 'COS_D' || r === 'COS_I') return 'COS'
  if (r === 'FIJ_D' || r === 'FIJ_I') return 'FIJ'
  return 'COR'
}

/** Extrae el lado: PAT_D → 'D', COR → null */
export function rolLado(r: RolCode): 'D' | 'I' | null {
  if (r === 'PAT_D' || r === 'COS_D' || r === 'FIJ_D') return 'D'
  if (r === 'PAT_I' || r === 'COS_I' || r === 'FIJ_I') return 'I'
  return null
}

/** Construye un RolCode desde base + lado */
export function makeRolCode(
  base: 'PAT' | 'COS' | 'FIJ' | 'COR',
  lado: 'D' | 'I' | null,
): RolCode {
  if (base === 'COR') return 'COR'
  if (lado === 'D') return `${base}_D` as RolCode
  if (lado === 'I') return `${base}_I` as RolCode
  return `${base}_D` as RolCode
}

/** Verifica si un RolCode es válido para el lado de una posición */
export function rolCompatibleConPosicion(
  rolCostalero: RolCode,
  rolPosicion: RolCode,
): boolean {
  // COR es compatible con cualquier posición (fallback)
  if (rolCostalero === 'COR') return true
  // Coincidencia exacta
  if (rolCostalero === rolPosicion) return true
  // Mismo rol base pero lado distinto: compatible como secundario (penalizado)
  if (rolBase(rolCostalero) === rolBase(rolPosicion)) return true
  return false
}

// ── Jerarquía ────────────────────────────────────────────────────

export const ROL_JERARQUIA: Record<RolCode, number> = {
  PAT_D: 3,
  PAT_I: 3,
  COS_D: 3,
  COS_I: 3,
  FIJ_D: 2,
  FIJ_I: 2,
  COR: 1,
}

// ── Roles disponibles por trabajadera ────────────────────────────

export function rolesDisponibles(tid: number): RolCode[] {
  return tid === 1 || tid === 7
    ? ['PAT_D', 'PAT_I', 'FIJ_D', 'FIJ_I', 'COR']
    : ['COS_D', 'COS_I', 'FIJ_D', 'FIJ_I', 'COR']
}

// ── Labels y emojis ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function rolLabel(r: RolCode, _tid?: number): string {
  const base = rolBase(r)
  const lado = rolLado(r)
  const nombres: Record<string, string> = {
    PAT: 'Patero',
    COS: 'Costero',
    FIJ: 'Fijador',
    COR: 'Corriente',
  }
  const nombre = nombres[base] ?? base
  if (r === 'COR') return nombre
  const ladoStr = lado === 'D' ? ' Der' : lado === 'I' ? ' Izq' : ''
  return nombre + ladoStr
}

export function rolEmoji(r: RolCode): string {
  const base = rolBase(r)
  const m: Record<string, string> = {
    PAT: '⚓',
    COS: '⚓',
    FIJ: '🔩',
    COR: '〰️',
  }
  return m[base] ?? '?'
}

// ── Roles por defecto ────────────────────────────────────────────

export function defaultRoles(n: number, tid: number): Rol[] {
  const roles: Rol[] = []
  const esPrimero = tid === 1 || tid === 7
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      // Primer puesto: lado izquierdo
      roles.push({ pri: esPrimero ? 'PAT_I' : 'COS_I', sec: 'FIJ_I' })
    } else if (i === 1) {
      // Segundo puesto: lado derecho
      roles.push({ pri: esPrimero ? 'PAT_D' : 'COS_D', sec: 'FIJ_D' })
    } else if (i === 2) {
      // Fijador izquierdo
      roles.push({ pri: 'FIJ_I', sec: esPrimero ? 'PAT_I' : 'COS_I' })
    } else if (i === 3) {
      // Fijador derecho
      roles.push({ pri: 'FIJ_D', sec: esPrimero ? 'PAT_D' : 'COS_D' })
    } else {
      // Corriente (sin lado)
      roles.push({ pri: 'COR', sec: 'FIJ_I' })
    }
  }
  return roles
}

// ── Acceso ───────────────────────────────────────────────────────

export function getRol(t: Trabajadera, i: number): Rol {
  return t.roles?.[i] ?? { pri: 'COR', sec: 'FIJ_I' }
}

export function esRolHabitual(
  t: Trabajadera,
  ci: number,
  rol: RolCode | null,
): boolean {
  if (rol === null) return true
  const r = getRol(t, ci)
  return r.pri === rol || r.sec === rol
}

export function idealRoles(tid: number): Partial<Record<RolCode, number>> {
  return tid === 1 || tid === 7
    ? { PAT_D: 1, PAT_I: 1, FIJ_D: 1, FIJ_I: 1, COR: 1 }
    : { COS_D: 1, COS_I: 1, FIJ_D: 1, FIJ_I: 1, COR: 1 }
}

// ── Estructura física del paso ───────────────────────────────────

export function estructuraPaso(tid: number): RolCode[] {
  const esPriUlt = tid === 1 || tid === 7
  // [Izquierda → Centro → Derecha]
  return esPriUlt
    ? ['PAT_I', 'FIJ_I', 'COR', 'FIJ_D', 'PAT_D']
    : ['COS_I', 'FIJ_I', 'COR', 'FIJ_D', 'COS_D']
}

export function rolDePosicion(t: Trabajadera, posIdx: number): RolCode {
  return estructuraPaso(t.id)[posIdx] ?? 'COR'
}

// ── Asignación de roles ──────────────────────────────────────────

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
        } else if (rolBase(rolesCostalero.pri) === rolBase(rolNecesario)) {
          // Mismo rol base pero lado distinto: parcialmente compatible
          score += 25
        } else {
          score -= 1000
        }
      }
      return score
    }

    const permutate = (
      arr: number[],
      m: number[] = [],
    ): Map<number, RolCode> | null => {
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
        else if (rolBase(r.pri) === rolBase(rolNecesario)) score = 25
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

  extras.forEach((ci) => {
    if (!asignados.has(ci)) asignados.set(ci, 'COR')
  })

  // Guardar en cache (copia defensiva)
  _asignarRolesCache.set(cacheKey, new Map(asignados))
  return asignados
}

// ── Dentro físico ────────────────────────────────────────────────

export function getDentroFisico(
  t: Trabajadera,
  slot: TramoSlot,
): (number | null)[] {
  if (slot.dentroFisico) return slot.dentroFisico
  const asig = asignarRolesTramo(t, slot.dentro)
  const estructura = estructuraPaso(t.id)

  // Regla 5 costaleros: cooriente (posición central) siempre libre
  const aplicarRegla5 = t.regla5costaleros && t.nombres.length === 5
  const idxsActivos = aplicarRegla5
    ? [0, 1, 3, 4] // excluye posición 2 (cooriente)
    : [0, 1, 2, 3, 4]

  const porRol: Partial<Record<RolCode, number[]>> = {}
  asig.forEach((rol, ci) => {
    if (!porRol[rol]) porRol[rol] = []
    porRol[rol]!.push(ci)
  })
  const fisico: (number | null)[] = []
  const usados = new Set<number>()
  idxsActivos.forEach((posIdx) => {
    const rol = estructura[posIdx]
    const disp = (porRol[rol] ?? []).filter((ci) => !usados.has(ci))
    if (disp.length > 0) {
      fisico.push(disp[0])
      usados.add(disp[0])
    } else fisico.push(null)
  })

  // Evitar perder costaleros: los que no entraron en su rol ideal van a los huecos libres
  const noUsados = slot.dentro.filter((ci) => !usados.has(ci))
  for (let i = 0; i < fisico.length; i++) {
    if (fisico[i] === null && noUsados.length > 0) {
      fisico[i] = noUsados.shift()!
    }
  }

  // Insertar null en la cooriente si regla5 está activa
  if (aplicarRegla5) {
    fisico.splice(2, 0, null)
  }

  slot.dentroFisico = fisico
  return fisico
}

export function ordenarDentroFisico(
  t: Trabajadera,
  plan: TramoSlot[],
): TramoSlot[] {
  plan.forEach((slot) => {
    if (!slot.dentro || slot.dentro.length === 0) return
    const asig = asignarRolesTramo(t, slot.dentro)
    const estructura = estructuraPaso(t.id)

    // Regla 5 costaleros: cooriente (posición central) siempre libre
    const aplicarRegla5 = t.regla5costaleros && t.nombres.length === 5
    const idxsActivos = aplicarRegla5
      ? [0, 1, 3, 4] // excluye posición 2 (cooriente)
      : [0, 1, 2, 3, 4]

    const porRol: Partial<Record<RolCode, number[]>> = {}
    asig.forEach((rol, ci) => {
      if (!porRol[rol]) porRol[rol] = []
      porRol[rol]!.push(ci)
    })
    const nuevoDentro: (number | null)[] = []
    const usados = new Set<number>()
    idxsActivos.forEach((posIdx) => {
      const rol = estructura[posIdx]
      const disponibles = (porRol[rol] ?? []).filter((ci) => !usados.has(ci))
      if (disponibles.length > 0) {
        nuevoDentro.push(disponibles[0])
        usados.add(disponibles[0])
      } else {
        nuevoDentro.push(null)
      }
    })

    // Recuperar costaleros que no encajaron en roles y llenar los huecos
    const noUsados = slot.dentro.filter((ci) => !usados.has(ci))
    for (let i = 0; i < nuevoDentro.length; i++) {
      if (nuevoDentro[i] === null && noUsados.length > 0) {
        nuevoDentro[i] = noUsados.shift()!
      }
    }
    // Si aún sobran personas (porque dentro > 5), las metemos al final
    noUsados.forEach((ci) => nuevoDentro.push(ci))

    // Insertar null en la cooriente si regla5 está activa
    if (aplicarRegla5) {
      nuevoDentro.splice(2, 0, null)
    }

    slot.dentro = nuevoDentro.filter((x): x is number => x !== null)
    slot.dentroFisico = nuevoDentro
  })
  return plan
}
