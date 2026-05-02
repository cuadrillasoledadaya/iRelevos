// ══════════════════════════════════════════════════════════════════
// TESTS DE COMPONENTES DE AUTENTICACIÓN (Strict TDD Mode)
// LoginPage, RegisterPage, integración con useAuth
// ══════════════════════════════════════════════════════════════════

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'
import { supabase } from '@/lib/supabase'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  it('debe renderizar el formulario de login', () => {
    render(<LoginPage />)

    expect(screen.getByText('RELEVOS')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByText('ENTRAR')).toBeInTheDocument()
    expect(screen.getByText('Crear nuevo perfil')).toBeInTheDocument()
  })

  it('debe mostrar el estado de loading durante el login', async () => {
    // Simular login exitoso pero con delay
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, 100, {
          data: { user: { id: 'u1' }, session: { access_token: 't1' } },
          error: null,
        })
      })
    })

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Contraseña')
    const submitButton = screen.getByText('ENTRAR')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    // Debe mostrar estado de carga
    expect(screen.getByText('ACCEDIENDO...')).toBeInTheDocument()

    // Esperar a que termine
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('debe mostrar mensaje de error con credenciales inválidas', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Invalid login credentials'),
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad@email.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByText('ENTRAR'))

    await waitFor(() => {
      expect(screen.getByText(/Error: Invalid login credentials/)).toBeInTheDocument()
    })

    // No debe redirigir
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('debe redirigir a home en login exitoso', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u1' }, session: { access_token: 't1' } },
      error: null,
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'correct' } })
    fireEvent.click(screen.getByText('ENTRAR'))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('debe tener enlace a la página de registro', () => {
    render(<LoginPage />)

    const registerLink = screen.getByText('Crear nuevo perfil')
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
  })
})

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  it('debe renderizar el formulario de registro completo', () => {
    render(<RegisterPage />)

    expect(screen.getByText('NUEVO COSTALERO')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Apellidos')).toBeInTheDocument()
    expect(screen.getByLabelText('Apodo / Nombre en Paso')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByText('CREAR PERFIL')).toBeInTheDocument()
  })

  it('debe registrar usuario correctamente', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' }, session: null },
      error: null,
    })

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez' } })
    fireEvent.change(screen.getByLabelText('Apodo / Nombre en Paso'), { target: { value: 'El Torero' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREAR PERFIL'))

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: {
            email: 'new@example.com',
            nombre: 'Juan',
            apellidos: 'Pérez',
            apodo: 'El Torero',
            role: 'costalero',
          },
        },
      })
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('debe mostrar error cuando falla el registro', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('User already registered'),
    })

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@example.com' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREAR PERFIL'))

    await waitFor(() => {
      expect(screen.getByText('User already registered')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('debe mostrar estado de loading durante el registro', async () => {
    vi.mocked(supabase.auth.signUp).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, 100, {
          data: { user: { id: 'new-user' }, session: null },
          error: null,
        })
      })
    })

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREAR PERFIL'))

    expect(screen.getByText('REGISTRANDO...')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('debe verificar censo al escribir email', async () => {
    // Mock para la query de census
    const mockCensus = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { nombre: 'Juan', apellidos: 'Pérez', apodo: 'El Torero' },
        error: null,
      }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockCensus as unknown as ReturnType<typeof supabase.from>)

    render(<RegisterPage />)

    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'juan@example.com' } })
    fireEvent.blur(emailInput)

    await waitFor(() => {
      expect(screen.getByText('✓ Email reconocido por la Hermandad')).toBeInTheDocument()
    })
  })

  it('debe tener enlace a la página de login', () => {
    render(<RegisterPage />)

    const loginLink = screen.getByText('Inicia sesión')
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })
})
