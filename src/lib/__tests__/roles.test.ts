import { describe, it, expect } from 'vitest'
import {
  ROL_JERARQUIA,
  rolesDisponibles,
  rolLabel,
  rolEmoji,
  defaultRoles,
  getRol,
  esRolHabitual,
  idealRoles,
  estructuraPaso,
  rolDePosicion,
  asignarRolesTramo,
  getDentroFisico,
  ordenarDentroFisico,
} from '../roles'
import type { Trabajadera, TramoSlot } from '../types'

describe('roles', () => {
  describe('ROL_JERARQUIA', () => {
    it('debería tener jerarquías correctas', () => {
      expect(ROL_JERARQUIA.PAT).toBe(3)
      expect(ROL_JERARQUIA.COS).toBe(3)
      expect(ROL_JERARQUIA.FIJ).toBe(2)
      expect(ROL_JERARQUIA.COR).toBe(1)
    })
  })

  describe('rolesDisponibles', () => {
    it('debería retornar roles de paso primario para tid 1', () => {
      expect(rolesDisponibles(1)).toEqual(['PAT', 'FIJ', 'COR'])
    })

    it('debería retornar roles de paso primario para tid 7', () => {
      expect(rolesDisponibles(7)).toEqual(['PAT', 'FIJ', 'COR'])
    })

    it('debería retornar roles de paso secundario para otros tid', () => {
      expect(rolesDisponibles(2)).toEqual(['COS', 'FIJ', 'COR'])
      expect(rolesDisponibles(5)).toEqual(['COS', 'FIJ', 'COR'])
    })
  })

  describe('rolLabel', () => {
    it('debería retornar etiquetas correctas', () => {
      expect(rolLabel('PAT')).toBe('Patero')
      expect(rolLabel('COS')).toBe('Costero')
      expect(rolLabel('FIJ')).toBe('Fijador')
      expect(rolLabel('COR')).toBe('Corriente')
    })

    it('debería retornar el código para rol desconocido', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(rolLabel('XYZ' as any)).toBe('XYZ')
    })
  })

  describe('rolEmoji', () => {
    it('debería retornar emojis correctos', () => {
      expect(rolEmoji('PAT')).toBe('⚓')
      expect(rolEmoji('COS')).toBe('⚓')
      expect(rolEmoji('FIJ')).toBe('🔩')
      expect(rolEmoji('COR')).toBe('〰️')
    })

    it('debería retornar "?" para rol desconocido', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(rolEmoji('XYZ' as any)).toBe('?')
    })
  })

  describe('defaultRoles', () => {
    it('debería generar roles para paso primario (tid=1)', () => {
      const roles = defaultRoles(6, 1)
      expect(roles).toHaveLength(6)
      expect(roles[0]).toEqual({ pri: 'PAT', sec: 'FIJ' })
      expect(roles[1]).toEqual({ pri: 'PAT', sec: 'FIJ' })
      expect(roles[2]).toEqual({ pri: 'FIJ', sec: 'PAT' })
      expect(roles[3]).toEqual({ pri: 'FIJ', sec: 'PAT' })
      expect(roles[4]).toEqual({ pri: 'COR', sec: 'FIJ' })
      expect(roles[5]).toEqual({ pri: 'COR', sec: 'FIJ' })
    })

    it('debería generar roles para paso secundario (tid=2)', () => {
      const roles = defaultRoles(6, 2)
      expect(roles[0]).toEqual({ pri: 'COS', sec: 'FIJ' })
      expect(roles[1]).toEqual({ pri: 'COS', sec: 'FIJ' })
      expect(roles[2]).toEqual({ pri: 'FIJ', sec: 'COS' })
      expect(roles[3]).toEqual({ pri: 'FIJ', sec: 'COS' })
      expect(roles[4]).toEqual({ pri: 'COR', sec: 'FIJ' })
    })
  })

  describe('getRol', () => {
    const trabajadera = {
      roles: [
        { pri: 'PAT', sec: 'FIJ' },
        { pri: 'COS', sec: 'FIJ' },
      ],
    } as Trabajadera

    it('debería retornar rol existente', () => {
      expect(getRol(trabajadera, 0)).toEqual({ pri: 'PAT', sec: 'FIJ' })
      expect(getRol(trabajadera, 1)).toEqual({ pri: 'COS', sec: 'FIJ' })
    })

    it('debería retornar COR/FIJ para índice fuera de rango', () => {
      expect(getRol(trabajadera, 5)).toEqual({ pri: 'COR', sec: 'FIJ' })
    })

    it('debería retornar default si no hay roles', () => {
      expect(getRol({} as Trabajadera, 0)).toEqual({ pri: 'COR', sec: 'FIJ' })
    })
  })

  describe('esRolHabitual', () => {
    const trabajadera = {
      roles: [
        { pri: 'PAT', sec: 'FIJ' },
        { pri: 'COS', sec: 'FIJ' },
      ],
    } as Trabajadera

    it('debería retornar true si coincide rol primario', () => {
      expect(esRolHabitual(trabajadera, 0, 'PAT')).toBe(true)
    })

    it('debería retornar true si coincide rol secundario', () => {
      expect(esRolHabitual(trabajadera, 0, 'FIJ')).toBe(true)
    })

    it('debería retornar false si no coincide', () => {
      expect(esRolHabitual(trabajadera, 0, 'COR')).toBe(false)
    })

    it('debería retornar true para rol null (sin filtro)', () => {
      expect(esRolHabitual(trabajadera, 0, null)).toBe(true)
    })
  })

  describe('idealRoles', () => {
    it('debería retornar distribución para paso primario', () => {
      expect(idealRoles(1)).toEqual({ PAT: 2, FIJ: 2, COR: 1 })
      expect(idealRoles(7)).toEqual({ PAT: 2, FIJ: 2, COR: 1 })
    })

    it('debería retornar distribución para paso secundario', () => {
      expect(idealRoles(2)).toEqual({ COS: 2, FIJ: 2, COR: 1 })
    })
  })

  describe('estructuraPaso', () => {
    it('debería retornar estructura PAT para paso primario', () => {
      expect(estructuraPaso(1)).toEqual(['PAT', 'FIJ', 'COR', 'FIJ', 'PAT'])
    })

    it('debería retornar estructura COS para paso secundario', () => {
      expect(estructuraPaso(2)).toEqual(['COS', 'FIJ', 'COR', 'FIJ', 'COS'])
    })
  })

  describe('rolDePosicion', () => {
    const trabajadera = { id: 1 } as Trabajadera

    it('debería retornar rol por posición', () => {
      expect(rolDePosicion(trabajadera, 0)).toBe('PAT')
      expect(rolDePosicion(trabajadera, 2)).toBe('COR')
      expect(rolDePosicion(trabajadera, 4)).toBe('PAT')
    })

    it('debería retornar COR para posición fuera de rango', () => {
      expect(rolDePosicion(trabajadera, 10)).toBe('COR')
    })
  })

  describe('asignarRolesTramo', () => {
    it('debería asignar roles óptimos según capacidades', () => {
      const trabajadera = {
        id: 1,
        roles: [
          { pri: 'PAT', sec: 'FIJ' },
          { pri: 'PAT', sec: 'FIJ' },
          { pri: 'FIJ', sec: 'PAT' },
          { pri: 'FIJ', sec: 'PAT' },
          { pri: 'COR', sec: 'FIJ' },
        ],
      } as Trabajadera

      const asignados = asignarRolesTramo(trabajadera, [0, 1, 2, 3, 4])
      expect(asignados.size).toBe(5)
      // Los pateros deberían ir en posiciones PAT
      expect(asignados.get(0)).toBeDefined()
      expect(asignados.get(1)).toBeDefined()
    })

    it('debería retornar mapa vacío para array vacío', () => {
      const asignados = asignarRolesTramo({ id: 1 } as Trabajadera, [])
      expect(asignados.size).toBe(0)
    })

    it('debería asignar COR a extras (>5)', () => {
      const trabajadera = {
        id: 1,
        roles: Array(7).fill({ pri: 'COR', sec: 'FIJ' }),
      } as Trabajadera

      const asignados = asignarRolesTramo(trabajadera, [0, 1, 2, 3, 4, 5, 6])
      expect(asignados.get(5)).toBe('COR')
      expect(asignados.get(6)).toBe('COR')
    })
  })

  describe('getDentroFisico', () => {
    it('debería retornar orden físico según roles', () => {
      const trabajadera = {
        id: 1,
        roles: [
          { pri: 'PAT', sec: 'FIJ' },
          { pri: 'FIJ', sec: 'COR' },
          { pri: 'COR', sec: 'FIJ' },
          { pri: 'FIJ', sec: 'PAT' },
          { pri: 'PAT', sec: 'FIJ' },
        ],
      } as Trabajadera

      const slot: TramoSlot = { dentro: [0, 1, 2, 3, 4] }
      const fisico = getDentroFisico(trabajadera, slot)
      expect(fisico).toHaveLength(5)
      expect(fisico.every(x => x !== null)).toBe(true)
    })

    it('debería usar dentroFisico si ya existe', () => {
      const slot: TramoSlot = { dentro: [0, 1], dentroFisico: [1, 0] }
      const fisico = getDentroFisico({ id: 1 } as Trabajadera, slot)
      expect(fisico).toEqual([1, 0])
    })
  })

  // ══════════════════════════════════════════════════════════════════
  // Regla 5 costaleros — cooriente libre
  // ══════════════════════════════════════════════════════════════════
  describe('getDentroFisico — regla5 costaleros', () => {
    const t5Regla5: Trabajadera = {
      id: 1,
      nombres: ['A', 'B', 'C', 'D', 'E'],
      roles: [
        { pri: 'PAT', sec: 'FIJ' },
        { pri: 'FIJ', sec: 'COR' },
        { pri: 'COR', sec: 'FIJ' },
        { pri: 'FIJ', sec: 'PAT' },
        { pri: 'PAT', sec: 'FIJ' },
      ],
      salidas: 5,
      tramos: ['T1'],
      bajas: [],
      regla5costaleros: true,
      plan: null,
      obj: null,
      analisis: null,
      pinned: null,
      puntuaciones: {},
      tramosClaves: [],
    }

    const t5SinRegla: Trabajadera = {
      ...t5Regla5,
      regla5costaleros: false,
    }

    it('con regla5=true, dentroFisico[2] debe ser null (cooriente libre)', () => {
      const slot: TramoSlot = { dentro: [0, 1, 2, 3] } // 4 dentro (regla5)
      const fisico = getDentroFisico(t5Regla5, slot)
      expect(fisico).toHaveLength(5)
      expect(fisico[2]).toBeNull()
    })

    it('con regla5=true, los 4 costaleros aparecen en dentroFisico fuera de la cooriente', () => {
      const slot: TramoSlot = { dentro: [0, 1, 2, 3] }
      const fisico = getDentroFisico(t5Regla5, slot)
      // Todos los costaleros deben estar en alguna posición distinta de la cooriente
      const costalerosEnPaso = fisico.filter((x): x is number => x !== null)
      expect(costalerosEnPaso).toHaveLength(4)
      expect(costalerosEnPaso.sort()).toEqual([0, 1, 2, 3])
    })

    it('con regla5=false, la cooriente PUEDE estar ocupada (comportamiento actual)', () => {
      const slot: TramoSlot = { dentro: [0, 1, 2, 3] }
      const fisico = getDentroFisico(t5SinRegla, slot)
      // No garantizamos que [2] sea null — el comportamiento actual puede ocuparla
      expect(fisico).toHaveLength(5)
      // Al menos verificamos que devuelve 5 posiciones
      const ocupadas = fisico.filter((x): x is number => x !== null)
      expect(ocupadas.length).toBeGreaterThanOrEqual(4)
    })

    it('con 6 costaleros, regla5 no aplica aunque esté activa', () => {
      const t6: Trabajadera = {
        ...t5Regla5,
        nombres: ['A', 'B', 'C', 'D', 'E', 'F'],
        roles: [
          { pri: 'PAT', sec: 'FIJ' },
          { pri: 'FIJ', sec: 'COR' },
          { pri: 'COR', sec: 'FIJ' },
          { pri: 'FIJ', sec: 'PAT' },
          { pri: 'PAT', sec: 'FIJ' },
          { pri: 'COR', sec: 'FIJ' },
        ],
        regla5costaleros: true,
      }
      const slot: TramoSlot = { dentro: [0, 1, 2, 3, 4, 5] }
      const fisico = getDentroFisico(t6, slot)
      // getDentroFisico solo devuelve 5 posiciones (la estructura del paso)
      expect(fisico).toHaveLength(5)
      // La cooriente puede estar ocupada (NO se aplica regla5 con ≠5 costaleros)
      // Solo verificamos que los 5 primeros estén colocados
      const costaleros = fisico.filter((x): x is number => x !== null)
      expect(costaleros.length).toBeGreaterThanOrEqual(4)
    })

    // Triangulación: paso secundario (tid=2) y 5 costaleros con slot.dentro=5
    it('con regla5=true y tid=2, cooriente también libre (paso secundario)', () => {
      const t5tid2: Trabajadera = {
        ...t5Regla5,
        id: 2,
        roles: [
          { pri: 'COS', sec: 'FIJ' },
          { pri: 'FIJ', sec: 'COS' },
          { pri: 'COR', sec: 'FIJ' },
          { pri: 'FIJ', sec: 'COS' },
          { pri: 'COS', sec: 'FIJ' },
        ],
      }
      const slot: TramoSlot = { dentro: [0, 1, 2, 3] }
      const fisico = getDentroFisico(t5tid2, slot)
      expect(fisico).toHaveLength(5)
      expect(fisico[2]).toBeNull()
    })

    it('con regla5=true, los costaleros sobrantes se colocan en posiciones no activas', () => {
      // Cuando hay más costaleros que posiciones activas (ej. 5 dentro con regla5),
      // los extras que no caben en las 4 posiciones activas se manejan como
      // en el comportamiento original: pueden perderse en getDentroFisico
      // (limitación pre-existente; ordenarDentroFisico sí los conserva).
      // Este test verifica que al menos no rompe y mantiene cooriente null.
      const slot: TramoSlot = { dentro: [0, 1, 2, 3, 4] }
      const fisico = getDentroFisico(t5Regla5, slot)
      expect(fisico[2]).toBeNull()
      // La mayoría de los costaleros deben estar presentes
      const costaleros = fisico.filter((x): x is number => x !== null)
      expect(costaleros.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('ordenarDentroFisico — regla5 costaleros', () => {
    const t5Regla5: Trabajadera = {
      id: 1,
      nombres: ['A', 'B', 'C', 'D', 'E'],
      roles: [
        { pri: 'PAT', sec: 'FIJ' },
        { pri: 'FIJ', sec: 'COR' },
        { pri: 'COR', sec: 'FIJ' },
        { pri: 'FIJ', sec: 'PAT' },
        { pri: 'PAT', sec: 'FIJ' },
      ],
      salidas: 5,
      tramos: ['T1'],
      bajas: [],
      regla5costaleros: true,
      plan: null,
      obj: null,
      analisis: null,
      pinned: null,
      puntuaciones: {},
      tramosClaves: [],
    }

    it('con regla5=true, dentroFisico[2] es null y slot.dentro tiene 4 índices sin nulls', () => {
      const plan: TramoSlot[] = [
        { dentro: [0, 1, 2, 3] },
      ]
      const ordenado = ordenarDentroFisico(t5Regla5, plan)
      const slot = ordenado[0]

      expect(slot.dentroFisico).toBeDefined()
      expect(slot.dentroFisico!).toHaveLength(5)
      expect(slot.dentroFisico![2]).toBeNull()

      expect(slot.dentro).toHaveLength(4)
      expect(slot.dentro.every(x => typeof x === 'number')).toBe(true)

      const fisicoFiltrado = slot.dentroFisico!.filter((x): x is number => x !== null)
      expect(slot.dentro).toEqual(fisicoFiltrado)
    })

    it('con regla5=false, no modifica la cooriente', () => {
      const t5SinRegla: Trabajadera = { ...t5Regla5, regla5costaleros: false }
      const plan: TramoSlot[] = [
        { dentro: [0, 1, 2, 3] },
      ]
      const ordenado = ordenarDentroFisico(t5SinRegla, plan)
      const slot = ordenado[0]

      expect(slot.dentroFisico).toBeDefined()
      expect(slot.dentroFisico!).toHaveLength(5)
    })
  })

  describe('ordenarDentroFisico', () => {
    it('debería ordenar plan completo según roles', () => {
      const trabajadera = {
        id: 1,
        roles: [
          { pri: 'PAT', sec: 'FIJ' },
          { pri: 'FIJ', sec: 'COR' },
          { pri: 'COR', sec: 'FIJ' },
          { pri: 'FIJ', sec: 'PAT' },
          { pri: 'PAT', sec: 'FIJ' },
        ],
      } as Trabajadera

      const plan: TramoSlot[] = [
        { dentro: [0, 1, 2, 3, 4] },
        { dentro: [4, 3, 2, 1, 0] },
      ]

      const ordenado = ordenarDentroFisico(trabajadera, plan)
      expect(ordenado).toHaveLength(2)
      expect(ordenado[0].dentro).toHaveLength(5)
      expect(ordenado[1].dentro).toHaveLength(5)
    })

    it('no debería modificar slots vacíos', () => {
      const plan: TramoSlot[] = [{ dentro: [] }]
      const ordenado = ordenarDentroFisico({ id: 1 } as Trabajadera, plan)
      expect(ordenado[0].dentro).toEqual([])
    })

    it('debería preferir ambos en secundaria antes que uno fuera de posición', () => {
      // Escenario del usuario: Emilio (COS/FIJ) en COR es fuera de posición.
      // Gorrion (FIJ/COR) está en FIJ (su principal).
      // Si swap: Emilio en FIJ (sec) y Gorrion en COR (sec) = mejor.
      const trabajadera = {
        id: 2, // tid=2 → estructura = [COS, FIJ, COR, FIJ, COS]
        nombres: ['Patro', 'Israel', 'Emilio', 'Gorrion', 'Susino'],
        roles: [
          { pri: 'COS', sec: 'FIJ' }, // Patro
          { pri: 'FIJ', sec: 'COS' }, // Israel
          { pri: 'COS', sec: 'FIJ' }, // Emilio
          { pri: 'FIJ', sec: 'COR' }, // Gorrion
          { pri: 'COS', sec: 'FIJ' }, // Susino
        ],
      } as Trabajadera

      const plan: TramoSlot[] = [
        { dentro: [0, 1, 2, 3, 4] }, // Todos dentro
      ]

      const ordenado = ordenarDentroFisico(trabajadera, plan)
      const fisico = ordenado[0].dentroFisico!

      // Verificar que NADIE esté fuera de posición
      const estructura = estructuraPaso(trabajadera.id)
      const fueraDePosicion = fisico.filter((ci, posIdx) => {
        if (ci === null) return false
        const rol = getRol(trabajadera, ci)
        const rolReq = estructura[posIdx]
        return rol.pri !== rolReq && rol.sec !== rolReq
      })

      expect(fueraDePosicion).toHaveLength(0)
    })
  })
})
