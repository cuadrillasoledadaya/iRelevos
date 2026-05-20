// ══════════════════════════════════════════════════════════════════
// TESTS — CensoTab.tsx
// Presentational component — tests rendering + callback dispatch
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import CensoTab from '../CensoTab'
import type { CensusEntry, ImportEntry, NewCensusEntry, CensusEditForm } from '../types'
import type { PasoDB } from '@/lib/types'

// ── Mock data ────────────────────────────────────────────────────

const mockPasos: PasoDB[] = [
  { id: 'p-1', nombre_paso: 'Cristo', nombre_cuadrilla: 'Cuadrilla A', num_trabajaderas: 2, content: { banco: [], trabajaderas: [] } as any, created_at: '2025-01-01', temporada_id: 't-1' },
  { id: 'p-2', nombre_paso: 'Virgen', nombre_cuadrilla: 'Cuadrilla B', num_trabajaderas: 1, content: { banco: [], trabajaderas: [] } as any, created_at: '2025-01-02', temporada_id: 't-1' },
]

const mockCensus: CensusEntry[] = [
  { id: 'c-1', email: 'juan@test.com', nombre: 'Juan', apellidos: 'Pérez', apodo: 'El Juan', telefono: '600123456', trabajadera: 1, altura: 1.80, proyecto_id: 'p-1', temporada_id: 't-1', created_at: '2025-01-01' },
  { id: 'c-2', email: 'maria@test.com', nombre: 'María', apellidos: 'López', apodo: 'Mari', telefono: '600999888', trabajadera: 2, altura: 1.65, proyecto_id: 'p-2', temporada_id: 't-1', created_at: '2025-01-02' },
  { id: 'c-3', email: null, nombre: 'Carlos', apellidos: 'García', apodo: '', telefono: '', trabajadera: undefined, altura: undefined, proyecto_id: 'p-1', temporada_id: 't-1', created_at: '2025-01-03' },
]

const mockNewEntry: NewCensusEntry = {
  email: '', nombre: '', apellidos: '', apodo: '', telefono: '', trabajadera: '', altura: '', proyecto_id: '',
}

const mockEditForm: CensusEditForm = {
  nombre: 'Juan', apellidos: 'Pérez', telefono: '600123456', trabajadera: 1, altura: 1.80,
}

const mockImportPreview: ImportEntry[] = [
  { nombre: 'Pedro', apellidos: 'Sánchez', apodo: 'P', email: 'pedro@test.com', trabajadera: 1, external_id: 'ext-1', selected: true, _status: 'new' },
  { nombre: 'Ana', apellidos: 'Martínez', apodo: 'A', email: 'ana@test.com', trabajadera: 2, external_id: 'ext-2', selected: false, _status: 'exists' },
]

// ── Default props builder ────────────────────────────────────────

function defaultProps(overrides: Partial<React.ComponentProps<typeof CensoTab>> = {}): React.ComponentProps<typeof CensoTab> {
  return {
    census: mockCensus,
    pasos: mockPasos,
    loading: false,
    saving: false,
    importLoading: false,
    filterPid: 'all',
    onFilterPidChange: vi.fn(),
    newEntry: mockNewEntry,
    onNewEntryChange: vi.fn(),
    onAddToCensus: vi.fn(),
    editingId: null,
    editForm: mockEditForm,
    onEditFormChange: vi.fn(),
    onStartEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onDeleteFromCensus: vi.fn(),
    onReconstruirCenso: vi.fn(),
    onSincronizacionTotal: vi.fn(),
    onFetchFromICuadrilla: vi.fn(),
    importPreview: null,
    importPid: '',
    onImportPidChange: vi.fn(),
    onToggleSelected: vi.fn(),
    onToggleAllSelected: vi.fn(),
    onCloseImport: vi.fn(),
    onEjecutarImportacion: vi.fn(),
    ...overrides,
  }
}

// ── Test suite ───────────────────────────────────────────────────

