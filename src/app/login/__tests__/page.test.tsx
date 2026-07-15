import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '../page'
import { supabase } from '@/lib/supabase'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

function fillForm(email: string, password: string) {
  const emailInput = screen.getByLabelText(/email/i)
  const passwordInput = screen.getByLabelText(/contraseña/i)
  fireEvent.change(emailInput, { target: { value: email } })
  fireEvent.change(passwordInput, { target: { value: password } })
  return screen.getByRole('button', { name: /entrar/i })
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  it('renders the login form with email and password inputs', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('calls supabase.auth.signInWithPassword directly on submit (no fetch to /api/auth/login)', async () => {
    const mockSession = { access_token: 'test', refresh_token: 'test', expires_at: 9999999999, expires_in: 3600, token_type: 'bearer', user: { id: '1', email: 'test@test.com' } as any } as any
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: mockSession, user: { id: '1', email: 'test@test.com' } as any },
      error: null,
    })

    render(<LoginPage />)
    const submitButton = fillForm('test@test.com', 'password123')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      })
    })
  })

  it('redirects to / and refreshes on successful login', async () => {
    const mockSession = { access_token: 'test', refresh_token: 'test', expires_at: 9999999999, expires_in: 3600, token_type: 'bearer', user: { id: '1', email: 'test@test.com' } as any } as any
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: mockSession, user: { id: '1', email: 'test@test.com' } as any },
      error: null,
    })

    render(<LoginPage />)
    const submitButton = fillForm('test@test.com', 'password123')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('displays Spanish error message on invalid credentials', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials', status: 400 } as any,
    })

    render(<LoginPage />)
    const submitButton = fillForm('test@test.com', 'wrongpassword')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email o contraseña incorrectos')).toBeInTheDocument()
    })
  })

  it('displays Spanish rate-limit message when Supabase returns rate limit error', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Too many requests', status: 429 } as any,
    })

    render(<LoginPage />)
    const submitButton = fillForm('test@test.com', 'password123')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Demasiados intentos. Esperá unos minutos.')).toBeInTheDocument()
    })
  })

  it('does NOT show rate-limit UI elements (no "Intentos restantes" counter)', () => {
    render(<LoginPage />)

    expect(screen.queryByText(/intentos restantes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/bloqueado/i)).not.toBeInTheDocument()
  })

  it('disables button only when loading, not based on rate-limit state', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(
      () => new Promise(() => {}) // Never resolves — keeps loading state
    )

    render(<LoginPage />)
    const submitButton = fillForm('test@test.com', 'password123')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent(/accediendo/i)
    })
  })
})
