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

export function asignarRolesTramo(
  t: Trabajadera,
  dentroIdxs: number[],
): Map<number, RolCode> {
  const estructura = estructuraPaso(t.id)
  const nPuestos = estructura.length // Normalmente 5
  const asignados = new Map<number, RolCode>()
  
  if (dentroIdxs.length === 0) return asignados

  // Solo optimizamos los primeros nPuestos (normalmente 5)
  // Si hay más gente dentro (sobrecarga), el resto irá como 'COR' al final.
  const candidatos = dentroIdxs.slice(0, nPuestos)
  const extras = dentroIdxs.slice(nPuestos)

  // Generar todas las permutaciones de candidatos para los puestos
  // Como n es pequeño (max 5-6), podemos permitirnos un enfoque de búsqueda exhaustiva
  // o una heurística fuerte. Para 5 costaleros, 5! = 120 combinaciones.
  
  let mejorPuntuacion = -1

  function calcularPuntuacion(permutacion: number[]): number {
    let score = 0
    for (let i = 0; i < permutacion.length; i++) {
      const ci = permutacion[i]
      const rolNecesario = estructura[i]
      const rolesCostalero = getRol(t, ci)
      
      if (rolesCostalero.pri === rolNecesario) score += 10
      else if (rolesCostalero.sec === rolNecesario) score += 5
      else if (rolNecesario === 'COR') score += 1 // Corriente es más flexible
    }
    return score
  }

  function permutate(arr: number[], m: number[] = []): Map<number, RolCode> | null {
    if (arr.length === 0) {
      const score = calcularPuntuacion(m)
      if (score > mejorPuntuacion) {
        mejorPuntuacion = score
        // Guardamos los roles resultantes para CADA costalero en su orden original
        mejorAsignacion = new Array(dentroIdxs.length)
        const mapping = new Map<number, RolCode>()
        for (let i = 0; i < m.length; i++) {
          mapping.set(m[i], estructura[i])
        }
        // Aplicar el mapeo al orden de dentroIdxs
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

  const elMejorMapeo = permutate(candidatos)
  
  if (elMejorMapeo) {
    elMejorMapeo.forEach((rol, ci) => asignados.set(ci, rol))
  }

  // Asignar COR a los extras
  extras.forEach(ci => {
    if (!asignados.has(ci)) asignados.set(ci, 'COR')
  })

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
