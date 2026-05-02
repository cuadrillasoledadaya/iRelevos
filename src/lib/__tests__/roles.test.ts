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
  })
})
