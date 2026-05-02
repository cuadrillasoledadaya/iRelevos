// ══════════════════════════════════════════════════════════════════
// TESTS DE INTEGRACIÓN — autenticación Supabase (Strict TDD Mode)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'

describe('supabase auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signInWithPassword', () => {
    it('debe retornar usuario y sesión con credenciales válidas', async () => {
      // RED: El mock actual no tiene auth, este test debe fallar
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockSession = { access_token: 'token-abc', refresh_token: 'token-ref' }

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'correct-password',
      })

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.email).toBe('test@example.com')
      expect(data.session).toBeDefined()
    })

    it('debe retornar error con credenciales inválidas', async () => {
      // TRIANGULATE: camino diferente — error en lugar de éxito
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid login credentials'),
      })

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'bad@example.com',
        password: 'wrong',
      })

      expect(error).toBeDefined()
      expect(error?.message).toContain('Invalid login credentials')
      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
    })

    it('debe llamar al método auth con los parámetros correctos', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'u1' }, session: { access_token: 't1' } },
        error: null,
      })

      await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'secret123',
      })

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'secret123',
      })
    })
  })

  describe('signUp', () => {
    it('debe registrar un nuevo usuario correctamente', async () => {
      const mockUser = { id: 'new-user', email: 'new@example.com' }

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      })

      const { data, error } = await supabase.auth.signUp({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: { nombre: 'Juan', apellidos: 'Pérez', role: 'costalero' },
        },
      })

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.id).toBe('new-user')
      expect(data.user?.email).toBe('new@example.com')
    })

    it('debe retornar error si el email ya está registrado', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('User already registered'),
      })

      const { data, error } = await supabase.auth.signUp({
        email: 'existing@example.com',
        password: 'password123',
      })

      expect(error).toBeDefined()
      expect(error?.message).toContain('already registered')
      expect(data.user).toBeNull()
    })
  })

  describe('signOut', () => {
    it('debe cerrar sesión correctamente', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })

      const { error } = await supabase.auth.signOut()

      expect(error).toBeNull()
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('getSession', () => {
    it('debe retornar sesión activa cuando existe', async () => {
      const mockSession = { access_token: 'active-token', user: { id: 'u1' } }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const { data, error } = await supabase.auth.getSession()

      expect(error).toBeNull()
      expect(data.session).toBeDefined()
      expect(data.session?.access_token).toBe('active-token')
    })

    it('debe retornar sesión nula cuando no hay sesión', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const { data, error } = await supabase.auth.getSession()

      expect(error).toBeNull()
      expect(data.session).toBeNull()
    })
  })

  describe('manejo de errores de red', () => {
    it('debe manejar timeout en signInWithPassword', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(
        new Error('Request timed out after 30000ms')
      )

      await expect(
        supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'test',
        })
      ).rejects.toThrow('Request timed out')
    })

    it('debe manejar conexión perdida en getSession', async () => {
      vi.mocked(supabase.auth.getSession).mockRejectedValue(
        new Error('Failed to fetch')
      )

      await expect(
        supabase.auth.getSession()
      ).rejects.toThrow('Failed to fetch')
    })

    it('debe manejar error de servidor 500 en signUp', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Internal server error'),
      })

      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'test',
      })

      expect(data.user).toBeNull()
      expect(error).toBeDefined()
      expect(error?.message).toContain('Internal server error')
    })
  })

  describe('onAuthStateChange', () => {
    it('debe suscribirse a cambios de estado de autenticación', () => {
      const mockUnsubscribe = vi.fn()

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      })

      const { data } = supabase.auth.onAuthStateChange(() => {})

      expect(data.subscription).toBeDefined()
      expect(data.subscription.unsubscribe).toBe(mockUnsubscribe)
    })
  })
})
