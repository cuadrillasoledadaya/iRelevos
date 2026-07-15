'use client'

import type { PasoDB } from '@/lib/types'
import type {
  CensusEntry, ImportEntry,
  NewCensusEntry, CensusEditForm,
} from './types'

interface CensoTabProps {
  census: CensusEntry[]
  pasos: PasoDB[]
  loading: boolean
  saving: boolean
  importLoading: boolean
  filterPid: string
  onFilterPidChange: (v: string) => void

  // Form nuevo censo
  newEntry: NewCensusEntry
  onNewEntryChange: (v: NewCensusEntry) => void
  onAddToCensus: (e: React.FormEvent) => void

  // Lista censo
  editingId: string | null
  editForm: CensusEditForm
  onEditFormChange: (v: CensusEditForm) => void
  onStartEdit: (entry: CensusEntry) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onDeleteFromCensus: (id: string) => void
  onToggleBoquilla: (id: string, v: boolean) => void

  // Sync
  onReconstruirCenso: () => void
  onSincronizacionTotal: () => void
  onFetchFromICuadrilla: () => void

  // Import modal
  importPreview: ImportEntry[] | null
  importPid: string
  onImportPidChange: (v: string) => void
  onToggleSelected: (idx: number) => void
  onToggleAllSelected: () => void
  onCloseImport: () => void
  onEjecutarImportacion: () => void
}

