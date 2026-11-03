import { describe, it, expect } from 'vitest'
import {
  construirIndiceApodos,
  calcularApodosCuadrilla,
  apodosDifieren,
  normalizarClave,
  esPlaceholder,
} from '../apodos'
import type { Trabajadera } from '../types'

function trab(nombres: string[], apodos?: (string | undefined)[]): Trabajadera {
  return {
    id: 1,
    nombres,
    apodos,
    roles: [],
    salidas: 2,
    tramos: [],
    bajas: [],
    regla5costaleros: false,
    plan: null,
    obj: null,
    analisis: null,
    pinned: null,
    puntuaciones: {},
    tramosClaves: [],
  }
}

describe('apodos', () => {
  describe('normalizarClave', () => {
    it('debería colapsar espacios y quitar extremos', () => {
      expect(normalizarClave('  Carlos   Tinoco ')).toBe('Carlos Tinoco')
    })

    it('debería tolerar null/undefined', () => {
      expect(normalizarClave(null)).toBe('')
      expect(normalizarClave(undefined)).toBe('')
    })
  })

  describe('esPlaceholder', () => {
    it('debería detectar "Costalero N"', () => {
      expect(esPlaceholder('Costalero 3')).toBe(true)
      expect(esPlaceholder('costalero 12')).toBe(true)
      expect(esPlaceholder('')).toBe(true)
    })

    it('debería NO detectar nombres reales', () => {
      expect(esPlaceholder('Carlos Tinoco')).toBe(false)
    })
  })

  describe('construirIndiceApodos', () => {
    it('debería indexar por nombre completo, primer nombre y apodo', () => {
      const indice = construirIndiceApodos([
        { nombre: 'Carlos', apellidos: 'Tinoco', apodo: 'Carlitos' },
      ])

      expect(indice.exactos['Carlos Tinoco']).toEqual(['Carlitos'])
      expect(indice.exactos['Carlitos']).toEqual(['Carlitos'])
      expect(indice.porPrimerNombre['Carlos']).toEqual(['Carlitos'])
    })

    it('debería ignorar filas sin apodo', () => {
      const indice = construirIndiceApodos([
        { nombre: 'Carlos', apellidos: 'Tinoco', apodo: '' },
        { nombre: 'Diego', apellidos: 'Fabregas', apodo: null },
      ])

      expect(indice.exactos).toEqual({})
      expect(indice.porPrimerNombre).toEqual({})
    })

    it('debería agrupar varios apodos bajo el mismo primer nombre', () => {
      const indice = construirIndiceApodos([
        { nombre: 'Adrián', apellidos: 'Pérez García', apodo: 'Adri Chori' },
        { nombre: 'Adrián', apellidos: 'Pérez Domínguez', apodo: 'Adrián Pérez' },
      ])

      expect(indice.porPrimerNombre['Adrián']).toEqual([
        'Adri Chori',
        'Adrián Pérez',
      ])
    })
  })

  describe('calcularApodosCuadrilla', () => {
    it('debería resolver por nombre completo cuando el censero no tenía apodo', () => {
      // Caso real: importado SIN apodo → en la cuadrilla quedó el nombre
      // real; después el capataz le pone apodo en el censo.
      const indice = construirIndiceApodos([
        { nombre: 'Carlos', apellidos: 'Tinoco', apodo: 'Carlitos' },
      ])

      const resultado = calcularApodosCuadrilla(
        [trab(['Diego Fabregas', 'Carlos Tinoco'])],
        indice,
      )

      expect(resultado[0][0]).toBeUndefined()
      expect(resultado[0][1]).toBe('Carlitos')
    })

    it('debería resolver cuando el nombre de la cuadrilla YA es el apodo', () => {
      const indice = construirIndiceApodos([
        { nombre: 'Rafael', apellidos: 'Sugrañes Estévez', apodo: 'Rafa Sug' },
        { nombre: 'Rafael', apellidos: 'García Sánchez', apodo: 'Rafita' },
      ])

      const resultado = calcularApodosCuadrilla(
        [trab(['Rafa Sug', 'Rafita'])],
        indice,
      )

      expect(resultado[0][0]).toBe('Rafa Sug')
      expect(resultado[0][1]).toBe('Rafita')
    })

    it('debería resolver dos costaleros con el mismo nombre real', () => {
      const indice = construirIndiceApodos([
        { nombre: 'Adrián', apellidos: 'Pérez García', apodo: 'Adri Chori' },
        { nombre: 'Adrián', apellidos: 'Pérez Domínguez', apodo: 'Adrián Pérez' },
      ])

      const resultado = calcularApodosCuadrilla(
        [trab(['Adrián Pérez García', 'Adrián Pérez Domínguez'])],
        indice,
      )

      expect(resultado[0][0]).toBe('Adri Chori')
      expect(resultado[0][1]).toBe('Adrián Pérez')
    })

    it('NO debe asignar el apodo de otro cuando el nombre tiene apellidos', () => {
      // Caso real (producción): "Javi Villablanca" (sin apodo) NO debe
      // heredar el apodo de "Javi Mena Guerrero".
      const indice = construirIndiceApodos([
        { nombre: 'Javi', apellidos: 'Mena Guerrero', apodo: 'Javi Mena' },
      ])

      const resultado = calcularApodosCuadrilla(
        [trab(['Javi Villablanca'])],
        indice,
      )

      expect(resultado[0][0]).toBeUndefined()
    })

    it('NO debe asignar apodo si el primer nombre es ambiguo', () => {
      const indice = construirIndiceApodos([
        { nombre: 'Rafael', apellidos: 'Sugrañes Estévez', apodo: 'Rafa Sug' },
        { nombre: 'Rafael', apellidos: 'García Sánchez', apodo: 'Rafita' },
      ])

      const resultado = calcularApodosCuadrilla([trab(['Rafael'])], indice)

      expect(resultado[0][0]).toBeUndefined()
    })

    it('debería resolver por primer nombre si es único', () => {
      const indice = construirIndiceApodos([
        { nombre: 'Juan', apellidos: 'Fernández', apodo: 'Juanjo' },
      ])

      const resultado = calcularApodosCuadrilla([trab(['Juan'])], indice)

      expect(resultado[0][0]).toBe('Juanjo')
    })

    it('debe ignorar placeholders "Costalero N"', () => {
      const indice = construirIndiceApodos([
        { nombre: 'Carlos', apellidos: 'Tinoco', apodo: 'Carlitos' },
      ])

      const resultado = calcularApodosCuadrilla(
        [trab(['Costalero 1', 'Costalero 2'])],
        indice,
      )

      expect(resultado[0]).toEqual([undefined, undefined])
    })

    it('debe devolver un array por cuadrilla', () => {
      const indice = construirIndiceApodos([
        { nombre: 'Carlos', apellidos: 'Tinoco', apodo: 'Carlitos' },
      ])

      const resultado = calcularApodosCuadrilla(
        [trab(['Carlos Tinoco']), trab(['Diego Fabregas'])],
        indice,
      )

      expect(resultado).toHaveLength(2)
      expect(resultado[0][0]).toBe('Carlitos')
      expect(resultado[1][0]).toBeUndefined()
    })
  })

  describe('apodosDifieren', () => {
    it('debe devolver false si no hay cambios', () => {
      expect(apodosDifieren(['A', undefined], ['A', undefined])).toBe(false)
      expect(apodosDifieren(undefined, [undefined])).toBe(false)
    })

    it('debe devolver true si cambia un apodo', () => {
      expect(apodosDifieren(['A'], ['B'])).toBe(true)
      expect(apodosDifieren([undefined], ['A'])).toBe(true)
      expect(apodosDifieren(['A'], [])).toBe(true)
    })
  })
})
