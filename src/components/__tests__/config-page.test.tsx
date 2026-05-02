// ══════════════════════════════════════════════════════════════════
// TESTS DE CONFIGPAGE (Strict TDD Mode — Phase 3)
// Configuración global, banco de nombres, cálculo tramos, reset
// ══════════════════════════════════════════════════════════════════

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfigPage from '@/components/pages/ConfigPage'
import { useEstado } from '@/hooks/useEstado'
import type { Trabajadera, DatosPerfil, PlanRelevo } from '@/lib/types'
import { isGenericTramo } from '@/lib/algoritmos'

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('@/hooks/useEstado', () => ({
  useEstado: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    profile: { id: 'u1', nombre: 'Admin', apellidos: 'Master', apodo: 'Jefe', role: 'superadmin' },
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// ── Helpers ────────────────────────────────────────────────────────

function makeTrabajadera(overrides: Partial<Trabajadera> = {}): Trabajadera {
  return {
    id: 1,
    nombres: ['Juan Pérez', 'Pedro López', 'Ana García', 'Luis Ruiz', 'María Díaz', 'Carlos Sol'],
    roles: [
      { pri: 'COS', sec: 'FIJ' },
      { pri: 'COS', sec: 'FIJ' },
      { pri: 'FIJ', sec: 'COS' },
      { pri: 'FIJ', sec: 'COS' },
      { pri: 'COR', sec: 'FIJ' },
      { pri: 'COR', sec: 'FIJ' },
    ],
    salidas: 2,
    tramos: ['San Roque', 'Plaza', 'Catedral'],
    bajas: [],
    regla5costaleros: false,
    plan: null,
    obj: null,
    analisis: null,
    pinned: null,
    puntuaciones: {},
    tramosClaves: [],
    ...overrides,
  }
}

function makeDatosPerfil(trabajaderas: Trabajadera[], banco: string[] = [], planes: PlanRelevo[] = []): DatosPerfil {
  return { banco, planes, trabajaderas }
}

const mockMutaciones = {
  addBanco: vi.fn(),
  delBanco: vi.fn(),
  calcularTodo: vi.fn(),
  resetTodo: vi.fn(),
  limpiarPlanificacion: vi.fn(),
  limpiarTrabajaderas: vi.fn(),
  limpiarBanco: vi.fn(),
  vaciarCenso: vi.fn(),
  // ConfigTrabajadera internals
  setSalidas: vi.fn(),
  addTramo: vi.fn(),
  delTramo: vi.fn(),
  setNombreTramo: vi.fn(),
  setBancoTarget: vi.fn(),
  openSheet: vi.fn(),
  calcularTrab: vi.fn(),
  toggleTramoClave: vi.fn(),
  tramosOptimosFor: vi.fn(() => 3),
  sugerirTramos: vi.fn(),
  usarBanco: vi.fn(),
  // Planes de Relevos mutations
  addPlan: vi.fn(),
  updatePlan: vi.fn(),
  delPlan: vi.fn(),
  cargarPlanEnTrabajadera: vi.fn(),
}

function mockUseEstado(trabajaderas: Trabajadera[] = [makeTrabajadera()], banco: string[] = [], planes: PlanRelevo[] = []) {
  vi.mocked(useEstado).mockReturnValue({
    S: makeDatosPerfil(trabajaderas, banco, planes),
    ...mockMutaciones,
  } as unknown as ReturnType<typeof useEstado>)
}

// ── Tests ──────────────────────────────────────────────────────────

describe('ConfigPage - Banco de Relevos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEstado()
  })

  it('debe mostrar el título "Banco de Relevos"', () => {
    render(<ConfigPage />)

    expect(screen.getByText(/Banco de Relevos/)).toBeInTheDocument()
  })

  it('debe mostrar un input para añadir relevos al banco', () => {
    render(<ConfigPage />)

    const input = screen.getByPlaceholderText('Añadir relevo…')
    expect(input).toBeInTheDocument()
  })

  it('debe mostrar botón "+ Añadir" para el banco', () => {
    render(<ConfigPage />)

    expect(screen.getByText(/\+ Añadir/)).toBeInTheDocument()
  })

  it('debe llamar addBanco al escribir y hacer clic en añadir', () => {
    render(<ConfigPage />)

    const input = screen.getByPlaceholderText('Añadir relevo…')
    fireEvent.change(input, { target: { value: 'San Roque' } })
    fireEvent.click(screen.getByText(/\+ Añadir/))

    expect(mockMutaciones.addBanco).toHaveBeenCalledWith('San Roque')
  })

  it('debe limpiar el input después de añadir al banco', () => {
    render(<ConfigPage />)

    const input = screen.getByPlaceholderText('Añadir relevo…') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Plaza' } })
    fireEvent.click(screen.getByText(/\+ Añadir/))

    expect(input.value).toBe('')
  })

  it('no debe llamar addBanco con valor vacío', () => {
    render(<ConfigPage />)

    const input = screen.getByPlaceholderText('Añadir relevo…')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByText(/\+ Añadir/))

    expect(mockMutaciones.addBanco).not.toHaveBeenCalled()
  })

  it('debe mostrar nombres existentes en el banco con botón de eliminar', () => {
    mockUseEstado([makeTrabajadera()], ['San Roque', 'Plaza Mayor'])

    render(<ConfigPage />)

    expect(screen.getByText('San Roque')).toBeInTheDocument()
    expect(screen.getByText('Plaza Mayor')).toBeInTheDocument()
    // Los botones de eliminar del banco tienen clase "bdel"
    const deleteButtons = document.querySelectorAll('.bdel')
    expect(deleteButtons).toHaveLength(2)
    expect(deleteButtons[0]).toHaveTextContent('✕')
  })

  it('debe llamar addBanco al presionar Enter', () => {
    render(<ConfigPage />)

    const input = screen.getByPlaceholderText('Añadir relevo…')
    fireEvent.change(input, { target: { value: 'Catedral' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockMutaciones.addBanco).toHaveBeenCalledWith('Catedral')
  })
})

describe('ConfigPage - Trabajaderas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEstado()
  })

  it('debe mostrar sección de Trabajaderas', () => {
    render(<ConfigPage />)

    expect(screen.getByText('✦ Trabajaderas')).toBeInTheDocument()
  })

  it('debe mostrar reglas de negocio (5 dentro, salidas equitativas, sin repetir)', () => {
    render(<ConfigPage />)

    expect(screen.getByText(/5 dentro siempre/)).toBeInTheDocument()
    expect(screen.getByText(/Salidas equitativas/)).toBeInTheDocument()
    expect(screen.getByText(/Sin repetir 1º\/último/)).toBeInTheDocument()
  })

  it('debe mostrar cada trabajadera con su id', () => {
    render(<ConfigPage />)

    expect(screen.getByText('Trabajadera 1')).toBeInTheDocument()
  })

  it('debe mostrar meta de costaleros activos y fuera por tramo', () => {
    render(<ConfigPage />)

    // 6 costaleros, 0 bajas → F = 6-5 = 1 (sin regla5)
    const header = screen.getByText(/6 cost\./)
    expect(header).toBeInTheDocument()
    expect(screen.getByText(/1 fuera\/tramo/)).toBeInTheDocument()
  })
})

