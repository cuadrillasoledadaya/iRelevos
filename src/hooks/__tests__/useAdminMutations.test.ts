// ══════════════════════════════════════════════════════════════════
// TESTS — useAdminMutations.ts
// Comprehensive tests for admin mutations hook
// ══════════════════════════════════════════════════════════════════

// Set dummy env vars so supabase.ts can initialize
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAdminMutations } from '../useAdminMutations'
import { supabase } from '@/lib/supabase'
import type { CensusEntry, ImportEntry } from '@/components/admin/types'
import type { PasoDB } from '@/lib/types'
import type { Profile } from '@/hooks/useAuth'

// ── Mock helpers ──────────────────────────────────────────────────

const mockCensusEntry = (overrides: Partial<CensusEntry> = {}): CensusEntry => ({
  id: 'c-1',
  email: 'test@example.com',
  nombre: 'Juan',
  apellidos: 'Pérez',
  apodo: 'El Juan',
  telefono: '600123456',
  trabajadera: 1,
  altura: 1.80,
  proyecto_id: 'p-1',
  temporada_id: 't-1',
  created_at: '2025-01-01',
  ...overrides,
})

const mockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'u-1',
  email: 'admin@example.com',
  nombre: 'Admin',
  apellidos: 'User',
  apodo: 'Admin',
  role: 'superadmin',
  telefono: '600999888',
  created_at: '2025-01-01',
  ...overrides,
})

const mockPaso = (overrides: Partial<PasoDB> = {}): PasoDB => ({
  id: 'p-1',
  nombre_paso: 'Cristo',
  nombre_cuadrilla: 'Cuadrilla A',
  num_trabajaderas: 2,
  content: {
    banco: [],
    planes: [],
    trabajaderas: [
      {
        id: 1,
        nombres: ['A', 'B'],
        roles: [],
        salidas: 1,
        tramos: ['Inicio', 'Final'],
        bajas: [],
        regla5costaleros: false,
        plan: null,
        obj: {},
        analisis: null,
        pinned: null,
        puntuaciones: {},
        tramosClaves: [],
      },
    ],
  },
  created_at: '2025-01-01',
  temporada_id: 't-1',
  ...overrides,
})

/**
 * Creates a chainable Supabase mock.
 * All chain methods return `this` by default.
 * Call `.mockReturnThis()` on the terminal method and then override it with
 * `.mockResolvedValue(...)` to return actual data.
 */
function mockChainable() {
  const chain: any = {}
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'not', 'order', 'single', 'match', 'in', 'neq', 'contains']
  chainMethods.forEach((m) => {
    chain[m] = vi.fn().mockReturnThis()
  })
  return chain
}

/**
 * Helper: mock supabase.from to return a specific chain for a given table.
 */
function mockFromTable(table: string, chain: any) {
  vi.mocked(supabase.from).mockImplementation((t) => (t === table ? chain : mockChainable()))
}

function setupAuthMock() {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'mock-token', user: { id: 'user-1' } } },
    error: null,
  } as any)
}

// ── Test render helper ───────────────────────────────────────────

function renderHookWithDeps(overrides: {
  setCensus?: ReturnType<typeof vi.fn>
  setUsuarios?: ReturnType<typeof vi.fn>
  setPasos?: ReturnType<typeof vi.fn>
  fetchCensus?: ReturnType<typeof vi.fn>
  fetchPasos?: ReturnType<typeof vi.fn>
  pasos?: PasoDB[]
  activeTemporadaId?: string
} = {}) {
  const setCensus = overrides.setCensus ?? vi.fn()
  const setUsuarios = overrides.setUsuarios ?? vi.fn()
  const setPasos = overrides.setPasos ?? vi.fn()
  const fetchCensus = overrides.fetchCensus ?? vi.fn().mockResolvedValue(undefined)
  const fetchPasos = overrides.fetchPasos ?? vi.fn().mockResolvedValue(undefined)
  const pasos = overrides.pasos ?? [mockPaso()]
  const activeTemporadaId = overrides.activeTemporadaId ?? 't-1'

  return {
    ...renderHook(() => useAdminMutations(
      activeTemporadaId,
      pasos,
      setCensus as any,
      setUsuarios,
      setPasos,
      fetchCensus,
      fetchPasos,
    )),
    mocks: { setCensus, setUsuarios, setPasos, fetchCensus, fetchPasos },
  }
}