describe('CensoTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ═════════════════════════════════════════════════════════════
  // RENDERING
  // ═════════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('debería renderizar la sección de sincronización', () => {
      render(<CensoTab {...defaultProps()} />)
      expect(screen.getByText(/Sincronización/)).toBeInTheDocument()
      expect(screen.getByText(/Reconstruir Censo/)).toBeInTheDocument()
      expect(screen.getByText(/Limpiar Bajas/)).toBeInTheDocument()
      expect(screen.getByText(/Previsualizar/)).toBeInTheDocument()
    })

    it('debería renderizar el formulario de nuevo censo', () => {
      render(<CensoTab {...defaultProps()} />)
      expect(screen.getByText(/Nuevo Registro en Censo/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Nombre*')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Apellidos')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Teléfono')).toBeInTheDocument()
    })

    it('debería mostrar la cantidad de entradas en el censo', () => {
      render(<CensoTab {...defaultProps()} />)
      expect(screen.getByText(/Gente en Censo/)).toBeInTheDocument()
    })

    it('debería mostrar loading state cuando loading=true', () => {
      render(<CensoTab {...defaultProps({ loading: true })} />)
      expect(screen.getByText('Cargando censo...')).toBeInTheDocument()
    })

    it('debería renderizar entradas de censo cuando loading=false', () => {
      render(<CensoTab {...defaultProps()} />)
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      expect(screen.getByText('María López')).toBeInTheDocument()
      expect(screen.getByText('Carlos García')).toBeInTheDocument()
    })

    it('debería agrupar censo por trabajadera', () => {
      render(<CensoTab {...defaultProps()} />)
      expect(screen.getByText('TRABAJADERA 1 (1)')).toBeInTheDocument()
      expect(screen.getByText('TRABAJADERA 2 (1)')).toBeInTheDocument()
      expect(screen.getByText('SIN ASIGNAR (1)')).toBeInTheDocument()
    })

    it('debería mostrar el nombre del paso asociado a cada entrada', () => {
      render(<CensoTab {...defaultProps()} />)
      // "Cristo" appears in both the paso select and the entry badges
      expect(screen.getAllByText('Cristo').length).toBeGreaterThan(1)
    })

    it('debería mostrar botones de editar y eliminar por cada entrada', () => {
      render(<CensoTab {...defaultProps()} />)
      const editButtons = screen.getAllByText('✏️')
      const deleteButtons = screen.getAllByText('🗑️')
      expect(editButtons.length).toBe(mockCensus.length)
      expect(deleteButtons.length).toBe(mockCensus.length)
    })
  })

  // ═════════════════════════════════════════════════════════════
  // CALLBACKS — Form
  // ═════════════════════════════════════════════════════════════

  describe('callbacks — form', () => {
    it('debería llamar onNewEntryChange al escribir en el campo nombre', () => {
      const onNewEntryChange = vi.fn()
      render(<CensoTab {...defaultProps({ onNewEntryChange })} />)
      const input = screen.getByPlaceholderText('Nombre*')
      fireEvent.change(input, { target: { value: 'Nuevo Nombre' } })
      expect(onNewEntryChange).toHaveBeenCalledTimes(1)
    })

    it('debería llamar onAddToCensus al enviar el formulario', () => {
      const onAddToCensus = vi.fn()
      const onNewEntryChange = vi.fn()
      render(<CensoTab {...defaultProps({ onAddToCensus, onNewEntryChange })} />)
      const nombreInput = screen.getByPlaceholderText('Nombre*')
      fireEvent.change(nombreInput, { target: { value: 'Test' } })
      fireEvent.submit(screen.getByRole('button', { name: /\+ AÑADIR AL CENSO/ }))
      expect(onAddToCensus).toHaveBeenCalledTimes(1)
    })

    it('debería deshabilitar el botón de añadir si saving=true', () => {
      render(<CensoTab {...defaultProps({ saving: true })} />)
      const button = screen.getByRole('button', { name: /Guardando/ })
      expect(button).toBeDisabled()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // CALLBACKS — Censo list
  // ═════════════════════════════════════════════════════════════

  describe('callbacks — censo list', () => {
    it('debería llamar onStartEdit al hacer clic en el botón de editar', () => {
      const onStartEdit = vi.fn()
      render(<CensoTab {...defaultProps({ onStartEdit })} />)
      const editButtons = screen.getAllByText('✏️')
      fireEvent.click(editButtons[0])
      expect(onStartEdit).toHaveBeenCalled()
    })

    it('debería llamar onDeleteFromCensus al hacer clic en el botón de eliminar', () => {
      const onDeleteFromCensus = vi.fn()
      render(<CensoTab {...defaultProps({ onDeleteFromCensus })} />)
      const deleteButtons = screen.getAllByText('🗑️')
      fireEvent.click(deleteButtons[0])
      expect(onDeleteFromCensus).toHaveBeenCalledWith('c-1')
    })

    it('debería llamar onSaveEdit al hacer clic en GUARDAR en modo edición', () => {
      const onSaveEdit = vi.fn()
      render(<CensoTab {...defaultProps({ onSaveEdit, editingId: 'c-1' })} />)
      const saveButton = screen.getByRole('button', { name: 'GUARDAR' })
      fireEvent.click(saveButton)
      expect(onSaveEdit).toHaveBeenCalledWith('c-1')
    })

    it('debería llamar onCancelEdit al hacer clic en CANCELAR en modo edición', () => {
      const onCancelEdit = vi.fn()
      render(<CensoTab {...defaultProps({ onCancelEdit, editingId: 'c-1' })} />)
      const cancelButton = screen.getByRole('button', { name: 'CANCELAR' })
      fireEvent.click(cancelButton)
      expect(onCancelEdit).toHaveBeenCalled()
    })

    it('debería llamar onEditFormChange al escribir en campos de edición', () => {
      const onEditFormChange = vi.fn()
      render(<CensoTab {...defaultProps({ onEditFormChange, editingId: 'c-1' })} />)
      // In edit mode, find inputs inside the editing entry card
      // The edit form inputs don't have placeholders but have value from editForm
      // Find by value - the first input should have value 'Juan' (from mockEditForm.nombre)
      const inputs = screen.getAllByRole('textbox')
      // The edit form's nombre input comes after the new-entry form inputs
      // There are 5 inputs from the new-entry form + 5 from the edit form
      // Fire on the 6th input (first of edit form)
      fireEvent.change(inputs[5], { target: { value: 'Nombre Editado' } })
      expect(onEditFormChange).toHaveBeenCalled()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // CALLBACKS — Filter & Sync
  // ═════════════════════════════════════════════════════════════

  describe('callbacks — filter & sync', () => {
    it('debería llamar onFilterPidChange al seleccionar un paso en el filtro', () => {
      const onFilterPidChange = vi.fn()
      render(<CensoTab {...defaultProps({ onFilterPidChange })} />)
      // Find the select that contains "TODOS LOS PASOS"
      const selects = screen.getAllByRole('combobox')
      const filterSelect = selects.find(el =>
        within(el).queryByText('TODOS LOS PASOS')
      )
      expect(filterSelect).toBeDefined()
      if (filterSelect) {
        fireEvent.change(filterSelect, { target: { value: 'p-1' } })
        expect(onFilterPidChange).toHaveBeenCalledWith('p-1')
      }
    })

    it('debería llamar onReconstruirCenso al hacer clic en Reconstruir', () => {
      const onReconstruirCenso = vi.fn()
      render(<CensoTab {...defaultProps({ onReconstruirCenso })} />)
      fireEvent.click(screen.getByText(/Reconstruir Censo/))
      expect(onReconstruirCenso).toHaveBeenCalled()
    })

    it('debería llamar onSincronizacionTotal al hacer clic en Limpiar Bajas', () => {
      const onSincronizacionTotal = vi.fn()
      render(<CensoTab {...defaultProps({ onSincronizacionTotal })} />)
      fireEvent.click(screen.getByText(/Limpiar Bajas/))
      expect(onSincronizacionTotal).toHaveBeenCalled()
    })

    it('debería llamar onFetchFromICuadrilla al hacer clic en Previsualizar', () => {
      const onFetchFromICuadrilla = vi.fn()
      render(<CensoTab {...defaultProps({ onFetchFromICuadrilla })} />)
      fireEvent.click(screen.getByText(/Previsualizar/))
      expect(onFetchFromICuadrilla).toHaveBeenCalled()
    })

    it('debería deshabilitar Reconstruir cuando saving=true', () => {
      render(<CensoTab {...defaultProps({ saving: true })} />)
      expect(screen.getByText(/Reconstruir Censo/)).toBeDisabled()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // IMPORT MODAL
  // ═════════════════════════════════════════════════════════════

  describe('import modal', () => {
    it('debería mostrar el modal cuando importPreview no es null', () => {
      render(<CensoTab {...defaultProps({ importPreview: mockImportPreview })} />)
      expect(screen.getByText('IMPORTAR DESDE ICUADRILLA')).toBeInTheDocument()
      expect(screen.getByText(/1 nuevos/)).toBeInTheDocument()
      expect(screen.getByText(/1 a actualizar/)).toBeInTheDocument()
    })

    it('debería mostrar entradas de preview con checkboxes', () => {
      render(<CensoTab {...defaultProps({ importPreview: mockImportPreview })} />)
      expect(screen.getByText('Pedro Sánchez')).toBeInTheDocument()
      expect(screen.getByText('Ana Martínez')).toBeInTheDocument()
    })

    it('debería mostrar badges NUEVO y EXISTE', () => {
      render(<CensoTab {...defaultProps({ importPreview: mockImportPreview })} />)
      expect(screen.getByText('NUEVO')).toBeInTheDocument()
      expect(screen.getByText('EXISTE')).toBeInTheDocument()
    })

    it('debería llamar onToggleSelected al hacer clic en checkbox', () => {
      const onToggleSelected = vi.fn()
      render(<CensoTab {...defaultProps({ importPreview: mockImportPreview, onToggleSelected })} />)
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])
      expect(onToggleSelected).toHaveBeenCalledWith(0)
    })

    it('debería llamar onToggleAllSelected al hacer clic en seleccionar todos', () => {
      const onToggleAllSelected = vi.fn()
      render(<CensoTab {...defaultProps({ importPreview: mockImportPreview, onToggleAllSelected })} />)
      fireEvent.click(screen.getByText(/Seleccionar todos/))
      expect(onToggleAllSelected).toHaveBeenCalled()
    })

    it('debería llamar onCloseImport al hacer clic en cerrar', () => {
      const onCloseImport = vi.fn()
      render(<CensoTab {...defaultProps({ importPreview: mockImportPreview, onCloseImport })} />)
      fireEvent.click(screen.getByText('✕'))
      expect(onCloseImport).toHaveBeenCalled()
    })

    it('debería llamar onEjecutarImportacion al hacer clic en confirmar', () => {
      const onEjecutarImportacion = vi.fn()
      render(<CensoTab {...defaultProps({ importPreview: mockImportPreview, importPid: 'p-1', onEjecutarImportacion })} />)
      fireEvent.click(screen.getByText(/CONFIRMAR IMPORTACIÓN/))
      expect(onEjecutarImportacion).toHaveBeenCalled()
    })

    it('debería deshabilitar confirmar si saving=true', () => {
      render(<CensoTab {...defaultProps({ importPreview: mockImportPreview, importPid: 'p-1', saving: true })} />)
      const button = screen.getByText(/PROCESANDO/)
      expect(button.closest('button')).toBeDisabled()
    })

    it('no debería mostrar el modal cuando importPreview es null', () => {
      render(<CensoTab {...defaultProps({ importPreview: null })} />)
      expect(screen.queryByText('IMPORTAR DESDE ICUADRILLA')).not.toBeInTheDocument()
    })

    it('debería mostrar warning si importPid está vacío', () => {
      render(<CensoTab {...defaultProps({ importPreview: mockImportPreview })} />)
      expect(screen.getByText(/Seleccioná un paso/)).toBeInTheDocument()
    })
  })
})
