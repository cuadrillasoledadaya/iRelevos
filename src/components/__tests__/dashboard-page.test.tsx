// ══════════════════════════════════════════════════════════════════
// TESTS DE DASHBOARDPAGE (Strict TDD Mode — Phase 3)
// Renderizado, estados (loading, datos), navegación
// ══════════════════════════════════════════════════════════════════

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '@/components/pages/DashboardPage'
import { useAuth } from '@/hooks/useAuth'
import { useEstado } from '@/hooks/useEstado'
import { supabase } from '@/lib/supabase'

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/hooks/useEstado', () => ({
  useEstado: vi.fn(),
}))

// next/navigation and next/link are already mocked in setup.ts for some tests,
// but DashboardPage doesn't use router directly, it uses setActivePage

// ── Helpers ────────────────────────────────────────────────────────

function mockSupabaseCounts(censados: number, pasos: number) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation(
      (cb: (r: unknown) => unknown) => Promise.resolve(cb({ data: [], error: null, count: 0 }))
    ),
  }

  vi.mocked(supabase.from).mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>)

  // Intercept to control count via mock resolved value
  let callCount = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vi.mocked(supabase.from).mockImplementation((_table) => {
    const count = callCount === 0 ? censados : pasos
    callCount++
    return {
      select: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation(
        (cb: (r: unknown) => unknown) => Promise.resolve(cb({ data: [], error: null, count }))
      ),
    } as unknown as ReturnType<typeof supabase.from>
  })
}

const mockSetActivePage = vi.fn()

function mockUseEstado(overrides: Record<string, unknown> = {}) {
  vi.mocked(useEstado).mockReturnValue({
    setActivePage: mockSetActivePage,
    ...overrides,
  } as ReturnType<typeof useEstado>)
}

function mockUseAuth(overrides: Record<string, unknown> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    profile: null,
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>)
}

// ── Tests ──────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth()
    mockUseEstado()
    mockSupabaseCounts(42, 3)
  })

  // 1. Renderizado: Bienvenida con perfil
  it('debe mostrar saludo personalizado con el nombre del perfil', async () => {
    mockUseAuth({
      profile: { id: 'u1', nombre: 'Manolo', apellidos: 'García', apodo: 'El Mani', role: 'costalero' },
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/¡Hola, Manolo!/)).toBeInTheDocument()
    })
  })

  // 2. Renderizado: Fallback sin nombre
  it('debe mostrar "Costalero" como fallback cuando no hay perfil', async () => {
    mockUseAuth({ profile: null })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/¡Hola, Costalero!/)).toBeInTheDocument()
    })
  })

  // 3. Loading state
  it('debe mostrar puntos suspensivos mientras carga las estadísticas', () => {
    // No resolvemos la promesa → loading se mantiene
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        then: vi.fn(), // nunca resuelve
      }),
    } as unknown as ReturnType<typeof supabase.from>)

    render(<DashboardPage />)

    // Hay dos "...": uno para Censados y otro para Pasos
    const loadingEls = screen.getAllByText('...')
    expect(loadingEls).toHaveLength(2)
  })

  // 4. Datos cargados
  it('debe mostrar estadísticas de censados y pasos al cargar', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
    expect(screen.getByText('Censados')).toBeInTheDocument()
    expect(screen.getByText('Pasos')).toBeInTheDocument()
  })

  // 5. Acciones rápidas — navegación
  it('debe tener botón que navega a Gestión de Relevos', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('GESTIONAR RELEVOS')).toBeInTheDocument()
    })
  })

  it('debe tener botón que navega al Panel de Control', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('PANEL DE CONTROL')).toBeInTheDocument()
    })
  })

  // 6. Versión de la app
  it('debe mostrar la versión del sistema', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Versión del Sistema')).toBeInTheDocument()
      // La versión viene del package.json — verificamos que existe
      const versionEl = screen.getByText(/^v\d+\.\d+\.\d+/)
      expect(versionEl).toBeInTheDocument()
    })
  })

  // 7. Estado del servidor
  it('debe mostrar estado ONLINE del servidor', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('ONLINE')).toBeInTheDocument()
      expect(screen.getByText('Servidores')).toBeInTheDocument()
    })
  })

  // 8. TRIANGULACIÓN: Clic en botón "GESTIONAR RELEVOS" navega
  it('debe llamar setActivePage con "plan" al hacer clic en Gestionar Relevos', async () => {
    const { fireEvent } = await import('@testing-library/react')
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('GESTIONAR RELEVOS')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('GESTIONAR RELEVOS'))
    expect(mockSetActivePage).toHaveBeenCalledWith('plan')
  })

  // 9. TRIANGULACIÓN: Clic en botón "PANEL DE CONTROL" navega
  it('debe llamar setActivePage con "admin" al hacer clic en Panel de Control', async () => {
    const { fireEvent } = await import('@testing-library/react')
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('PANEL DE CONTROL')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('PANEL DE CONTROL'))
    expect(mockSetActivePage).toHaveBeenCalledWith('admin')
  })

  // 10. TRIANGULACIÓN: Censados = 0, Pasos = 0 (valores en cero)
  it('debe mostrar cero cuando no hay datos', async () => {
    vi.clearAllMocks()
    mockUseAuth()
    mockUseEstado()
    mockSupabaseCounts(0, 0)

    render(<DashboardPage />)

    await waitFor(() => {
      const zeros = screen.getAllByText('0')
      expect(zeros).toHaveLength(2) // censados y pasos a 0
    })
  })
})