// ── Test suite ───────────────────────────────────────────────────

describe('useAdminMutations', () => {
  let confirmSpy: ReturnType<typeof vi.fn>
  let promptSpy: ReturnType<typeof vi.fn>
  let alertSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    confirmSpy = vi.fn().mockReturnValue(true)
    promptSpy = vi.fn()
    alertSpy = vi.fn()
    vi.stubGlobal('confirm', confirmSpy)
    vi.stubGlobal('prompt', promptSpy)
    vi.stubGlobal('alert', alertSpy)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}), text: vi.fn().mockResolvedValue('') }))
    setupAuthMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ═════════════════════════════════════════════════════════════
  // INITIAL STATE
  // ═════════════════════════════════════════════════════════════

  describe('initial state', () => {
    it('debería inicializar saving como false', () => {
      const { result } = renderHookWithDeps()
      expect(result.current.saving).toBe(false)
    })

    it('debería inicializar importLoading como false', () => {
      const { result } = renderHookWithDeps()
      expect(result.current.importLoading).toBe(false)
    })

    it('debería inicializar editingId como null', () => {
      const { result } = renderHookWithDeps()
      expect(result.current.editingId).toBeNull()
    })

    it('debería inicializar importPreview como null', () => {
      const { result } = renderHookWithDeps()
      expect(result.current.importPreview).toBeNull()
    })

    it('debería inicializar importPid como string vacío', () => {
      const { result } = renderHookWithDeps()
      expect(result.current.importPid).toBe('')
    })
  })

  // ═════════════════════════════════════════════════════════════
  // USUARIOS
  // ═════════════════════════════════════════════════════════════

  describe('eliminarUsuario', () => {
    it('debería eliminar usuario y llamar fetch a delete-user cuando confirm es true', async () => {
      const setUsuarios = vi.fn((fn) => fn([{ id: 'u-1' }, { id: 'u-2' }]))
      confirmSpy.mockReturnValue(true)

      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHookWithDeps({ setUsuarios })

      await act(async () => {
        await result.current.eliminarUsuario('u-1')
      })

      expect(confirmSpy).toHaveBeenCalledWith('¿Seguro que quieres eliminar este perfil activo? Perderá el acceso.')
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token' },
        body: JSON.stringify({ uid: 'u-1' }),
      })
    })

    it('debería mostrar error cuando la API responde con fallo', async () => {
      confirmSpy.mockReturnValue(true)
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'No autorizado' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      const setUsuarios = vi.fn()

      const { result } = renderHookWithDeps({ setUsuarios })

      await act(async () => {
        await result.current.eliminarUsuario('u-1')
      })

      expect(alertSpy).toHaveBeenCalledWith('Error al eliminar: No autorizado')
    })

    it('debería abortar si confirm retorna false', async () => {
      confirmSpy.mockReturnValue(false)
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const setUsuarios = vi.fn()

      const { result } = renderHookWithDeps({ setUsuarios })

      await act(async () => {
        await result.current.eliminarUsuario('u-1')
      })

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('cambiarRol', () => {
    it('debería actualizar el rol del usuario en Supabase y setUsuarios', async () => {
      const setUsuarios = vi.fn((fn) => fn([{ id: 'u-1', role: 'user' }]))
      const profilesChain = mockChainable()
      profilesChain.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      mockFromTable('profiles', profilesChain)

      const { result } = renderHookWithDeps({ setUsuarios })

      await act(async () => {
        await result.current.cambiarRol('u-1', 'capataz' as any)
      })

      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('profiles')
      expect(profilesChain.update).toHaveBeenCalledWith({ role: 'capataz' })
    })
  })

  // ═════════════════════════════════════════════════════════════
  // PASOS
  // ═════════════════════════════════════════════════════════════

  describe('addPaso', () => {
    it('debería insertar un nuevo paso y llamar fetchPasos', async () => {
      const fetchPasos = vi.fn().mockResolvedValue(undefined)
      const proyectosChain = mockChainable()
      proyectosChain.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      mockFromTable('proyectos', proyectosChain)

      const { result } = renderHookWithDeps({ fetchPasos })

      await act(async () => {
        result.current.setNewPaso({ nombre_paso: 'Nuevo Paso', nombre_cuadrilla: 'Nueva Cuadrilla', num_trabajaderas: 4 })
      })

      const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent
      await act(async () => {
        await result.current.addPaso(fakeEvent)
      })

      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('proyectos')
      expect(fetchPasos).toHaveBeenCalled()
    })

    it('debería abortar si nombre_paso está vacío', async () => {
      const fetchPasos = vi.fn()
      const { result } = renderHookWithDeps({ fetchPasos })

      const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent
      await act(async () => {
        await result.current.addPaso(fakeEvent)
      })

      expect(fetchPasos).not.toHaveBeenCalled()
    })
  })

  describe('eliminarPaso', () => {
    it('debería eliminar un paso tras confirmación', async () => {
      confirmSpy.mockReturnValue(true)
      const fetchPasos = vi.fn().mockResolvedValue(undefined)
      const proyectosChain = mockChainable()
      proyectosChain.delete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      mockFromTable('proyectos', proyectosChain)

      const { result } = renderHookWithDeps({ fetchPasos })

      await act(async () => {
        await result.current.eliminarPaso('p-1')
      })

      expect(confirmSpy).toHaveBeenCalledWith('¿Seguro que quieres borrar este Paso? Se perderán todos sus relevos.')
    })
  })

  // ═════════════════════════════════════════════════════════════
  // CENSO CRUD
  // ═════════════════════════════════════════════════════════════

  describe('addToCensus', () => {
    it('debería insertar un nuevo entry en censo y llamar setCensus', async () => {
      const setCensus = vi.fn((fn) => fn([mockCensusEntry()]))
      const insertData = [mockCensusEntry({ id: 'c-new' })]
      const censusChain = mockChainable()
      censusChain.insert.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: insertData, error: null }),
      })
      mockFromTable('census', censusChain)

      const { result } = renderHookWithDeps({ setCensus })

      await act(async () => {
        result.current.setNewEntry({
          email: 'juan@test.com', nombre: 'Juan', apellidos: 'Pérez',
          apodo: 'El Juan', telefono: '600123456', trabajadera: '', altura: '', proyecto_id: 'p-1',
        })
      })

      const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent
      await act(async () => {
        await result.current.addToCensus(fakeEvent)
      })

      expect(setCensus).toHaveBeenCalled()
    })

    it('debería abortar si newEntry.nombre está vacío', async () => {
      const setCensus = vi.fn()
      const { result } = renderHookWithDeps({ setCensus })

      const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent
      await act(async () => {
        await result.current.addToCensus(fakeEvent)
      })

      expect(vi.mocked(supabase.from)).not.toHaveBeenCalledWith('census')
    })
  })

  describe('deleteFromCensus', () => {
    it('debería eliminar del censo tras confirmación y actualizar setCensus', async () => {
      confirmSpy.mockReturnValue(true)
      const setCensus = vi.fn()
      const censusChain = mockChainable()
      censusChain.delete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      mockFromTable('census', censusChain)

      const { result } = renderHookWithDeps({ setCensus })

      await act(async () => {
        await result.current.deleteFromCensus('c-1')
      })

      expect(confirmSpy).toHaveBeenCalledWith('¿Seguro que quieres borrar a este costalero del censo?')
      expect(censusChain.delete).toHaveBeenCalled()
    })
  })

  describe('saveEdit', () => {
    it('debería actualizar el entry de censo y llamar setCensus', async () => {
      const setCensus = vi.fn()
      const censusChain = mockChainable()
      censusChain.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      mockFromTable('census', censusChain)

      const { result } = renderHookWithDeps({ setCensus })

      await act(async () => {
        result.current.setEditForm({ nombre: 'Juan Editado', apellidos: 'Pérez', telefono: '600123456', trabajadera: 2, altura: 1.85 })
      })

      await act(async () => {
        await result.current.saveEdit('c-1')
      })

      expect(censusChain.update).toHaveBeenCalled()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // SYNC
  // ═════════════════════════════════════════════════════════════

  describe('syncTodoCenso', () => {
    it('debería sincronizar el censo hacia el proyecto', async () => {
      const mockCensusData = [
        { nombre: 'Juan', apellidos: 'Pérez', apodo: 'Juan', trabajadera: 1 },
        { nombre: 'María', apellidos: 'López', apodo: 'Mari', trabajadera: 1 },
      ]

      const censusChain = mockChainable()
      censusChain.select.mockReturnThis()
      censusChain.not.mockReturnThis()
      censusChain.eq.mockReturnThis()
      censusChain.order.mockResolvedValue({ data: mockCensusData, error: null })

      const proyectosChain = mockChainable()
      proyectosChain.select.mockReturnThis()
      proyectosChain.eq.mockReturnThis()
      proyectosChain.single.mockResolvedValue({
        data: {
          content: {
            trabajaderas: [
              { id: 1, nombres: ['Costalero 1', 'Costalero 2', 'Costalero 3', 'Costalero 4', 'Costalero 5', 'Costalero 6'] },
            ],
          },
        },
        error: null,
      })
      proyectosChain.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'census') return censusChain
        if (table === 'proyectos') return proyectosChain
        return mockChainable()
      })

      const { result } = renderHookWithDeps()

      await act(async () => {
        await result.current.syncTodoCenso('p-1')
      })

      expect(alertSpy).toHaveBeenCalledWith('✅ Cuadrilla sincronizada desde el censo.')
    })
  })

  describe('syncCensoDesdeProyecto', () => {
    it('debería añadir al censo los nombres encontrados en el proyecto que no existan', async () => {
      confirmSpy.mockReturnValue(true)
      const fetchCensus = vi.fn().mockResolvedValue(undefined)

      const proyectoContent = {
        trabajaderas: [
          { id: 1, nombres: ['Juan', 'María'] },
        ],
      }

      const proyectosChain = mockChainable()
      proyectosChain.select.mockReturnThis()
      proyectosChain.eq.mockReturnThis()
      proyectosChain.single.mockResolvedValue({ data: { content: proyectoContent }, error: null })

      const censusChain = mockChainable()
      censusChain.select.mockReturnThis()
      censusChain.eq.mockResolvedValue({ data: [], error: null })
      censusChain.insert.mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'proyectos') return proyectosChain
        if (table === 'census') return censusChain
        return mockChainable()
      })

      const { result } = renderHookWithDeps({ fetchCensus })

      await act(async () => {
        await result.current.syncCensoDesdeProyecto('p-1')
      })

      expect(alertSpy).toHaveBeenCalledWith('✅ Se han añadido 2 costaleros al censo.')
      expect(fetchCensus).toHaveBeenCalled()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // IMPORT ICUADRILLA
  // ═════════════════════════════════════════════════════════════

  describe('fetchFromICuadrilla', () => {
    it('debería obtener datos desde iCuadrilla y generar preview con status', async () => {
      const remoteData: ImportEntry[] = [
        { nombre: 'Juan', apellidos: 'Pérez', apodo: 'Juan', email: 'juan@test.com', trabajadera: 1, external_id: 'ext-1', selected: false },
      ]
      const existingCensus: Pick<CensusEntry, 'email' | 'external_id'>[] = [
        { email: 'juan@test.com', external_id: 'ext-1' },
      ]

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(remoteData),
      })
      vi.stubGlobal('fetch', fetchMock)

      const censusChain = mockChainable()
      censusChain.select.mockResolvedValue({ data: existingCensus, error: null })
      mockFromTable('census', censusChain)

      const { result } = renderHookWithDeps()

      await act(async () => {
        await result.current.fetchFromICuadrilla('p-1')
      })

      expect(result.current.importPreview).toBeDefined()
      expect(result.current.importPreview?.length).toBeGreaterThan(0)
    })

    it('debería mostrar error si la API de iCuadrilla falla', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Server error'),
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHookWithDeps()

      await act(async () => {
        await result.current.fetchFromICuadrilla('p-1')
      })

      expect(alertSpy).toHaveBeenCalled()
      expect(result.current.importLoading).toBe(false)
    })
  })

  describe('ejecutarImportacion', () => {
    it('debería ejecutar la importación y mostrar alerta de éxito', async () => {
      const censusChain = mockChainable()
      censusChain.select.mockReturnThis()
      censusChain.eq.mockReturnThis()
      censusChain.not.mockReturnThis()
      censusChain.order.mockResolvedValue({ data: [], error: null })
      censusChain.insert.mockResolvedValue({ error: null })

      const proyectosChain = mockChainable()
      proyectosChain.select.mockReturnThis()
      proyectosChain.eq.mockReturnThis()
      proyectosChain.single.mockResolvedValue({
        data: { content: { trabajaderas: [{ id: 1, nombres: [] }] } },
        error: null,
      })
      proyectosChain.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'census') return censusChain
        if (table === 'proyectos') return proyectosChain
        return mockChainable()
      })

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ deleted: 3, inserted: 5 }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHookWithDeps()

      await act(async () => {
        result.current.setImportPid('p-1')
        result.current.setImportPreview([{
          nombre: 'Juan', apellidos: 'Pérez', apodo: 'Juan',
          email: 'juan@test.com', trabajadera: 1, external_id: 'ext-1', selected: true,
        }])
      })

      await act(async () => {
        await result.current.ejecutarImportacion()
      })

      expect(alertSpy).toHaveBeenCalledWith(
        '✅ Sincronización completa (full sync):\n- 3 registros eliminados del censo local\n- 5 costaleros importados desde iCuadrilla\n- Cuadrilla sincronizada.',
      )
    })

    it('debería abortar si importPid está vacío', async () => {
      const { result } = renderHookWithDeps()

      await act(async () => {
        await result.current.ejecutarImportacion()
      })

      expect(alertSpy).toHaveBeenCalledWith('Selecciona un paso para sincronizar.')
    })

    it('debería abortar si importPreview es null', async () => {
      const { result } = renderHookWithDeps()

      await act(async () => {
        result.current.setImportPid('p-1')
      })

      await act(async () => {
        await result.current.ejecutarImportacion()
      })

      expect(alertSpy).toHaveBeenCalledWith('Primero obtené el preview de iCuadrilla.')
    })
  })

  describe('sincronizacionTotal', () => {
    it('debería detectar y eliminar costaleros dados de baja', async () => {
      confirmSpy.mockReturnValue(true)

      const remoteData: ImportEntry[] = [
        { nombre: 'Juan', apellidos: 'Pérez', apodo: 'Juan', email: 'juan@test.com', trabajadera: 1, external_id: 'ext-1', selected: false },
      ]

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(remoteData),
      })
      vi.stubGlobal('fetch', fetchMock)

      const censusChain = mockChainable()
      censusChain.select.mockReturnThis()
      censusChain.eq.mockReturnThis()
      censusChain.not.mockResolvedValue({ data: [], error: null })
      censusChain.delete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      mockFromTable('census', censusChain)

      const { result } = renderHookWithDeps()

      await act(async () => {
        result.current.setImportPid('p-1')
      })

      await act(async () => {
        await result.current.sincronizacionTotal()
      })

      expect(confirmSpy).toHaveBeenCalledWith('⚠️ ATENCIÓN: Esto buscará costaleros en tu App que ya no existen en iCuadrilla y los borrará de tu Censo Local. ¿Proceder?')
    })
  })

  // ═════════════════════════════════════════════════════════════
  // TEMPORADAS
  // ═════════════════════════════════════════════════════════════

  describe('eliminarTemporada', () => {
    it('debería borrar temporada con borrado cascada de proyectos y censo', async () => {
      confirmSpy.mockReturnValue(true)

      const proyectosChain = mockChainable()
      proyectosChain.select.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'p-1' }, { id: 'p-2' }], error: null }) })
      proyectosChain.delete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ id: 'p-1' }, { id: 'p-2' }], error: null }),
        }),
      })

      const censusChain = mockChainable()
      censusChain.delete.mockReturnValue({
        in: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const temporadasChain = mockChainable()
      temporadasChain.delete.mockReturnValue({
        eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ id: 't-1' }], error: null }) }),
      })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'proyectos') return proyectosChain
        if (table === 'census') return censusChain
        if (table === 'temporadas') return temporadasChain
        return mockChainable()
      })

      const { result } = renderHookWithDeps()

      await act(async () => {
        await result.current.eliminarTemporada('t-1')
      })

      expect(alertSpy).toHaveBeenCalledWith('✅ Temporada eliminada con éxito')
    })

    it('debería mostrar error si el borrado de temporada falla', async () => {
      confirmSpy.mockReturnValue(true)

      const proyectosChain = mockChainable()
      proyectosChain.select.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
      proyectosChain.delete.mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) }) })

      const censusChain = mockChainable()
      censusChain.delete.mockReturnValue({
        in: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ error: null }),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const temporadasChain = mockChainable()
      temporadasChain.delete.mockReturnValue({
        eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: new Error('RLS violation') }) }),
      })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'proyectos') return proyectosChain
        if (table === 'census') return censusChain
        if (table === 'temporadas') return temporadasChain
        return mockChainable()
      })

      const { result } = renderHookWithDeps()

      await act(async () => {
        await result.current.eliminarTemporada('t-1')
      })

      expect(alertSpy).toHaveBeenCalledWith('❌ Error en la base de datos: RLS violation')
    })
  })

  describe('crearTemporada', () => {
    it('debería abortar si form.nombre está vacío', async () => {
      const { result } = renderHookWithDeps()

      await act(async () => {
        await result.current.crearTemporada({ nombre: '', clonarCenso: false, clonarPasos: false, sourceTempId: '' })
      })

      expect(vi.mocked(supabase.from)).not.toHaveBeenCalledWith('temporadas')
    })

    it('debería crear una nueva temporada', async () => {
      const temporadasChain = mockChainable()
      temporadasChain.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 't-new', nombre: 'Temporada 2025' },
          error: null,
        }),
      })

      const proyectosChain = mockChainable()
      proyectosChain.select.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
      proyectosChain.insert.mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) })

      const censusChain = mockChainable()
      censusChain.select.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
      censusChain.insert.mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'temporadas') return temporadasChain
        if (table === 'proyectos') return proyectosChain
        if (table === 'census') return censusChain
        return mockChainable()
      })

      const onSuccess = vi.fn()
      const { result } = renderHookWithDeps()

      await act(async () => {
        await result.current.crearTemporada(
          { nombre: 'Temporada 2025', clonarCenso: false, clonarPasos: false, sourceTempId: '' },
          onSuccess,
        )
      })

      expect(alertSpy).toHaveBeenCalledWith('Temporada creada con éxito')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // STATE SETTERS
  // ═════════════════════════════════════════════════════════════

  describe('setNewEntry', () => {
    it('debería actualizar newEntry', async () => {
      const { result } = renderHookWithDeps()

      expect(result.current.newEntry).toEqual({
        email: '', nombre: '', apellidos: '', apodo: '',
        telefono: '', trabajadera: '', altura: '', proyecto_id: '',
      })

      await act(async () => {
        result.current.setNewEntry({
          email: 'test@test.com', nombre: 'Juan', apellidos: 'Pérez',
          apodo: 'J', telefono: '123', trabajadera: '1', altura: '1.8', proyecto_id: 'p-1',
        })
      })

      expect(result.current.newEntry).toEqual({
        email: 'test@test.com', nombre: 'Juan', apellidos: 'Pérez',
        apodo: 'J', telefono: '123', trabajadera: '1', altura: '1.8', proyecto_id: 'p-1',
      })
    })
  })

  describe('setEditForm', () => {
    it('debería actualizar editForm', async () => {
      const { result } = renderHookWithDeps()

      await act(async () => {
        result.current.setEditForm({ nombre: 'Nuevo', apellidos: 'Nombre', telefono: '000', trabajadera: 3, altura: 2.0 })
      })

      expect(result.current.editForm).toEqual({
        nombre: 'Nuevo', apellidos: 'Nombre', telefono: '000', trabajadera: 3, altura: 2.0,
      })
    })
  })
})