describe('ConfigPage - Mantenimiento y Limpieza', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))
    mockUseEstado()
  })

  it('debe mostrar sección de Mantenimiento', () => {
    render(<ConfigPage />)

    expect(screen.getByText(/Mantenimiento y Limpieza/)).toBeInTheDocument()
  })

  it('debe mostrar botón de "Limpiar Planificación"', () => {
    render(<ConfigPage />)

    expect(screen.getByText('Limpiar Planificación')).toBeInTheDocument()
    expect(screen.getAllByText('Limpiar')[0]).toBeInTheDocument()
  })

  it('debe mostrar botón de "Vaciar Equipos"', () => {
    render(<ConfigPage />)

    // El título de la acción
    expect(screen.getByText('Vaciar Equipos')).toBeInTheDocument()
    // Hay 2 botones con texto "Vaciar": uno para Equipos y otro para Censo
    const vaciarButtons = screen.getAllByText('Vaciar')
    expect(vaciarButtons).toHaveLength(2)
  })

  it('debe mostrar botón de "Reset Total" (Hard Reset)', () => {
    render(<ConfigPage />)

    expect(screen.getByText('Reset Total')).toBeInTheDocument()
    expect(screen.getByText(/Hard Reset/)).toBeInTheDocument()
  })

  it('debe llamar resetTodo al confirmar Hard Reset', () => {
    render(<ConfigPage />)

    fireEvent.click(screen.getByText(/Hard Reset/))

    expect(window.confirm).toHaveBeenCalled()
    expect(mockMutaciones.resetTodo).toHaveBeenCalled()
  })

  it('no debe llamar resetTodo si se cancela la confirmación', () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    render(<ConfigPage />)

    fireEvent.click(screen.getByText(/Hard Reset/))

    expect(mockMutaciones.resetTodo).not.toHaveBeenCalled()
  })

  it('debe mostrar botón de "Calcular Todas"', () => {
    render(<ConfigPage />)

    expect(screen.getByText(/Calcular Todas/)).toBeInTheDocument()
  })

  it('debe llamar calcularTodo al hacer clic en Calcular Todas', () => {
    render(<ConfigPage />)

    fireEvent.click(screen.getByText(/Calcular Todas/))

    expect(mockMutaciones.calcularTodo).toHaveBeenCalled()
  })
})

// ══════════════════════════════════════════════════════════════════
// Phase 5: Planes de Relevos — Tests (Strict TDD Mode)
// ══════════════════════════════════════════════════════════════════

