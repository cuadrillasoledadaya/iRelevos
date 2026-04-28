import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPage from './AdminPage'
import { useEstado, EstadoCtx } from '../../hooks/useEstado'
import { supabase } from '../../lib/supabase'

vi.mock('../../hooks/useEstado')
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '123' }, loading: false })
}))

describe('AdminPage - Seasons Deletion', () => {
  const mockSetActiveTemporadaId = vi.fn()
  const mockRefetchPasos = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    const mockEstado = {
      pid: 'p1',
      activeTemporadaId: 't1',
      setActiveTemporadaId: mockSetActiveTemporadaId,
      temporadas: [
        { id: 't1', nombre: 'Temporada 2024', activa: true },
        { id: 't2', nombre: 'Temporada 2023', activa: false },
      ],
      refetchPasos: mockRefetchPasos,
      pasos: [],
      S: { trabajaderas: [], banco: [] },
      nombrePaso: '',
      nombreCuadrilla: '',
      activePage: 'home',
      setActivePage: vi.fn(),
      activeSheet: null,
      openSheet: vi.fn(),
      closeSheet: vi.fn(),
      tema: 'light',
      toggleTema: vi.fn(),
      swapSel: null,
      setSwapSel: vi.fn(),
      cellTarget: null,
      setCellTarget: vi.fn(),
      bancoTarget: null,
      setBancoTarget: vi.fn(),
      censusTarget: null,
      setCensusTarget: vi.fn(),
      openEqs: new Set<number>(),
      toggleEq: vi.fn(),
      setNombre: vi.fn(),
      addCost: vi.fn(),
      delCost: vi.fn(),
      toggleBaja: vi.fn(),
      setRolPri: vi.fn(),
      setRolSec: vi.fn(),
      toggleRegla5: vi.fn(),
      addTrab: vi.fn(),
      setPuntuacion: vi.fn(),
      addCostUltimo: vi.fn(),
      setNombreTramo: vi.fn(),
      addTramo: vi.fn(),
      delTramo: vi.fn(),
      setSalidas: vi.fn(),
      usarBanco: vi.fn(),
      tramosOptimosFor: vi.fn(),
      sugerirTramos: vi.fn(),
      toggleTramoClave: vi.fn(),
      sugerirYCalcular: vi.fn(),
      addBanco: vi.fn(),
      delBanco: vi.fn(),
      calcularTodo: vi.fn(),
      calcularTrab: vi.fn(),
      completarPlan: vi.fn(),
      limpiarPlan: vi.fn(),
      quitarBloqueos: vi.fn(),
      setPinned: vi.fn(),
      getErroresPinned: vi.fn(),
      confirmarSwap: vi.fn(),
      limpiarPlanificacion: vi.fn(),
      limpiarTrabajaderas: vi.fn(),
      limpiarBanco: vi.fn(),
      vaciarCenso: vi.fn(),
      resetTodo: vi.fn(),
      censusHeights: {}
    } as unknown as EstadoCtx

    vi.mocked(useEstado).mockReturnValue(mockEstado)
    
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('alert', vi.fn())
  })

  it('should show a delete button for each season', async () => {
    render(<AdminPage />)
    fireEvent.click(screen.getByText('TEMPORADAS'))
    const deleteButtons = screen.getAllByTitle('Eliminar Temporada')
    expect(deleteButtons).toHaveLength(2)
  })

  it('should call cascade delete when delete button is clicked and confirmed', async () => {
    render(<AdminPage />)
    fireEvent.click(screen.getByText('TEMPORADAS'))
    const deleteButtons = screen.getAllByTitle('Eliminar Temporada')
    fireEvent.click(deleteButtons[1])
    
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('¿Seguro que quieres borrar esta temporada?'))
    
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('census')
      expect(supabase.from('census').delete().eq).toBeDefined()
    })
  })

  it('should clone census and link to new project IDs', async () => {
    const sourceTempId = 't2'
    const oldProjectId = 'old-p1'
    const newProjectId = 'new-p1'
    const newTempId = 't3'

    vi.stubGlobal('location', { reload: vi.fn() })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const query = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn(),
      }

      const makeAwaitable = (data: unknown) => {
        query.then = vi.fn().mockImplementation((onRes: (val: unknown) => void) => Promise.resolve({ data, error: null }).then(onRes))
        return query
      }

      if (table === 'temporadas') {
        query.single.mockResolvedValue({ data: { id: newTempId, nombre: 'Temporada 2025' }, error: null })
      }
      if (table === 'proyectos') {
        query.eq.mockImplementation(() => makeAwaitable([{ id: oldProjectId, nombre_paso: 'Paso Viejo', content: { trabajaderas: [] } }]))
        query.single.mockResolvedValue({ data: { id: newProjectId }, error: null })
      }
      if (table === 'census') {
        query.eq.mockImplementation(() => makeAwaitable([{ id: 'c1', nombre: 'Juan', proyecto_id: oldProjectId }]))
        query.insert.mockResolvedValue({ data: null, error: null })
      }
      return query as unknown as ReturnType<typeof supabase.from>
    })

    render(<AdminPage />)
    fireEvent.click(screen.getByText('TEMPORADAS'))
    
    const input = screen.getByPlaceholderText('Nombre de la temporada (ej: SS 2025)')
    fireEvent.change(input, { target: { value: 'Temporada 2025' } })
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: sourceTempId } })
    
    const createButton = screen.getByText('CREAR NUEVA TEMPORADA')
    fireEvent.click(createButton)
    
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('proyectos')
      expect(supabase.from).toHaveBeenCalledWith('census')
      
      const insertMock = vi.mocked(supabase.from('census').insert)
      const allInsertCalls = insertMock.mock.calls
      const censusInsertCall = allInsertCalls.find((call) => {
        const payload = call[0]
        return Array.isArray(payload) && payload.length > 0 && (payload[0] as Record<string, unknown>).nombre === 'Juan'
      })?.[0] as Record<string, unknown>[]
      
      expect(censusInsertCall).toBeDefined()
      expect(censusInsertCall[0].proyecto_id).toBe(newProjectId)
      expect(censusInsertCall[0].temporada_id).toBe(newTempId)
    })
  })
})
