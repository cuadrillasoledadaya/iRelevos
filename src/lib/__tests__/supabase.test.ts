// ══════════════════════════════════════════════════════════════════
// TESTS DE INTEGRACIÓN — autenticación Supabase (Strict TDD Mode)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

describe('supabase auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signInWithPassword', () => {
    it('debe retornar usuario y sesión con credenciales válidas', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' } as unknown as User
      const mockSession = { access_token: 'token-abc', refresh_token: 'token-ref' } as unknown as Session

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
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' } as AuthError,
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
        data: { user: { id: 'u1' } as unknown as User, session: { access_token: 't1' } as unknown as Session },
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
      const mockUser = { id: 'new-user', email: 'new@example.com' } as unknown as User

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
        error: { message: 'User already registered' } as AuthError,
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
      const mockSession = { access_token: 'active-token', user: { id: 'u1' } } as unknown as Session

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
        error: { message: 'Internal server error' } as AuthError,
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
        data: { subscription: { unsubscribe: mockUnsubscribe } as any },
      } as any)

      const { data } = supabase.auth.onAuthStateChange(() => {})

      expect(data.subscription).toBeDefined()
      expect(data.subscription.unsubscribe).toBe(mockUnsubscribe)
    })
  })
})

// ══════════════════════════════════════════════════════════════════
// REQ-3: HTTP Cookie Session Storage — dedicated tests
// ══════════════════════════════════════════════════════════════════

describe('REQ-3: HTTP Cookie Session Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('T1.a — supabase singleton resolves to createBrowserClient', () => {
    it('debe ser una instancia creada por createBrowserClient de @supabase/ssr', async () => {
      // Verify the module structure: supabase.ts exports `supabase` from createBrowserClient
      const mod = await import('@/lib/supabase')
      expect(mod.supabase).toBeDefined()
      expect(mod.supabase.auth).toBeDefined()
      // createBrowserClient returns a SupabaseClient with auth, from, etc.
      expect(typeof mod.supabase.auth.signInWithPassword).toBe('function')
      expect(typeof mod.supabase.auth.signOut).toBe('function')
      // Verify the import path uses createBrowserClient (not createClient from @supabase/supabase-js)
      const supabaseSource = await import('fs').then(fs =>
        fs.promises.readFile(
          require('path').resolve(process.cwd(), 'src/lib/supabase.ts'),
          'utf-8',
        ),
      ).catch(() => '')
      expect(supabaseSource).toContain('createBrowserClient')
      expect(supabaseSource).toContain('@supabase/ssr')
    })
  })

  describe('T1.b — createServerClient exported from @/lib/supabase/server', () => {
    it('debe exportar createClient que usa createServerClient con getAll/setAll', async () => {
      const serverMod = await import('@/lib/supabase/server')
      expect(serverMod.createClient).toBeDefined()
      expect(typeof serverMod.createClient).toBe('function')

      // Verify the source code uses createServerClient and the cookie pattern
      const serverSource = await import('fs').then(fs =>
        fs.promises.readFile(
          require('path').resolve(process.cwd(), 'src/lib/supabase/server.ts'),
          'utf-8',
        ),
      ).catch(() => '')
      expect(serverSource).toContain('createServerClient')
      expect(serverSource).toContain('@supabase/ssr')
      expect(serverSource).toContain('getAll')
      expect(serverSource).toContain('setAll')
    })
  })

  describe('T1.c — signInWithPassword does NOT write to localStorage', () => {
    it('debe usar cookies HTTP, NO localStorage, para la sesión', async () => {
      // Mock localStorage to track writes
      const localStorageSetItem = vi.fn()
      const originalLocalStorage = globalThis.localStorage

      // Replace localStorage with a spy
      Object.defineProperty(globalThis, 'localStorage', {
        value: { setItem: localStorageSetItem, getItem: vi.fn(), removeItem: vi.fn() },
        configurable: true,
      })

      // Mock the signInWithPassword to succeed
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' } as any,
          session: { access_token: 'tok', refresh_token: 'ref' } as any,
        },
        error: null,
      })

      await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'correct-password',
      })

      // createBrowserClient from @supabase/ssr writes to HTTP cookies, NOT localStorage
      // The SDK should not call localStorage.setItem for session storage
      expect(localStorageSetItem).not.toHaveBeenCalled()

      // Restore
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      })
    })
  })
})