export default function CensoTab({
  census, pasos, loading, saving, importLoading,
  filterPid, onFilterPidChange,
  newEntry, onNewEntryChange, onAddToCensus,
  editingId, editForm, onEditFormChange, onStartEdit, onSaveEdit, onCancelEdit, onDeleteFromCensus, onToggleBoquilla,
  onReconstruirCenso, onSincronizacionTotal, onFetchFromICuadrilla,
  importPreview, importPid, onImportPidChange, onToggleSelected, onToggleAllSelected,
  onCloseImport, onEjecutarImportacion,
}: CensoTabProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* ── Sincronización ── */}
      <div className="bg-[var(--card)] border border-[var(--oro)]/20 p-4 rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="cinzel text-[var(--oro)] text-sm font-bold">📥 Sincronización</h3>
            <p className="text-[0.6rem] text-[var(--cre-o)] mt-0.5">
              Importa desde iCuadrilla o reconstruye desde planificación.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onReconstruirCenso}
              disabled={saving}
              className="btn btn-out btn-sm text-[0.6rem] border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              ⚡ Reconstruir Censo
            </button>
            <button
              onClick={onSincronizacionTotal}
              disabled={saving || importLoading}
              className="btn btn-out btn-sm text-[0.6rem] border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              🧹 Limpiar Bajas
            </button>
            <button
              onClick={onFetchFromICuadrilla}
              disabled={importLoading}
              className="btn btn-oro btn-sm shrink-0"
            >
              {importLoading ? '⏳ Cargando...' : '🔄 Previsualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Form nuevo censo ── */}
      <form onSubmit={onAddToCensus} className="bg-[var(--card)] border border-[var(--oro)]/30 p-4 rounded-lg flex flex-col gap-3">
        <h3 className="cinzel text-[var(--oro)] text-sm font-bold">Nuevo Registro en Censo</h3>

        <select
          className="inp text-[var(--cre)]" required
          value={newEntry.proyecto_id}
          onChange={e => onNewEntryChange({ ...newEntry, proyecto_id: e.target.value })}
        >
          <option value="">Seleccionar Cuadrilla / Paso*</option>
          {pasos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre_paso} ({p.nombre_cuadrilla})</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <input className="inp" placeholder="Email" type="email"
            value={newEntry.email} onChange={e => onNewEntryChange({ ...newEntry, email: e.target.value })} />
          <input className="inp" placeholder="Nombre*" required
            value={newEntry.nombre} onChange={e => onNewEntryChange({ ...newEntry, nombre: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="inp" placeholder="Apellidos"
            value={newEntry.apellidos} onChange={e => onNewEntryChange({ ...newEntry, apellidos: e.target.value })} />
          <input className="inp" placeholder="Apodo"
            value={newEntry.apodo} onChange={e => onNewEntryChange({ ...newEntry, apodo: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input className="inp" placeholder="Teléfono"
            value={newEntry.telefono} onChange={e => onNewEntryChange({ ...newEntry, telefono: e.target.value })} />
          <input className="inp" placeholder="Trabajadera (Nº)" type="number"
            value={newEntry.trabajadera} onChange={e => onNewEntryChange({ ...newEntry, trabajadera: e.target.value })} />
          <input className="inp" placeholder="Altura (cm)" type="number" step="0.1"
            value={newEntry.altura} onChange={e => onNewEntryChange({ ...newEntry, altura: e.target.value })} />
        </div>
        <button disabled={saving || !newEntry.proyecto_id} className="btn btn-oro w-full mt-2">
          {saving ? 'Guardando...' : '+ AÑADIR AL CENSO'}
        </button>
      </form>

      {/* ── Lista de censo ── */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="cinzel text-[var(--oro)] text-sm font-bold uppercase tracking-widest">
            Gente en Censo <span>{census.length}</span>
          </h3>
          <select
            className="bg-black/40 border border-[var(--border)] text-[0.6rem] text-[var(--cre-o)] p-1 rounded uppercase font-bold"
            value={filterPid}
            onChange={e => onFilterPidChange(e.target.value)}
          >
            <option value="all">TODOS LOS PASOS</option>
            {pasos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre_paso}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="p-8 text-center cinzel text-[var(--oro)] animate-pulse">Cargando censo...</div>
        ) : (
          <CensoList
            census={census}
            pasos={pasos}
            editingId={editingId}
            editForm={editForm}
            onEditFormChange={onEditFormChange}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onDeleteFromCensus={onDeleteFromCensus}
            onToggleBoquilla={onToggleBoquilla}
          />
        )}
      </div>

      {/* ── Modal de importación ── */}
      {importPreview && (
        <ImportModal
          preview={importPreview}
          pasos={pasos}
          importPid={importPid}
          onImportPidChange={onImportPidChange}
          onToggleSelected={onToggleSelected}
          onToggleAllSelected={onToggleAllSelected}
          onClose={onCloseImport}
          onConfirm={onEjecutarImportacion}
          saving={saving}
        />
      )}
    </div>
  )
}

// ── Sub-componentes internos ──────────────────────────────────────

function CensoList({
  census, pasos, editingId, editForm,
  onEditFormChange, onStartEdit, onSaveEdit, onCancelEdit, onDeleteFromCensus,
  onToggleBoquilla,
}: {
  census: CensusEntry[]
  pasos: PasoDB[]
  editingId: string | null
  editForm: CensusEditForm
  onEditFormChange: (v: CensusEditForm) => void
  onStartEdit: (entry: CensusEntry) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onDeleteFromCensus: (id: string) => void
  onToggleBoquilla: (id: string, v: boolean) => void
}) {
  const groups: Record<string, CensusEntry[]> = {}
  census.forEach(c => {
    const t = c.trabajadera ? `TRABAJADERA ${c.trabajadera}` : 'SIN ASIGNAR'
    if (!groups[t]) groups[t] = []
    groups[t].push(c)
  })

  const sortedGroups = Object.keys(groups).sort((a, b) => {
    if (a === 'SIN ASIGNAR') return 1
    if (b === 'SIN ASIGNAR') return -1
    return a.localeCompare(b, undefined, { numeric: true })
  })

  return sortedGroups.map(groupName => (
    <div key={groupName} className="flex flex-col gap-3 mb-4">
      <div className="text-[var(--oro)] text-[0.65rem] font-black uppercase tracking-[0.3em] border-l-4 border-[var(--oro)] pl-3 py-1 bg-[var(--oro)]/5">
        {groupName} ({groups[groupName].length})
      </div>
      {groups[groupName].map((c: CensusEntry) => (
        <div key={c.id} className={`bg-[var(--card)] border ${editingId === c.id ? 'border-[var(--oro)]' : 'border-[var(--border)]'} p-3 rounded flex flex-col gap-2 transition-all`}>
          {editingId === c.id ? (
            <EditForm
              form={editForm}
              onChange={onEditFormChange}
              onSave={() => onSaveEdit(c.id)}
              onCancel={onCancelEdit}
            />
          ) : (
            <ViewEntry
              entry={c}
              pasos={pasos}
              onEdit={() => onStartEdit(c)}
              onDelete={() => onDeleteFromCensus(c.id)}
              onToggleBoquilla={onToggleBoquilla}
            />
          )}
        </div>
      ))}
    </div>
  ))
}

function EditForm({ form, onChange, onSave, onCancel }: {
  form: CensusEditForm
  onChange: (v: CensusEditForm) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input className="inp text-xs" value={form.nombre ?? ''}
          onChange={e => onChange({ ...form, nombre: e.target.value })} />
        <input className="inp text-xs" value={form.apellidos ?? ''}
          onChange={e => onChange({ ...form, apellidos: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="inp text-xs" value={form.email ?? ''}
          onChange={e => onChange({ ...form, email: e.target.value })} />
        <input className="inp text-xs" placeholder="Apodo" value={form.apodo ?? ''}
          onChange={e => onChange({ ...form, apodo: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input className="inp text-xs" placeholder="Tel" value={form.telefono ?? ''}
          onChange={e => onChange({ ...form, telefono: e.target.value })} />
        <input className="inp text-xs" type="number" placeholder="Trab" value={form.trabajadera ?? ''}
          onChange={e => onChange({ ...form, trabajadera: e.target.value ? parseInt(e.target.value) : undefined })} />
        <input className="inp text-xs" type="number" step="0.1" placeholder="Alt (cm)" value={form.altura ?? ''}
          onChange={e => onChange({ ...form, altura: e.target.value ? parseFloat(e.target.value) : undefined })} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="btn btn-oro flex-1 h-8 text-[0.6rem]">GUARDAR</button>
        <button onClick={onCancel} className="btn-v h-8 flex-1 text-[0.6rem]">CANCELAR</button>
      </div>
    </div>
  )
}

function ViewEntry({ entry, pasos, onEdit, onDelete, onToggleBoquilla }: {
  entry: CensusEntry
  pasos: PasoDB[]
  onEdit: () => void
  onDelete: () => void
  onToggleBoquilla: (id: string, v: boolean) => void
}) {
  return (
    <>
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="font-bold text-[var(--cre)] text-sm">{entry.nombre} {entry.apellidos}</span>
          <span className="text-[var(--oro)] text-[10px] font-mono">{entry.email}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-1 opacity-50 hover:opacity-100">✏️</button>
          <button onClick={onDelete} className="p-1 opacity-50 hover:opacity-100">🗑️</button>
        </div>
      </div>
      <div className="flex justify-between items-center text-[10px] text-[var(--cre-o)] opacity-70">
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={entry.boquilla ?? false}
              onChange={(e) => onToggleBoquilla(entry.id, e.target.checked)}
              className="w-3.5 h-3.5 accent-[var(--oro)] cursor-pointer"
            />
            <span className="font-bold uppercase tracking-wide">Boquilla</span>
          </label>
          {entry.telefono && <span>📞 {entry.telefono}</span>}
          {entry.trabajadera && <span>🪜 Trab: {entry.trabajadera}</span>}
          {entry.altura && <span className="text-[var(--oro)] font-bold">📏 {entry.altura} cm</span>}
          <span className="text-[var(--oro)] font-black uppercase text-[8px] bg-[var(--oro)]/10 px-1 rounded">
            {pasos.find(p => p.id === entry.proyecto_id)?.nombre_paso || 'Desconocido'}
          </span>
        </div>
        <span>{new Date(entry.created_at).toLocaleDateString()}</span>
      </div>
    </>
  )
}

// ── Import Modal ──────────────────────────────────────────────────

function ImportModal({
  preview, pasos, importPid, onImportPidChange,
  onToggleSelected, onToggleAllSelected, onClose, onConfirm, saving,
}: {
  preview: ImportEntry[]
  pasos: PasoDB[]
  importPid: string
  onImportPidChange: (v: string) => void
  onToggleSelected: (idx: number) => void
  onToggleAllSelected: () => void
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--neg-m)] w-full max-w-2xl rounded-2xl border-2 border-[var(--oro)]/40 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">

        <div className="bg-[var(--oro)]/10 p-6 border-b border-[var(--oro)]/20 flex justify-between items-center">
          <div>
            <h3 className="text-[var(--cre)] cinzel text-xl font-bold flex items-center gap-3">
              <span className="text-2xl">📥</span> IMPORTAR DESDE ICUADRILLA
            </h3>
            <p className="text-[var(--cre-o)] text-[10px] uppercase tracking-widest font-black mt-1">
              {preview.filter(c => c._status === 'new').length} nuevos • {preview.filter(c => c._status === 'exists').length} a actualizar
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--oro)]/20 text-[var(--cre-o)] hover:text-[var(--cre)] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[var(--cre-o)] text-[10px] uppercase font-black tracking-widest">
              Asignar a Cuadrilla / Paso Destino:
            </label>
            <select
              className="inp w-full h-14 text-lg font-bold !bg-[var(--oro)]/5"
              value={importPid}
              onChange={e => onImportPidChange(e.target.value)}
            >
              <option value="">-- SELECCIONAR PASO --</option>
              {pasos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre_paso} ({p.nombre_cuadrilla})</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[var(--cre-o)] text-[10px] uppercase font-black tracking-widest">
                Previsualización de datos:
              </label>
              <button
                onClick={onToggleAllSelected}
                className="text-[10px] text-[var(--cre-o)] uppercase font-bold border border-[var(--oro)]/30 px-2 py-1 rounded hover:bg-[var(--oro)]/10 transition-colors"
              >
                {preview.every(c => c.selected) ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {preview.length === 0 && (
                <div className="text-center p-12 text-[var(--cre-o)] italic cinzel">
                  No se encontraron costaleros.
                </div>
              )}
              {preview.map((c, i) => (
                <div
                  key={i}
                  className={`bg-[var(--neg-s)] border ${c.selected ? 'border-[var(--oro)] shadow-[0_0_12px_var(--shadow-oro)] bg-[var(--oro)]/10' : 'border-[var(--oro)]/20'} p-4 rounded-xl flex items-center justify-between hover:border-[var(--oro)]/50 transition-all group`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={c.selected}
                      onChange={() => onToggleSelected(i)}
                      className="w-5 h-5 accent-[var(--oro)] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className={`font-bold text-base leading-tight transition-colors ${c.selected ? 'text-[var(--cre)]' : 'text-[var(--cre-o)]'}`}>
                        {c.nombre} {c.apellidos}
                      </span>
                      <span className="text-[var(--cre-o)]/70 text-[10px] font-mono">
                        {c.email || 'Sin email'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                      {c.trabajadera && (
                        <div className="flex flex-col items-center justify-center bg-[var(--oro)]/10 px-3 py-1 rounded-lg border border-[var(--oro)]/30">
                          <span className="text-[8px] text-[var(--oro-o)] uppercase font-black">Trab</span>
                          <span className="text-sm font-black text-[var(--oro)]">T{c.trabajadera}</span>
                        </div>
                      )}
                      <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider ${
                        c._status === 'new'
                          ? 'bg-[var(--ok-bg)] text-[var(--ok-tx)] border border-[var(--ok-bd)]'
                          : 'bg-[var(--warn-oro-bg)] text-[var(--warn-oro)] border border-[var(--warn-oro-bd)]'
                      }`}>
                        {c._status === 'new' ? 'NUEVO' : 'EXISTE'}
                      </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-[var(--oro)]/5 border-t border-[var(--oro)]/10">
          <button
            disabled={saving || !importPid}
            onClick={onConfirm}
            className="btn btn-oro w-full h-16 text-lg tracking-[0.2em] shadow-xl disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                PROCESANDO...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">🚀 CONFIRMAR IMPORTACIÓN</span>
            )}
          </button>
          {!importPid && (
            <p className="text-center text-[var(--cre-o)] text-[10px] mt-3 font-bold uppercase">
              ️               ️ Seleccioná un paso para habilitar la importación
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
