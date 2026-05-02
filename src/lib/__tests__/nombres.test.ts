import { describe, it, expect } from 'vitest'
import {
  esc,
  nameAt,
  shortName,
  pillName,
  defaultNombres,
  newId,
} from '../nombres'

describe('nombres', () => {
  describe('esc', () => {
    it('debería escapar caracteres HTML peligrosos', () => {
      expect(esc('<script>alert("xss")</script>')).toBe(
        '&lt;script>alert(&quot;xss&quot;)&lt;/script>'
      )
    })

    it('debería escapar ampersand', () => {
      expect(esc('A & B')).toBe('A &amp; B')
    })

    it('debería retornar string vacío para undefined', () => {
      expect(esc(undefined)).toBe('undefined')
    })

    it('debería retornar string para números', () => {
      expect(esc(42)).toBe('42')
    })
  })

  describe('nameAt', () => {
    const trabajadera = {
      nombres: ['Juan', 'Pedro', 'Luis'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    it('debería retornar el nombre por índice', () => {
      expect(nameAt(trabajadera, 0)).toBe('Juan')
      expect(nameAt(trabajadera, 1)).toBe('Pedro')
      expect(nameAt(trabajadera, 2)).toBe('Luis')
    })

    it('debería retornar número + 1 para índice fuera de rango', () => {
      expect(nameAt(trabajadera, 5)).toBe('6')
    })

    it('debería manejar índice negativo', () => {
      expect(nameAt(trabajadera, -1)).toBe('0')
    })
  })

  describe('shortName', () => {
    it('debería acortar "Costalero N" a "CN"', () => {
      expect(shortName('Costalero 5')).toBe('C5')
      expect(shortName('costalero 12')).toBe('C12')
      expect(shortName('COSTALERO 3')).toBe('C3')
    })

    it('debería tomar primera palabra para nombres normales', () => {
      expect(shortName('Juan Pérez García')).toBe('Juan')
    })

    it('debería truncar a 8 caracteres', () => {
      expect(shortName('Alejandría')).toBe('Alejandr')
    })

    it('debería retornar "?" para string vacío', () => {
      expect(shortName('')).toBe('?')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(shortName(null as any)).toBe('?')
    })
  })

  describe('pillName', () => {
    const trabajadera = {
      nombres: ['Juan Pérez', 'Costalero 2', 'María'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    it('debería combinar nameAt + shortName', () => {
      expect(pillName(trabajadera, 0)).toBe('Juan')
      expect(pillName(trabajadera, 1)).toBe('C2')
      expect(pillName(trabajadera, 2)).toBe('María')
    })
  })

  describe('defaultNombres', () => {
    it('debería generar nombres por defecto', () => {
      expect(defaultNombres(3)).toEqual([
        'Costalero 1',
        'Costalero 2',
        'Costalero 3',
      ])
    })

    it('debería retornar array vacío para n=0', () => {
      expect(defaultNombres(0)).toEqual([])
    })
  })

  describe('newId', () => {
    it('debería generar string de 7 caracteres', () => {
      const id = newId()
      expect(id).toHaveLength(7)
      expect(typeof id).toBe('string')
    })

    it('debería generar IDs únicos (probabilístico)', () => {
      const ids = new Set(Array.from({ length: 100 }, () => newId()))
      expect(ids.size).toBeGreaterThan(95) // muy probable que sean únicos
    })
  })
})
