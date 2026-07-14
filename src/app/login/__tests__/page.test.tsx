// ══════════════════════════════════════════════════════════════════
// TESTS — Login page (REQ-1 redirect + two-call flow)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { User, Session } from '@supabase/supabase-js'

// Mock next/navigation with useSearchParams
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockSearchParamsGetter = vi.fn(() => new URLSearchParams(''))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: mockRefresh,
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => mockSearchParamsGetter()),
}))

// supabase is already mocked globally in test/setup.ts
const { supabase } = await import('@/lib/supabase')
const { useSearchParams } = await import('next/navigation')
const LoginPage = (await import('@/app/login/page')).default

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockRefresh.mockClear()
    mockSearchParamsGetter.mockReturnValue(new URLSearchParams(''))
    vi.mocked(supabase.auth.signInWithPassword).mockReset()
  })

  function setRedirect(value: string | null) {
    mockSearchParamsGetter.mockImplementation(() => {
      const params = new URLSearchParams()
      if (value) params.set('redirect', value)
      return params
    })
  }

  async function fillAndSubmit(email = 'test@example.com', password = 'password123') {
    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /ENTRAR/ })

    fireEvent.change(emailInput, { target: { value: email } })
    fireEvent.change(passwordInput, { target: { value: password } })
    fireEvent.click(submitButton)
  }

  describe('T3 — redirect param', () => {
    it('debe redirigir a "/" cuando no hay redirect param', async () => {
      setRedirect(null)
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'u1' } as unknown as User, session: { access_token: 'tok' } as unknown as Session },
        error: null,
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, remaining: 4 }),
      })

      await fillAndSubmit()

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('debe redirigir al valor de ?redirect= después de login exitoso', async () => {
      setRedirect('/admin/users')
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'u1' } as unknown as User, session: { access_token: 'tok' } as unknown as Session },
        error: null,
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, remaining: 4 }),
      })

      await fillAndSubmit()

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/users')
      })
    })

    it('debe evitar redirect loop: si redirect=/login, redirigir a "/"', async () => {
      setRedirect('/login')
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'u1' } as unknown as User, session: { access_token: 'tok' } as unknown as Session },
        error: null,
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, remaining: 4 }),
      })

      await fillAndSubmit()

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('T5 — two-call flow (rate limit + signin)', () => {
    it('debe primero verificar rate limit, luego hacer signInWithPassword', async () => {
      setRedirect(null)
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'u1' } as unknown as User, session: { access_token: 'tok' } as unknown as Session },
        error: null,
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, remaining: 4 }),
      })

      await fillAndSubmit()

      // Verify fetch was called first (rate limit check)
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })

      // Then signInWithPassword was called
      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        })
      })
    })

    it('debe mostrar error de rate limit cuando el API retorna 429', async () => {
      setRedirect(null)

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Demasiados intentos. Esperá unos minutos.', remaining: 0 }),
      })

      render(<LoginPage />)

      const emailInput = screen.getByPlaceholderText('tu@email.com')
      const passwordInput = screen.getByPlaceholderText('••••••••')
      const submitButton = screen.getByRole('button', { name: /ENTRAR/ })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Demasiados intentos/)).toBeInTheDocument()
      })

      // signInWithPassword should NOT be called when rate limited
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('debe mostrar error genérico cuando el fetch falla', async () => {
      setRedirect(null)

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      render(<LoginPage />)

      const emailInput = screen.getByPlaceholderText('tu@email.com')
      const passwordInput = screen.getByPlaceholderText('••••••••')
      const submitButton = screen.getByRole('button', { name: /ENTRAR/ })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Ocurrió un error/)).toBeInTheDocument()
      })
    })
  })
})
