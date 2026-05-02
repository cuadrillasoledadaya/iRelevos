// ══════════════════════════════════════════════════════════════════
// TESTS DE PLANPAGE (Strict TDD Mode — Phase 3)
// Vista de mando vs costalero, renderizado de plan, interacciones
// ══════════════════════════════════════════════════════════════════

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlanPage from '@/components/pages/PlanPage'
import { useAuth } from '@/hooks/useAuth'
import { useEstado } from '@/hooks/useEstado'
import type { Trabajadera, DatosPerfil } from '@/lib/types'

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/hooks/useEstado', () => ({
  useEstado: vi.fn(),
}))

// Mock next/navigation for useRouter
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// ── Helpers ────────────────────────────────────────────────────────

type ProfileFixtures = {
  superadmin: ReturnType<typeof useAuth>['profile']
  capataz: ReturnType<typeof useAuth>['profile']
  costalero: ReturnType<typeof useAuth>['profile']
  costaleroConTrabajadera: ReturnType<typeof useAuth>['profile']
}

const profiles: ProfileFixtures = {
  superadmin: {
    id: 'u1', nombre: 'Admin', apellidos: 'Master', apodo: 'Jefe', role: 'superadmin',
  },
  capataz: {
    id: 'u2', nombre: 'Capataz', apellidos: 'Jefe', apodo: 'Capi', role: 'capataz',
  },
  costalero: {
    id: 'u3', nombre: 'Juan', apellidos: 'Pérez', apodo: 'El Torero', role: 'costalero',
  },
  costaleroConTrabajadera: {
    id: 'u4', nombre: 'Juan', apellidos: 'Pérez', apodo: 'El Torero', role: 'costalero', trabajadera: 1,
  },
}

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
    plan: [
      { dentro: [0, 1, 2, 3, 4], fuera: [5] },
      { dentro: [1, 2, 3, 4, 5], fuera: [0] },
      { dentro: [0, 2, 3, 4, 5], fuera: [1] },
    ],
    obj: { 0: 2, 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 },
    analisis: {
      conteo: { 0: 2, 1: 2, 2: 3, 3: 2, 4: 2, 5: 1 },
      okObj: true,
      dentro5: true,
      primer: [],
      ultimo: [],
      rep: [],
      cons: 0,
    },
    pinned: null,
    puntuaciones: {},
    tramosClaves: [],
    ...overrides,
  }
}

function makeDatosPerfil(trabajaderas: Trabajadera[]): DatosPerfil {
  return {
    banco: [],
    planes: [],
    trabajaderas,
  }
}

const calcularTodoMock = vi.fn()

function mockUseEstado(trabajaderas: Trabajadera[] = [makeTrabajadera()]) {
  vi.mocked(useEstado).mockReturnValue({
    S: makeDatosPerfil(trabajaderas),
    calcularTodo: calcularTodoMock,
    // PlanTrabajadera internals
    openSheet: vi.fn(),
    setCellTarget: vi.fn(),
    setBancoTarget: vi.fn(),
    addTramo: vi.fn(),
    delTramo: vi.fn(),
    setSalidas: vi.fn(),
    calcularTrab: vi.fn(),
    completarPlan: vi.fn(),
    limpiarPlan: vi.fn(),
    getErroresPinned: vi.fn(() => []),
    quitarBloqueos: vi.fn(),
    sugerirYCalcular: vi.fn(),
  } as unknown as ReturnType<typeof useEstado>)
}

function mockUseAuth(profile: ReturnType<typeof useAuth>['profile'] | null = null) {
  vi.mocked(useAuth).mockReturnValue({
    profile,
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  } as ReturnType<typeof useAuth>)
}

// ── Tests ──────────────────────────────────────────────────────────

