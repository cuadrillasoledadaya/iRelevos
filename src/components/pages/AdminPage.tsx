'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, UserRole } from '@/hooks/useAuth'
import { PasoDB, Trabajadera } from '../../lib/types'
import { useCallback } from 'react'
import { useEstado } from '@/hooks/useEstado'

interface CensusEntry {
  id: string
  email: string | null
  nombre: string
  apellidos: string
  apodo?: string
  telefono: string
  trabajadera?: number
  altura?: number
  proyecto_id: string
  created_at: string
}

// Datos que llegan normalizados desde el proxy de iCuadrilla
interface ImportEntry {
  nombre: string
  apellidos: string
  apodo: string
  email: string | null
  trabajadera: number | null
  external_id: string
  selected: boolean
  _status?: 'new' | 'exists'
}

export default function AdminPage() {
  const { pid, activeTemporadaId, setActiveTemporadaId, temporadas } = useEstado()
  
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [census, setCensus] = useState<CensusEntry[]>([])
  const [pasos, setPasos] = useState<PasoDB[]>([])
  const [loading, setLoading] = useState(true)

  // Formulario Censo
  const [newEntry, setNewEntry] = useState({ email: '', nombre: '', apellidos: '', apodo: '', telefono: '', trabajadera: '', altura: '', proyecto_id: '' })
  const [filterPid, setFilterPid] = useState<string>('all')
  
  // Formulario Nuevo Paso
  const [newPaso, setNewPaso] = useState({ nombre_paso: '', nombre_cuadrilla: '', num_trabajaderas: 6 })
  
  // Formulario Nueva Temporada
  const [newTemp, setNewTemp] = useState({ nombre: '', clonarCenso: true, clonarPasos: true, sourceTempId: '' })
  
  const [activeTab, setActiveTab] = useState<'usuarios' | 'censo' | 'pasos' | 'temporadas'>('usuarios')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<CensusEntry>>({
    email: '', nombre: '', apellidos: '', apodo: '', telefono: '', trabajadera: 0, altura: 0, proyecto_id: ''
  })
  const [saving, setSaving] = useState(false)

  // Estado de importación desde iCuadrilla
  const [importPid, setImportPid] = useState<string>('')
  const [importPreview, setImportPreview] = useState<ImportEntry[] | null>(null)
  const [importLoading, setImportLoading] = useState(false)

  const fetchPasos = useCallback(async () => {
    if (!activeTemporadaId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('proyectos')
      .select('*')
      .eq('temporada_id', activeTemporadaId)
      .order('created_at', { ascending: false })

    if (!error && data) setPasos(data as PasoDB[])
    setLoading(false)
  }, [activeTemporadaId])

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nombre', { ascending: true })

    if (!error && data) setUsuarios(data as Profile[])
    setLoading(false)
  }, [])

  const fetchCensus = useCallback(async () => {
    if (!activeTemporadaId) return
    setLoading(true)
    let query = supabase.from('census').select('*').eq('temporada_id', activeTemporadaId)
    
    if (filterPid !== 'all') {
      query = query.eq('proyecto_id', filterPid)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (!error && data) setCensus(data as CensusEntry[])
    setLoading(false)
  }, [filterPid, activeTemporadaId])

  // Cargar pasos siempre (los necesita el formulario de censo)
  useEffect(() => {
    fetchPasos()
  }, [fetchPasos])

  // Cargar datos de la pestaña activa
  useEffect(() => {
    if (activeTab === 'usuarios') fetchUsuarios()
    if (activeTab === 'censo') fetchCensus()
    if (activeTab === 'pasos') fetchPasos()
    if (activeTab === 'temporadas') setNewTemp(p => ({ ...p, sourceTempId: activeTemporadaId || '' }))
  }, [activeTab, fetchUsuarios, fetchCensus, fetchPasos, activeTemporadaId])

  // Sincronizar pid con el formulario
  useEffect(() => {
    if (pid && !newEntry.proyecto_id) {
      setNewEntry(prev => ({ ...prev, proyecto_id: pid }))
    }
  }, [pid, newEntry.proyecto_id])

  async function addPaso(e: React.FormEvent) {
    e.preventDefault()
    if (!newPaso.nombre_paso || !activeTemporadaId) return
    setSaving(true)

    const { error } = await supabase
      .from('proyectos')
      .insert([{ 
        ...newPaso, 
        content: { banco: [], trabajaderas: Array.from({ length: newPaso.num_trabajaderas }, (_, i) => ({ id: i + 1, nombres: [], roles: [], salidas: 1, tramos: ['Inicio', 'Final'], bajas: [], regla5costaleros: false, plan: null, obj: {}, analisis: null, pinned: null, puntuaciones: {}, tramosClaves: [] })) },
        temporada_id: activeTemporadaId
      }])

    if (!error) {
      setNewPaso({ nombre_paso: '', nombre_cuadrilla: '', num_trabajaderas: 6 })
      fetchPasos()
    } else {
      alert(error.message)
    }
    setSaving(false)
  }

  async function eliminarPaso(id: string) {
    if (!confirm('¿Seguro que quieres borrar este Paso? Se perderán todos sus relevos.')) return
    const { error } = await supabase.from('proyectos').delete().eq('id', id)
    if (!error) fetchPasos()
  }


  async function eliminarUsuario(uid: string) {
    if (!confirm('¿Seguro que quieres eliminar este perfil activo? Perderá el acceso.')) return
    const { error } = await supabase.from('profiles').delete().eq('id', uid)
    if (!error) setUsuarios(prev => prev.filter(u => u.id !== uid))
  }

  async function cambiarRol(uid: string, nuevoRol: UserRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: nuevoRol })
      .eq('id', uid)

    if (!error) {
      setUsuarios(prev => prev.map(u => u.id === uid ? { ...u, role: nuevoRol } : u))
    }
  }

  async function editarPerfil(uid: string) {
    const u = usuarios.find(x => x.id === uid)
    if (!u) return
    
    const nuevoNombre = prompt('Nuevo Nombre:', u.nombre || '')
    if (nuevoNombre === null) return
    const nuevosApellidos = prompt('Apellidos:', u.apellidos || '')
    if (nuevosApellidos === null) return
    const nuevoApodo = prompt('Apodo:', u.apodo || '')
    if (nuevoApodo === null) return

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ 
        nombre: nuevoNombre.trim(), 
        apellidos: nuevosApellidos.trim(), 
        apodo: nuevoApodo.trim() 
      })
      .eq('id', uid)

    if (!error) {
      setUsuarios(prev => prev.map(x => x.id === uid ? { 
        ...x, 
        nombre: nuevoNombre.trim(), 
        apellidos: nuevosApellidos.trim(), 
        apodo: nuevoApodo.trim() 
      } : x))
    } else {
      alert(error.message)
    }
    setSaving(false)
  }

  async function addToCensus(e: React.FormEvent) {
    e.preventDefault()
    if (!newEntry.nombre) return
    setSaving(true)

    const trabajaderaNum = newEntry.trabajadera ? parseInt(newEntry.trabajadera) : null
    const alturaNum = newEntry.altura ? parseFloat(newEntry.altura) : null

    const payload = {
      ...newEntry,
      trabajadera: trabajaderaNum || null,
      altura: alturaNum || null,
      temporada_id: activeTemporadaId
    }

    const { data, error } = await supabase
      .from('census')
      .insert([payload])
      .select()

    if (!error && data) {
      setCensus([data[0], ...census])
      setNewEntry({ email: '', nombre: '', apellidos: '', apodo: '', telefono: '', trabajadera: '', altura: '', proyecto_id: newEntry.proyecto_id })

      if (trabajaderaNum && newEntry.proyecto_id) {
        const displayName = newEntry.apodo?.trim() || `${newEntry.nombre} ${newEntry.apellidos}`.trim()
        await syncCostaleroToProject(newEntry.proyecto_id, trabajaderaNum, displayName)
      }
    } else {
      alert(error?.message || 'Error al añadir al censo')
    }
    setSaving(false)
  }

  async function syncCostaleroToProject(proyectoId: string, trabajaderaId: number, displayName: string) {
    const { data: proj, error: fetchErr } = await supabase
      .from('proyectos')
      .select('content')
      .eq('id', proyectoId)
      .single()

    if (fetchErr || !proj) {
      console.error('syncCostalero: no se pudo leer el proyecto', fetchErr)
      return
    }

    const content = proj.content as { trabajaderas: { id: number; nombres: string[] }[] }
    const trab = content.trabajaderas.find(t => t.id === trabajaderaId)
    if (!trab) {
      console.error(`syncCostalero: no existe trabajadera ${trabajaderaId} en el proyecto`)
      return
    }

    const slotIdx = trab.nombres.findIndex(n => /^Costalero \d+$/.test(n))
    if (slotIdx === -1) {
      trab.nombres.push(displayName)
      const t = trab as { roles?: { pri: string; sec: string }[] }
      if (t.roles) t.roles.push({ pri: 'COR', sec: 'FIJ' })
    } else {
      trab.nombres[slotIdx] = displayName
    }

    const { error: updateErr } = await supabase
      .from('proyectos')
      .update({ content })
      .eq('id', proyectoId)

    if (updateErr) {
      console.error('syncCostalero: error al actualizar el proyecto', updateErr)
      alert(`⚠️ No se pudo actualizar la cuadrilla: ${updateErr.message}.\nUsá el botón "🔄 Sincronizar Cuadrilla" manualmente.`)
    }
  }

  async function syncTodoCenso(proyectoId: string) {
    setSaving(true)

    const { data: censusData } = await supabase
      .from('census')
      .select('nombre, apellidos, apodo, trabajadera')
      .eq('proyecto_id', proyectoId)
      .not('trabajadera', 'is', null)
      .order('trabajadera', { ascending: true })

    if (!censusData || censusData.length === 0) {
      alert('No hay costaleros con trabajadera asignada en el censo.')
      setSaving(false)
      return
    }

    const { data: proj, error } = await supabase
      .from('proyectos')
      .select('content')
      .eq('id', proyectoId)
      .single()

    if (error || !proj) { setSaving(false); return }

    const content = proj.content as { trabajaderas: { id: number; nombres: string[] }[] }

    content.trabajaderas.forEach(t => {
      t.nombres = Array(6).fill("").map((_, i) => `Costalero ${i + 1}`)
    })

    const byTrab: Record<number, string[]> = {}
    censusData.forEach(c => {
      const tid = c.trabajadera as number
      const name = (c.apodo?.trim()) || `${c.nombre} ${c.apellidos}`.trim()
      if (!byTrab[tid]) byTrab[tid] = []
      byTrab[tid].push(name)
    })

    Object.entries(byTrab).forEach(([tidStr, names]) => {
      const tid = parseInt(tidStr)
      const trab = content.trabajaderas.find(t => t.id === tid)
      if (!trab) return
      
      names.forEach((name, i) => {
        if (i < trab.nombres.length) {
          trab.nombres[i] = name
        } else {
          trab.nombres.push(name)
        }
      })
    })

    await supabase.from('proyectos').update({ content }).eq('id', proyectoId)
    alert('✅ Cuadrilla sincronizada desde el censo.')
    setSaving(false)
  }

  async function deleteFromCensus(id: string) {
    if (!confirm('¿Seguro que quieres borrar a este costalero del censo?')) return
    const { error } = await supabase.from('census').delete().eq('id', id)
    if (!error) setCensus(prev => prev.filter(c => c.id !== id))
  }

  async function fetchFromICuadrilla() {
    setImportLoading(true)
    try {
      const res = await fetch('/api/import-costaleros')
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Error desconocido al obtener datos')
      }

      const importEntries: ImportEntry[] = data

      const { data: existing } = await supabase.from('census').select('email, external_id')
      const existingEmails = new Set((existing ?? []).map(e => e.email?.toLowerCase()))
      const existingIds = new Set((existing ?? []).map(e => e.external_id))

      const preview: ImportEntry[] = importEntries.map((c: ImportEntry) => ({
        ...c,
        selected: true,
        _status: (c.email && existingEmails.has(c.email.toLowerCase())) || 
                 (c.external_id && existingIds.has(c.external_id)) ? 'exists' : 'new',
      }))

      setImportPreview(preview)
      if (pid && !importPid) setImportPid(pid)
    } catch (err) {
      alert(`❌ Error al conectar con iCuadrilla:\n${err instanceof Error ? err.message : 'desconocido'}`)
    }
    setImportLoading(false)
  }

  async function ejecutarImportacion() {
    if (!importPid || !importPreview) return
    setSaving(true)

    try {
      const aImportar = importPreview.filter(c => c.selected)
      if (aImportar.length === 0) {
        alert('No has seleccionado a nadie para importar.')
        setSaving(false)
        return
      }

      let nuevos = 0
      let actualizados = 0

      for (const costalero of aImportar) {
        if (costalero._status === 'new') nuevos++
        else actualizados++

        await supabase.rpc('upsert_census_from_external', {
          p_external_id: costalero.external_id,
          p_nombre: costalero.nombre,
          p_apellidos: costalero.apellidos,
          p_apodo: costalero.apodo,
          p_email: costalero.email,
          p_trabajadera: costalero.trabajadera,
          p_proyecto_id: importPid,
          p_source: 'icuadrilla'
        })
      }

      await syncTodoCenso(importPid)
      setImportPreview(null)
      alert(`✅ Proceso finalizado:\n- ${nuevos} costaleros nuevos\n- ${actualizados} datos actualizados\n- Cuadrilla sincronizada.`)
    } catch (err) {
      console.error(err)
      alert('❌ Error durante el proceso de importación.')
    } finally {
      setSaving(false)
      fetchCensus()
    }
  }

  const eliminarTemporada = async (id: string) => {
    if (!confirm('⚠️ ¿Seguro que quieres borrar esta temporada? Se borrarán todos los pasos y el censo asociado de forma irreversible.')) return
    setSaving(true)
    try {
      // 1. Borrar Censo
      await supabase.from('census').delete().eq('temporada_id', id)
      // 2. Borrar Proyectos
      await supabase.from('proyectos').delete().eq('temporada_id', id)
      // 3. Borrar Temporada
      const { error } = await supabase.from('temporadas').delete().eq('id', id)
      
      if (!error) {
        if (id === activeTemporadaId) setActiveTemporadaId('')
        alert('Temporada eliminada con éxito')
        window.location.reload()
      } else {
        alert('Error: ' + error.message)
      }
    } catch (err) {
      console.error(err)
      alert('Error inesperado al eliminar temporada')
    } finally {
      setSaving(false)
    }
  }

  async function sincronizacionTotal() {
    if (!importPid) {
      alert('Selecciona un paso para sincronizar.')
      return
    }

    if (!confirm('⚠️ ATENCIÓN: Esto buscará costaleros en tu App que ya no existen en iCuadrilla y los borrará de tu Censo Local. ¿Proceder?')) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/import-costaleros')
      const remoteData: ImportEntry[] = await res.json()
      const remoteIds = new Set(remoteData.map(r => r.external_id))

      const { data: localData } = await supabase
        .from('census')
        .select('id, external_id, nombre, apellidos')
        .eq('proyecto_id', importPid)
        .eq('source', 'icuadrilla')
        .not('external_id', 'is', null)

      if (!localData) return

      const aBorrar = localData.filter(l => !remoteIds.has(l.external_id))

      if (aBorrar.length === 0) {
        alert('✅ Tu censo ya está perfectamente sincronizado. No hay bajas detectadas.')
      } else {
        if (confirm(`Se han detectado ${aBorrar.length} bajas (gente que ya no está en iCuadrilla).\n\n¿Quieres borrarlos de tu App?`)) {
          for (const item of aBorrar) {
            await supabase.from('census').delete().eq('id', item.id)
          }
          alert(`✅ Se han eliminado ${aBorrar.length} registros del censo local.`)
        }
      }
    } catch (err) {
      console.error(err)
      alert('❌ Error durante la sincronización total.')
    } finally {
      setSaving(false)
      fetchCensus()
    }
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const { error } = await supabase
      .from('census')
      .update({
        ...editForm,
        trabajadera: editForm.trabajadera ? parseInt(String(editForm.trabajadera)) : null,
        altura: editForm.altura ? parseFloat(String(editForm.altura)) : null
      })
      .eq('id', id)

    if (!error) {
      setCensus(prev => prev.map(c => c.id === id ? { ...c, ...editForm } : c))
      setEditingId(null)
    } else {
      alert(error.message)
    }
    setSaving(false)
  }

  return (
    <>
    <div className="p-4 flex flex-col gap-6 pb-20">
      <div className="text-center max-w-md mx-auto w-full">
        <h2 className="text-2xl font-black cinzel text-[var(--oro)] uppercase tracking-widest mb-6">Panel de Control</h2>
        <div className="flex bg-black/30 p-1.5 rounded-2xl mb-8 border border-[var(--oro)]/10 shadow-inner">
            <button className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => setActiveTab('usuarios')}>USUARIOS</button>
            <button className={`tab-btn ${activeTab === 'censo' ? 'active' : ''}`} onClick={() => setActiveTab('censo')}>CENSO</button>
            <button className={`tab-btn ${activeTab === 'pasos' ? 'active' : ''}`} onClick={() => setActiveTab('pasos')}>PASOS</button>
            <button className={`tab-btn ${activeTab === 'temporadas' ? 'active' : ''}`} onClick={() => setActiveTab('temporadas')}>TEMPORADAS</button>
        </div>
      </div>

      {activeTab === 'usuarios' && (
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="p-8 text-center cinzel text-[var(--oro)] animate-pulse">Cargando usuarios...</div>
          ) : usuarios.map((u: Profile) => (
            <div key={u.id} className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-lg flex flex-col gap-3 relative">
              <div className="absolute top-2 right-2 flex items-center">
                <button 
                  onClick={() => editarPerfil(u.id)}
                  className="text-blue-500 opacity-30 hover:opacity-100 p-2"
                  title="Editar nombre/apodo"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => eliminarUsuario(u.id)}
                  className="text-red-500 opacity-30 hover:opacity-100 p-2"
                  title="Eliminar perfil"
                >
                  🗑️
                </button>
              </div>
              <div className="flex justify-between items-start pr-8">
                <div>
                  <h3 className="font-bold text-[var(--cre)]">{u.nombre} {u.apellidos}</h3>
                  <p className="text-xs text-[var(--oro)] font-bold uppercase tracking-widest">@{u.apodo || 'sin-apodo'}</p>
                </div>
                <span className={`text-[0.6rem] px-2 py-1 rounded font-black uppercase ${
                  u.role === 'superadmin' ? 'bg-red-500/20 text-red-500' : 
                  u.role === 'capataz' ? 'bg-blue-500/20 text-blue-500' : 
                  'bg-green-500/20 text-green-500'
                }`}>
                  {u.role}
                </span>
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1">
                {(['superadmin', 'capataz', 'auxiliar', 'costalero'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    onClick={() => cambiarRol(u.id, r)}
                    className={`text-[0.6rem] px-3 py-1.5 rounded border transition-all uppercase font-bold whitespace-nowrap ${
                      u.role === r 
                        ? 'border-[var(--oro)] bg-[var(--oro)] text-black' 
                        : 'border-[var(--border)] text-[var(--cre-o)] hover:border-[var(--oro)]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'censo' && (
        <div className="flex flex-col gap-6">

          {/* ── Importar desde iCuadrilla ── */}
          <div className="bg-[var(--card)] border border-[var(--oro)]/20 p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="cinzel text-[var(--oro)] text-sm font-bold">📥 Sincronización iCuadrilla</h3>
                <p className="text-[0.6rem] text-[var(--cre-o)] mt-0.5">Importa nuevos, actualiza existentes y gestiona bajas.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={sincronizacionTotal}
                  disabled={saving || importLoading}
                  className="btn btn-out btn-sm text-[0.6rem] border-red-500/30 text-red-400 hover:bg-red-500/10"
                  title="Detectar y borrar gente que ya no está en iCuadrilla"
                >
                  🧹 Limpiar Bajas
                </button>
                <button
                  onClick={fetchFromICuadrilla}
                  disabled={importLoading}
                  className="btn btn-oro btn-sm shrink-0"
                >
                  {importLoading ? '⏳ Cargando...' : '🔄 Previsualizar'}
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={addToCensus} className="bg-[var(--card)] border border-[var(--oro)]/30 p-4 rounded-lg flex flex-col gap-3">
            <h3 className="cinzel text-[var(--oro)] text-sm font-bold">Nuevo Registro en Censo</h3>
            
            <select 
              className="inp text-[var(--cre)]" 
              required 
              value={newEntry.proyecto_id} 
              onChange={e => setNewEntry({...newEntry, proyecto_id: e.target.value})}
            >
              <option value="">Seleccionar Cuadrilla / Paso*</option>
              {pasos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre_paso} ({p.nombre_cuadrilla})</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input className="inp" placeholder="Email" type="email" value={newEntry.email} onChange={e => setNewEntry({...newEntry, email: e.target.value})} />
              <input className="inp" placeholder="Nombre*" required value={newEntry.nombre} onChange={e => setNewEntry({...newEntry, nombre: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="inp" placeholder="Apellidos" value={newEntry.apellidos} onChange={e => setNewEntry({...newEntry, apellidos: e.target.value})} />
              <input className="inp" placeholder="Apodo" value={newEntry.apodo} onChange={e => setNewEntry({...newEntry, apodo: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input className="inp" placeholder="Teléfono" value={newEntry.telefono} onChange={e => setNewEntry({...newEntry, telefono: e.target.value})} />
              <input className="inp" placeholder="Trabajadera (Nº)" type="number" value={newEntry.trabajadera} onChange={e => setNewEntry({...newEntry, trabajadera: e.target.value})} />
              <input className="inp" placeholder="Altura (cm)" type="number" step="0.1" value={newEntry.altura} onChange={e => setNewEntry({...newEntry, altura: e.target.value})} />
            </div>
            <button disabled={saving || !newEntry.proyecto_id} className="btn btn-oro w-full mt-2">
              {saving ? 'Guardando...' : '+ AÑADIR AL CENSO'}
            </button>
          </form>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="cinzel text-[var(--oro)] text-sm font-bold uppercase tracking-widest">
                Gente en Censo <span>{census.length}</span>
              </h3>
              <select 
                className="bg-black/40 border border-[var(--border)] text-[0.6rem] text-[var(--cre-o)] p-1 rounded uppercase font-bold"
                value={filterPid}
                onChange={e => setFilterPid(e.target.value)}
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
              (() => {
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
                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input className="inp text-xs" value={editForm.nombre ?? ''} onChange={e => setEditForm({...editForm, nombre: e.target.value})} />
                              <input className="inp text-xs" value={editForm.apellidos ?? ''} onChange={e => setEditForm({...editForm, apellidos: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input className="inp text-xs" value={editForm.email ?? ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                              <input className="inp text-xs" placeholder="Apodo" value={editForm.apodo ?? ''} onChange={e => setEditForm({...editForm, apodo: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <input className="inp text-xs" placeholder="Tel" value={editForm.telefono ?? ''} onChange={e => setEditForm({...editForm, telefono: e.target.value})} />
                              <input className="inp text-xs" type="number" placeholder="Trab" value={editForm.trabajadera ?? ''} onChange={e => setEditForm({...editForm, trabajadera: e.target.value ? parseInt(e.target.value) : undefined})} />
                              <input className="inp text-xs" type="number" step="0.1" placeholder="Alt (cm)" value={editForm.altura ?? ''} onChange={e => setEditForm({...editForm, altura: e.target.value ? parseFloat(e.target.value) : undefined})} />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(c.id)} className="btn btn-oro flex-1 h-8 text-[0.6rem]">GUARDAR</button>
                              <button onClick={() => setEditingId(null)} className="btn-v h-8 flex-1 text-[0.6rem]">CANCELAR</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--cre)] text-sm">{c.nombre} {c.apellidos}</span>
                                <span className="text-[var(--oro)] text-[10px] font-mono">{c.email}</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => { setEditingId(c.id); setEditForm(c) }} className="p-1 opacity-50 hover:opacity-100">✏️</button>
                                <button onClick={() => deleteFromCensus(c.id)} className="p-1 opacity-50 hover:opacity-100">🗑️</button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-[var(--cre-o)] opacity-70">
                              <div className="flex gap-3">
                                {c.telefono && <span>📞 {c.telefono}</span>}
                                {c.trabajadera && <span>🪜 Trab: {c.trabajadera}</span>}
                                {c.altura && <span className="text-[var(--oro)] font-bold">📏 {c.altura} cm</span>}
                                <span className="text-[var(--oro)] font-black uppercase text-[8px] bg-[var(--oro)]/10 px-1 rounded">
                                  {pasos.find(p => p.id === c.proyecto_id)?.nombre_paso || 'Desconocido'}
                                </span>
                              </div>
                              <span>{new Date(c.created_at).toLocaleDateString()}</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              })()
            )}
          </div>
        </div>
      )}

      {activeTab === 'pasos' && (
        <div className="flex flex-col gap-6">
          <form onSubmit={addPaso} className="bg-[var(--card)] border border-[var(--oro)]/30 p-4 rounded-lg flex flex-col gap-3">
            <h3 className="cinzel text-[var(--oro)] text-sm font-bold">Crear Nuevo Paso</h3>
            <input className="inp" placeholder="Nombre del Paso (ej: Virgen de la Paz)" required value={newPaso.nombre_paso} onChange={e => setNewPaso({...newPaso, nombre_paso: e.target.value})} />
            <input className="inp" placeholder="Nombre de la Cuadrilla" required value={newPaso.nombre_cuadrilla} onChange={e => setNewPaso({...newPaso, nombre_cuadrilla: e.target.value})} />
            <div className="flex aic jb gap-2">
              <label className="text-[0.6rem] text-[var(--cre-o)] uppercase font-bold whitespace-nowrap">Nº Trabajaderas:</label>
              <input className="inp w-20" type="number" min="1" max="15" required value={newPaso.num_trabajaderas} onChange={e => setNewPaso({...newPaso, num_trabajaderas: parseInt(e.target.value)})} />
            </div>
            <button disabled={saving} className="btn btn-oro w-full mt-2">
              {saving ? 'Inicializando...' : 'CREAR E INICIALIZAR PASO'}
            </button>
          </form>

          <div className="flex flex-col gap-3">
            <h3 className="cinzel text-[var(--oro)] text-sm font-bold uppercase tracking-widest">Pasos Activos <span>({pasos.length})</span></h3>
            {loading ? (
              <div className="p-8 text-center cinzel text-[var(--oro)] animate-pulse">Cargando pasos...</div>
            ) : pasos.map((p: PasoDB) => (
              <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-lg flex flex-col gap-2 relative">
                <button 
                  onClick={() => eliminarPaso(p.id)}
                  className="absolute top-2 right-2 text-red-500 opacity-30 hover:opacity-100 p-2"
                >
                  🗑️
                </button>
                <div>
                  <h4 className="font-bold text-[var(--oro)]">{p.nombre_paso}</h4>
                  <p className="text-[10px] text-[var(--cre-o)] uppercase font-bold tracking-widest">{p.nombre_cuadrilla}</p>
                </div>
                <div className="flex jb aic text-[10px] mt-2 opacity-70">
                  <span className="bg-[var(--oro)] text-black px-2 py-0.5 rounded font-black uppercase">{p.num_trabajaderas} TRABAJADERAS</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  disabled={saving}
                  onClick={() => syncTodoCenso(p.id)}
                  className="btn btn-out w-full text-[0.65rem] mt-1"
                  style={{ borderColor: 'var(--oro)', color: 'var(--oro)' }}
                >
                  {saving ? '⏳ Sincronizando...' : '🔄 Sincronizar Cuadrilla desde Censo'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL DE IMPORTACIÓN PREMIUM (CENTRADO Y LEGIBLE) ── */}
      {importPreview && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[var(--cre)] w-full max-w-2xl rounded-2xl border-2 border-[var(--oro)]/40 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
            
            <div className="bg-[var(--oro)]/10 p-6 border-b border-[var(--oro)]/20 flex justify-between items-center">
              <div>
                <h3 className="text-[var(--oro)] cinzel text-xl font-bold flex items-center gap-3">
                  <span className="text-2xl">📥</span> IMPORTAR DESDE ICUADRILLA
                </h3>
                <p className="text-[var(--oro)]/60 text-[10px] uppercase tracking-widest font-black mt-1">
                  {importPreview.filter(c => c._status === 'new').length} nuevos • {importPreview.filter(c => c._status === 'exists').length} a actualizar
                </p>
              </div>
              <button 
                onClick={() => setImportPreview(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--oro)]/20 text-[var(--oro)] transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[var(--oro)] text-[10px] uppercase font-black tracking-widest opacity-70">
                  Asignar a Cuadrilla / Paso Destino:
                </label>
                <select 
                  className="inp w-full h-14 text-lg font-bold !bg-[var(--oro)]/5"
                  value={importPid} 
                  onChange={e => setImportPid(e.target.value)}
                >
                  <option value="">-- SELECCIONAR PASO --</option>
                  {pasos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre_paso} ({p.nombre_cuadrilla})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[var(--oro)] text-[10px] uppercase font-black tracking-widest opacity-70">
                    Previsualización de datos:
                  </label>
                  <button 
                    onClick={() => {
                      const allSelected = importPreview.every(c => c.selected)
                      setImportPreview(importPreview.map(c => ({ ...c, selected: !allSelected })))
                    }}
                    className="text-[8px] text-[var(--oro)] uppercase font-bold border border-[var(--oro)]/30 px-2 py-1 rounded hover:bg-[var(--oro)]/10"
                  >
                    {importPreview.every(c => c.selected) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {importPreview.length === 0 && (
                    <div className="text-center p-12 text-[var(--oro)]/40 italic cinzel">
                      No se encontraron costaleros.
                    </div>
                  )}
                  {importPreview.map((c, i) => (
                    <div 
                      key={i} 
                      className={`bg-white/50 border ${c.selected ? 'border-[var(--oro)]/50 bg-[var(--oro)]/5' : 'border-[var(--oro)]/10'} p-4 rounded-xl flex items-center justify-between hover:border-[var(--oro)]/30 transition-all group`}
                    >
                      <div className="flex items-center gap-4">
                        <input 
                          type="checkbox" 
                          checked={c.selected} 
                          onChange={() => {
                            const next = [...importPreview]
                            next[i].selected = !next[i].selected
                            setImportPreview(next)
                          }}
                          className="w-5 h-5 accent-[var(--oro)] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className={`font-bold text-base leading-tight transition-colors ${c.selected ? 'text-[var(--oro)]' : 'text-[var(--cre-o)]'}`}>
                            {c.nombre} {c.apellidos}
                          </span>
                          <span className="text-[var(--oro)] text-[10px] font-mono opacity-60">
                            {c.email || 'Sin email'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {c.trabajadera && (
                          <div className="flex flex-col items-center justify-center bg-[var(--oro)]/10 px-3 py-1 rounded-lg border border-[var(--oro)]/20">
                            <span className="text-[8px] text-[var(--oro)] uppercase font-black">Trab</span>
                            <span className="text-sm font-black text-[var(--oro)]">T{c.trabajadera}</span>
                          </div>
                        )}
                        <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider ${
                          c._status === 'new' 
                            ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/20' 
                            : 'bg-amber-500/20 text-amber-600 border border-amber-500/20'
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
                onClick={ejecutarImportacion}
                className="btn btn-oro w-full h-16 text-lg tracking-[0.2em] shadow-xl disabled:opacity-30 disabled:cursor-not-allowed group"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    PROCESANDO...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    🚀 CONFIRMAR IMPORTACIÓN
                  </span>
                )}
              </button>
              {!importPid && (
                <p className="text-center text-[var(--oro)] text-[10px] mt-3 font-bold uppercase animate-pulse">
                  ⚠️ Seleccioná un paso para habilitar la importación
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'temporadas' && (
        <div className="flex flex-col gap-4">
          <div className="card p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
            <div className="font-bold text-[var(--oro)] mb-3">TEMPORADA ACTIVA</div>
            <div className="flex flex-col gap-2">
              {temporadas.map(t => (
                <div key={t.id} className="flex gap-2">
                  <button 
                    className={`btn flex-1 flex items-center justify-between ${t.id === activeTemporadaId ? 'btn-oro' : 'btn-ghost'}`}
                    onClick={() => setActiveTemporadaId(t.id)}
                  >
                    <span>{t.nombre}</span>
                    {t.id === activeTemporadaId && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded">ACTUAL</span>}
                  </button>
                  <button 
                    title="Eliminar Temporada"
                    className="btn btn-ghost text-red-500 p-2"
                    onClick={() => eliminarTemporada(t.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
            <div className="font-bold text-[var(--oro)] mb-3">NUEVA TEMPORADA</div>
            <div className="flex flex-col gap-3">
              <input 
                className="inp" 
                placeholder="Nombre de la temporada (ej: SS 2025)" 
                value={newTemp.nombre} 
                onChange={e => setNewTemp({...newTemp, nombre: e.target.value})}
              />
              
              <div className="flex flex-col gap-2 p-3 bg-black/20 rounded border border-white/5">
                <div className="text-[10px] uppercase opacity-40 font-bold mb-1">Opciones de Clonación</div>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newTemp.clonarCenso} onChange={e => setNewTemp({...newTemp, clonarCenso: e.target.checked})} />
                  <span className="text-xs">Clonar Censo del año anterior</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newTemp.clonarPasos} onChange={e => setNewTemp({...newTemp, clonarPasos: e.target.checked})} />
                  <span className="text-xs">Clonar estructura de Pasos / Cuadrillas</span>
                </label>

                {temporadas.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[9px] opacity-40 mb-1">Origen de los datos:</div>
                    <select 
                      className="inp sm h-8 text-[10px]" 
                      value={newTemp.sourceTempId} 
                      onChange={e => setNewTemp({...newTemp, sourceTempId: e.target.value})}
                    >
                      {temporadas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-oro w-full" 
                onClick={async () => {
                  if (!newTemp.nombre) return
                  setSaving(true)
                  
                  const { data: nTemp, error: tErr } = await supabase
                    .from('temporadas')
                    .insert([{ nombre: newTemp.nombre, activa: false }])
                    .select()
                    .single()
                  
                  if (tErr || !nTemp) {
                    alert('Error al crear temporada'); setSaving(false); return
                  }

                  const newId = nTemp.id

                  if (newTemp.sourceTempId) {
                    const projectIdMap: Record<string, string> = {}

                    if (newTemp.clonarPasos) {
                      const { data: oldP } = await supabase.from('proyectos').select('*').eq('temporada_id', newTemp.sourceTempId)
                      if (oldP && oldP.length > 0) {
                        for (const p of oldP) {
                          const oldPid = p.id
                          const rest: Record<string, unknown> = { ...p }
                          delete rest.id
                          delete rest.created_at
                          const cleanContent = JSON.parse(JSON.stringify(rest.content))
                          
                          // Limpiamos el estado operativo pero mantenemos nombres si clonamos censo
                          cleanContent.trabajaderas.forEach((t: Trabajadera) => {
                            if (!newTemp.clonarCenso) t.nombres = []
                            t.plan = null; t.obj = {}; t.analisis = null; t.pinned = null; t.bajas = [];
                          })

                          const { data: nP, error: pErr } = await supabase
                            .from('proyectos')
                            .insert([{ ...rest, content: cleanContent, temporada_id: newId }])
                            .select()
                            .single()
                          
                          if (!pErr && nP) {
                            projectIdMap[oldPid] = nP.id
                          }
                        }
                      }
                    }

                    if (newTemp.clonarCenso) {
                      const { data: oldC } = await supabase.from('census').select('*').eq('temporada_id', newTemp.sourceTempId)
                      if (oldC && oldC.length > 0) {
                        const newC = oldC.map(c => {
                          const rest: Record<string, unknown> = { ...c }
                          delete rest.id
                          delete rest.created_at
                          return { 
                            ...rest, 
                            temporada_id: newId, 
                            proyecto_id: projectIdMap[c.proyecto_id] || '' 
                          }
                        })
                        await supabase.from('census').insert(newC)
                      }
                    }
                  }

                  alert('Temporada creada con éxito')
                  window.location.reload()
                }}
                disabled={saving}
              >
                {saving ? 'CREANDO...' : 'CREAR NUEVA TEMPORADA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
