// ══════════════════════════════════════════════════════════════════
// TESTS — saveCloud.ts (Strict TDD)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { saveCloud } from '../saveCloud'
import { supabase } from '@/lib/supabase'
import type { DatosPerfil } from '@/lib/types'

const mockContent: DatosPerfil = {
  banco: [],
  planes: [],
  trabajaderas: [],
}

function mockSession(uid: string | null) {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: uid ? { user: { id: uid } } as any : null },
    error: null,
  })
}

function mockProyectoQuery(user_id: string | null) {
  const ownershipChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { user_id }, error: null }),
  }

  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  vi.mocked(supabase.from).mockImplementation((table: string) => {
    const base: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { user_id }, error: null }),
      update: vi.fn().mockReturnThis(),
    }
    if (table === 'proyectos') {
      base.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
    }
    return base as any
  })
}

describe('saveCloud', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no debería persistir si no hay sesión', async () => {
    mockSession(null)
    saveCloud(mockContent, 'proj-no-session')
    vi.advanceTimersByTime(800)
    await vi.runAllTimersAsync()

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('debería debouncear múltiples llamadas en un solo request', async () => {
    mockSession('user-1')
    mockProyectoQuery('user-1')

    saveCloud(mockContent, 'proj-debounce')
    saveCloud(mockContent, 'proj-debounce')
    saveCloud(mockContent, 'proj-debounce')

    vi.advanceTimersByTime(800)
    await vi.runAllTimersAsync()

    // Solo una query de ownership (la primera vez)
    const fromCalls = vi.mocked(supabase.from).mock.calls
    const proyectosCalls = fromCalls.filter(([table]: [string]) => table === 'proyectos')
    expect(proyectosCalls.length).toBeLessThanOrEqual(2) // 1 select + 1 update
  })

  it('debería bloquear si el usuario no es el dueño', async () => {
    mockSession('user-attacker')
    mockProyectoQuery('user-owner')

    saveCloud(mockContent, 'proj-blocked')
    vi.advanceTimersByTime(800)
    await vi.runAllTimersAsync()

    const fromSpy = vi.mocked(supabase.from)
    const proyectosCalls = fromSpy.mock.calls.filter(([table]: [string]) => table === 'proyectos')
    // Debe haber hecho SELECT pero NO UPDATE
    expect(proyectosCalls.length).toBe(1) // solo el select
  })

  it('debería setear user_id si el proyecto no lo tiene', async () => {
    mockSession('user-new')

    const updateEqSpy = vi.fn().mockResolvedValue({ data: null, error: null })
    const updateSpy = vi.fn().mockReturnValue({ eq: updateEqSpy })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'proyectos') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { user_id: null }, error: null }),
          update: updateSpy,
        } as any
      }
      return {} as any
    })

    saveCloud(mockContent, 'proj-new-owner')
    vi.advanceTimersByTime(800)
    await vi.runAllTimersAsync()

    expect(updateSpy).toHaveBeenCalled()
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).toHaveProperty('user_id', 'user-new')
  })
})