describe('PlanPage - Vista Mando', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe mostrar "Plan de Rotaciones" como título para superadmin', () => {
    mockUseAuth(profiles.superadmin)
    mockUseEstado()

    render(<PlanPage />)

    expect(screen.getByText('Plan de Rotaciones')).toBeInTheDocument()
  })

  it('debe mostrar botón "Calcular Todos" para capataz', () => {
    mockUseAuth(profiles.capataz)
    mockUseEstado()

    render(<PlanPage />)

    expect(screen.getByText(/Calcular Todos/)).toBeInTheDocument()
  })

  it('debe llamar a calcularTodo al hacer clic en el botón', () => {
    mockUseAuth(profiles.capataz)
    mockUseEstado()

    render(<PlanPage />)

    fireEvent.click(screen.getByText(/Calcular Todos/))
    expect(calcularTodoMock).toHaveBeenCalled()
  })

  it('debe renderizar cada trabajadera como PlanTrabajadera', () => {
    mockUseAuth(profiles.superadmin)
    const t1 = makeTrabajadera({ id: 1 })
    const t2 = makeTrabajadera({ id: 2, nombres: ['Solo 5'], tramos: ['T1'] })
    mockUseEstado([t1, t2])

    render(<PlanPage />)

    // Ver cabeceras de cada trabajadera
    expect(screen.getByText('Trabajadera 1')).toBeInTheDocument()
    expect(screen.getByText('Trabajadera 2')).toBeInTheDocument()
  })

  it('debe mostrar meta de trabajadera con costaleros activos y tramos', () => {
    mockUseAuth(profiles.superadmin)
    mockUseEstado()

    render(<PlanPage />)

    // 6 costaleros, 0 bajas → 6 act. · 3 tramos · Salen 1
    const headerText = screen.getByText(/6 act\. · 3 tramos/)
    expect(headerText).toBeInTheDocument()
  })

  it('debe mostrar error de pinned states cuando existen', () => {
    mockUseAuth(profiles.capataz)
    vi.mocked(useEstado).mockReturnValue({
      S: makeDatosPerfil([makeTrabajadera()]),
      calcularTodo: calcularTodoMock,
      openSheet: vi.fn(),
      setCellTarget: vi.fn(),
      setBancoTarget: vi.fn(),
      addTramo: vi.fn(),
      delTramo: vi.fn(),
      setSalidas: vi.fn(),
      calcularTrab: vi.fn(),
      completarPlan: vi.fn(),
      limpiarPlan: vi.fn(),
      getErroresPinned: vi.fn(() => ['Costalero 1 fijado en 3+ tramos']),
      quitarBloqueos: vi.fn(),
      sugerirYCalcular: vi.fn(),
    } as unknown as ReturnType<typeof useEstado>)

    render(<PlanPage />)

    expect(screen.getByText(/Reglas de fijación rotas/)).toBeInTheDocument()
  })
})

describe('PlanPage - Vista Costalero (MiPlanPersonal)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe mostrar fallback "Mi Plan Personal" cuando no se encuentra al costalero', () => {
    mockUseAuth({
      ...profiles.costalero,
      nombre: 'Inexistente',
      apellidos: 'Fantasmas',
      apodo: 'Ghost',
    })
    mockUseEstado()

    render(<PlanPage />)

    expect(screen.getByText('Mi Plan Personal')).toBeInTheDocument()
    expect(screen.getByText(/No se encontró tu nombre en ninguna trabajadera/)).toBeInTheDocument()
  })

  it('debe mostrar saludo personalizado con nombre cuando se encuentra al costalero', () => {
    mockUseAuth(profiles.costaleroConTrabajadera)
    mockUseEstado([makeTrabajadera({ id: 1 })])

    render(<PlanPage />)

    // El costalero "Juan Pérez" está en la posición 0 con plan
    expect(screen.getByText(/¡Hola, Juan!/)).toBeInTheDocument()
  })

  it('debe mostrar los tramos del relevo personal (dentro/fuera)', () => {
    mockUseAuth(profiles.costaleroConTrabajadera)
    // Juan está en ci=0, en tramo 0 está dentro, tramo 1 está fuera
    mockUseEstado([makeTrabajadera({ id: 1 })])

    render(<PlanPage />)

    // Los nombres de tramo aparecen varias veces en la UI
    // Verificamos cantidad de instancias: 3 tramos, cada uno aparece en varios lugares
    const sanRoqueElements = screen.getAllByText('San Roque')
    expect(sanRoqueElements.length).toBeGreaterThanOrEqual(2)

    const plazaElements = screen.getAllByText('Plaza')
    expect(plazaElements.length).toBeGreaterThanOrEqual(1)

    const catedralElements = screen.getAllByText('Catedral')
    expect(catedralElements.length).toBeGreaterThanOrEqual(2)

    // Juan (ci=0) está DENTRO en tramo 0 y tramo 2
    const dentroLabels = screen.getAllByText(/DENTRO/)
    expect(dentroLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('debe mostrar salidas y objetivo', () => {
    mockUseAuth(profiles.costaleroConTrabajadera)
    mockUseEstado([makeTrabajadera({ id: 1 })])

    render(<PlanPage />)

    expect(screen.getByText('Salidas')).toBeInTheDocument()
    expect(screen.getByText('Objetivo de salidas')).toBeInTheDocument()
  })

  it('debe mostrar advertencia cuando el plan no ha sido calculado', () => {
    mockUseAuth(profiles.costaleroConTrabajadera)
    mockUseEstado([makeTrabajadera({ id: 1, plan: null, analisis: null })])

    render(<PlanPage />)

    expect(screen.getByText(/El plan de tu trabajadera aún no ha sido calculado/)).toBeInTheDocument()
  })
})
