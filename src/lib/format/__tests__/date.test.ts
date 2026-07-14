import { describe, it, expect } from 'vitest'
import { formatDateShort, formatDateLong, formatDateTime } from '../date'

describe('formatDateShort', () => {
  it('debería formatear fecha corta correctamente', () => {
    const result = formatDateShort('2026-07-13T10:30:00Z')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(result).toContain('2026')
  })

  it('debería retornar string vacío para input vacío', () => {
    expect(formatDateShort('')).toBe('')
  })

  it('debería retornar string vacío para input inválido', () => {
    expect(formatDateShort('not-a-date')).toBe('')
  })
})

describe('formatDateLong', () => {
  it('debería formatear fecha larga en español', () => {
    const result = formatDateLong('2026-07-13T10:30:00Z')
    expect(result).toContain('2026')
    expect(result).toContain('julio')
  })

  it('debería retornar string vacío para input vacío', () => {
    expect(formatDateLong('')).toBe('')
  })

  it('debería retornar string vacío para input inválido', () => {
    expect(formatDateLong('not-a-date')).toBe('')
  })
})

describe('formatDateTime', () => {
  it('debería formatear fecha con hora', () => {
    const result = formatDateTime('2026-07-13T10:30:00Z')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
    expect(result).toContain('2026')
  })

  it('debería retornar string vacío para input vacío', () => {
    expect(formatDateTime('')).toBe('')
  })

  it('debería retornar string vacío para input inválido', () => {
    expect(formatDateTime('not-a-date')).toBe('')
  })
})
