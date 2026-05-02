// ══════════════════════════════════════════════════════════════════
// TESTS DE EQUIPOPAGE (Strict TDD Mode — Phase 3)
// Gestión de costaleros, roles, bajas, toggle trabajaderas
// ══════════════════════════════════════════════════════════════════

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import EquipoPage from '@/components/pages/EquipoPage'
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
    nombres: ['Juan Pérez', 'Pedro López', 'Ana García', 'Luis Ruiz', 'María Díaz'],
    roles: [
      { pri: 'COS', sec: 'FIJ' },
      { pri: 'COS', sec: 'FIJ' },
      { pri: 'FIJ', sec: 'COS' },
      { pri: 'FIJ', sec: 'COS' },
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

function makeDatosPerfil(trabajaderas: Trabajadera[]): DatosPerfil {
  return {
    banco: [],
    planes: [],
    trabajaderas,
  }
}

const mockHandlers = {
  setNombre: vi.fn(),
  delCost: vi.fn(),
  addCost: vi.fn(),
  toggleBaja: vi.fn(),
  setRolPri: vi.fn(),
  setRolSec: vi.fn(),
  toggleRegla5: vi.fn(),
  setPuntuacion: vi.fn(),
  addCostUltimo: vi.fn(),
  setCensusTarget: vi.fn(),
  openSheet: vi.fn(),
}

function mockUseEstado(trabajaderas: Trabajadera[] = [makeTrabajadera()]) {
  vi.mocked(useEstado).mockReturnValue({
    S: makeDatosPerfil(trabajaderas),
    openEqs: new Set<number>(),
    toggleEq: vi.fn(),
    addTrab: vi.fn(),
    censusHeights: {},
    ...mockHandlers,
  } as unknown as ReturnType<typeof useEstado>)
}

function mockUseAuth(role: string = 'capataz') {
  vi.mocked(useAuth).mockReturnValue({
    profile: {
      id: 'u1',
      nombre: 'Admin',
      apellidos: 'Master',
      apodo: 'Jefe',
      role,
    },
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  } as ReturnType<typeof useAuth>)
}

// ── Tests ──────────────────────────────────────────────────────────

describe('EquipoPage - Vista Mando', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth('capataz')
    mockUseEstado()
  })

  it('debe mostrar el título "Gestión de Equipo"', () => {
    render(<EquipoPage />)

    expect(screen.getByText('Gestión de Equipo')).toBeInTheDocument()
  })

  it('debe renderizar trabajadera con nombre y meta', () => {
    render(<EquipoPage />)

    expect(screen.getByText('Trabajadera 1')).toBeInTheDocument()
    // 5 inscritos, 0 bajas
    expect(screen.getByText(/5 inscritos/)).toBeInTheDocument()
  })

  it('debe mostrar la cabecera de la trabajadera con id', () => {
    render(<EquipoPage />)

    // El badge muestra el id (puede haber un "1" en el numero de costalero también)
    const badges = screen.getAllByText('1')
    expect(badges.length).toBeGreaterThanOrEqual(1)
    // El t-badge es el que está en la cabecera
    expect(badges[0]).toBeInTheDocument()
  })

  it('debe mostrar nombres de costaleros en inputs editables para mando', () => {
    render(<EquipoPage />)

    // Juan Pérez debe estar como input
    const input = screen.getByDisplayValue('Juan Pérez')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('debe mostrar botón de baja (🚑) para cada costalero', () => {
    render(<EquipoPage />)

    // Hay 5 costaleros → 5 botones de baja
    const bajaButtons = screen.getAllByText('🚑')
    expect(bajaButtons).toHaveLength(5)
  })

  it('debe mostrar botón de eliminar (✕) para cada costalero', () => {
    render(<EquipoPage />)

    const deleteButtons = screen.getAllByText('✕')
    expect(deleteButtons).toHaveLength(5)
  })

  it('debe mostrar botón "+ Añadir Costalero"', () => {
    render(<EquipoPage />)

    expect(screen.getByText(/Añadir Costalero/)).toBeInTheDocument()
  })

  it('debe mostrar botón "+ Añadir Trabajadera (Extra)" para mando', () => {
    render(<EquipoPage />)

    expect(screen.getByText(/Añadir Trabajadera \(Extra\)/)).toBeInTheDocument()
  })

  it('debe mostrar checkbox regla 5 cuando hay exactamente 5 costaleros', () => {
    render(<EquipoPage />)

    expect(screen.getByText(/Tienen 5 costaleros/)).toBeInTheDocument()
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
  })

  it('debe mostrar costaleros con baja al estilo correspondiente', () => {
    mockUseEstado([makeTrabajadera({ id: 1, bajas: [0] })])

    render(<EquipoPage />)

    // Juan Pérez está de baja → la fila debe tener clase "baja"
    const row = screen.getByDisplayValue('Juan Pérez').closest('.cost-row')
    expect(row).toBeInTheDocument()
    expect(row?.className).toContain('baja')
  })

  it('debe mostrar workers con rol principal y secundario como selects', () => {
    render(<EquipoPage />)

    // Verificar que hay selects de rol (P) y (S)
    const selects = screen.getAllByRole('combobox')
    // 5 costaleros × 2 selects (pri/sec) = 10
    expect(selects).toHaveLength(10)
  })

  it('debe mostrar multi-trabajadera cuando hay varias', () => {
    const t1 = makeTrabajadera({ id: 1 })
    const t2 = makeTrabajadera({ id: 2, nombres: ['Carlos Sol', 'Sergio Val'] })
    mockUseEstado([t1, t2])

    render(<EquipoPage />)

    expect(screen.getByText('Trabajadera 1')).toBeInTheDocument()
    expect(screen.getByText('Trabajadera 2')).toBeInTheDocument()
  })
})

describe('EquipoPage - Vista Costalero', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no debe mostrar inputs editables para costalero', () => {
    mockUseAuth('costalero')
    mockUseEstado()

    render(<EquipoPage />)

    // Debe mostrar nombres como texto, no como inputs
    const nameElement = screen.getByText('Juan Pérez')
    expect(nameElement.tagName).not.toBe('INPUT')
  })

  it('no debe mostrar botones de eliminar para costalero', () => {
    mockUseAuth('costalero')
    mockUseEstado()

    render(<EquipoPage />)

    // No debe haber botones de eliminar
    expect(screen.queryByText('✕')).not.toBeInTheDocument()
  })

  it('no debe mostrar botón "+ Añadir Trabajadera" para costalero', () => {
    mockUseAuth('costalero')
    mockUseEstado()

    render(<EquipoPage />)

    expect(screen.queryByText(/Añadir Trabajadera \(Extra\)/)).not.toBeInTheDocument()
  })
})