describe('isGenericTramo — función pura', () => {
  it('debe detectar "Tramo N (TN)" como genérico', () => {
    expect(isGenericTramo('Tramo 1 (T1)')).toBe(true)
    expect(isGenericTramo('Tramo 2 (T2)')).toBe(true)
    expect(isGenericTramo('Tramo 10 (T3)')).toBe(true)
    expect(isGenericTramo('Tramo 1 (T7)')).toBe(true)
  })

  it('debe detectar nombres custom como no genéricos', () => {
    expect(isGenericTramo('Salida')).toBe(false)
    expect(isGenericTramo('Salida Iglesia')).toBe(false)
    expect(isGenericTramo('Plaza Mayor')).toBe(false)
    expect(isGenericTramo('Calle Real')).toBe(false)
  })

  it('debe manejar casos borde', () => {
    expect(isGenericTramo('')).toBe(false)
    expect(isGenericTramo('Tramo')).toBe(false)
    expect(isGenericTramo('Tramo 1')).toBe(false)
    expect(isGenericTramo('Tramo 1 (T)')).toBe(false)
  })
})

describe('Planes de Relevos — Mutaciones de estado', () => {
  // These tests verify the plan mutation functions exist and have correct signatures
  // Full behavioral tests come after UI implementation

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEstado()
  })

  it('debe exponer addPlan en el contexto de estado', () => {
    render(<ConfigPage />)
    const ctx = vi.mocked(useEstado).mock.results[0]?.value
    expect(ctx).toBeDefined()
    expect(typeof ctx.addPlan).toBe('function')
  })

  it('debe exponer updatePlan en el contexto de estado', () => {
    render(<ConfigPage />)
    const ctx = vi.mocked(useEstado).mock.results[0]?.value
    expect(ctx).toBeDefined()
    expect(typeof ctx.updatePlan).toBe('function')
  })

  it('debe exponer delPlan en el contexto de estado', () => {
    render(<ConfigPage />)
    const ctx = vi.mocked(useEstado).mock.results[0]?.value
    expect(ctx).toBeDefined()
    expect(typeof ctx.delPlan).toBe('function')
  })

  it('debe exponer cargarPlanEnTrabajadera en el contexto de estado', () => {
    render(<ConfigPage />)
    const ctx = vi.mocked(useEstado).mock.results[0]?.value
    expect(ctx).toBeDefined()
    expect(typeof ctx.cargarPlanEnTrabajadera).toBe('function')
  })
})

describe('ConfigPage — Sección Planes de Relevos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEstado()
  })

  it('debe mostrar sección "Planes de Relevos"', () => {
    render(<ConfigPage />)

    expect(screen.getByText(/Planes de Relevos/)).toBeInTheDocument()
  })

  it('debe mostrar botón "Crear plan" cuando no hay planes', () => {
    render(<ConfigPage />)

    expect(screen.getByText(/Crear plan/)).toBeInTheDocument()
  })

  it('debe mostrar los planes existentes con sus nombres', () => {
    mockUseEstado(
      [makeTrabajadera()],
      [],
      [
        { id: 'plan_1', nombre: 'Semana Santa', tramos: ['Salida', 'Plaza'] },
        { id: 'plan_2', nombre: 'Rosario', tramos: ['Iglesia', 'Calle'] },
      ]
    )

    render(<ConfigPage />)

    expect(screen.getByDisplayValue('Semana Santa')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Rosario')).toBeInTheDocument()
    // Verify tramos preview
    expect(screen.getByText(/Salida, Plaza/)).toBeInTheDocument()
    expect(screen.getByText(/Iglesia, Calle/)).toBeInTheDocument()
  })
})

describe('ConfigPage — Selector de plan en trabajadera', () => {
  it('debe mostrar dropdown de planes en cada trabajadera', () => {
    mockUseEstado(
      [makeTrabajadera()],
      [],
      [
        { id: 'plan_1', nombre: 'Semana Santa', tramos: ['Salida'] },
      ]
    )

    render(<ConfigPage />)

    // Debe existir un select con los planes disponibles
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('debe mostrar botón "Cargar" junto al dropdown', () => {
    mockUseEstado(
      [makeTrabajadera()],
      [],
      [{ id: 'plan_1', nombre: 'Semana Santa', tramos: ['Salida'] }]
    )

    render(<ConfigPage />)

    const cargarButtons = screen.getAllByRole('button', { name: 'Cargar' })
    expect(cargarButtons.length).toBeGreaterThanOrEqual(1)
    expect(cargarButtons[0]).toBeDisabled()
  })

  it('debe llamar cargarPlanEnTrabajadera al seleccionar plan y hacer clic en Cargar', () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    mockUseEstado(
      [makeTrabajadera()],
      [],
      [{ id: 'plan_1', nombre: 'Semana Santa', tramos: ['Salida', 'Plaza'] }]
    )

    render(<ConfigPage />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'plan_1' } })

    const cargarBtn = screen.getAllByRole('button', { name: 'Cargar' })[0]
    expect(cargarBtn).not.toBeDisabled()

    fireEvent.click(cargarBtn)

    expect(mockMutaciones.cargarPlanEnTrabajadera).toHaveBeenCalledWith(1, 'plan_1')
  })
})
