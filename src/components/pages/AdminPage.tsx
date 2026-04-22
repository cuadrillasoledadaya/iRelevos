'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, UserRole } from '@/hooks/useAuth'
import { PasoDB } from '../../lib/types'
import { useCallback } from 'react'
import { useEstado } from '@/hooks/useEstado'

interface CensusEntry {
  id: string
  email: string
  nombre: string
  apellidos: string
  apodo?: string
  telefono: string
  trabajadera_sugerida?: number
  proyecto_id: string
  created_at: string
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'censo' | 'pasos'>('usuarios')
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [census, setCensus] = useState<CensusEntry[]>([])
  const [pasos, setPasos] = useState<PasoDB[]>([])
  const [loading, setLoading] = useState(true)

  // Formulario Censo
  const [newEntry, setNewEntry] = useState({ email: '', nombre: '', apellidos: '', apodo: '', telefono: '', trabajadera_sugerida: '', proyecto_id: '' })
  const [filterPid, setFilterPid] = useState<string>('all')
  
  // Formulario Nuevo Paso
  const [newPaso, setNewPaso] = useState({ nombre_paso: '', nombre_cuadrilla: '', num_trabajaderas: 6 })
  
  const { pid } = useEstado()
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<CensusEntry>>({})
  const [saving, setSaving] = useState(false)

  const fetchPasos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('proyectos')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setPasos(data as PasoDB[])
    setLoading(false)
  }, [])

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
    setLoading(true)
    let query = supabase.from('census').select('*')
    
    if (filterPid !== 'all') {
      query = query.eq('proyecto_id', filterPid)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (!error && data) setCensus(data as CensusEntry[])
    setLoading(false)
  }, [filterPid])

  // Cargar pasos siempre (los necesita el formulario de censo)
  useEffect(() => {
    fetchPasos()
  }, [fetchPasos])

  // Cargar datos de la pestaña activa
  useEffect(() => {
    if (activeTab === 'usuarios') fetchUsuarios()
    else if (activeTab === 'censo') fetchCensus()
  }, [activeTab, fetchUsuarios, fetchCensus])

  // Sincronizar pid con el formulario
  useEffect(() => {
    if (pid && !newEntry.proyecto_id) {
      setNewEntry(prev => ({ ...prev, proyecto_id: pid }))
    }
  }, [pid, newEntry.proyecto_id])

  async function crearPaso(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { nombre_paso, nombre_cuadrilla, num_trabajaderas } = newPaso
    
    const initialData = {
      trabajaderas: Array.from({ length: num_trabajaderas }, (_, i) => {
        const id = i + 1
        return {
          id,
          nombres: Array(6).fill('').map((_, idx) => `Costalero ${idx + 1}`),
          salidas: 2,
          roles: Array(6).fill('').map((_, idx) => ({ 
            pri: idx === 0 ? 'COR' : idx === 5 ? 'COR' : 'CEN', 
            sec: 'FIJ' 
          })),
          tramos: [`Tramo 1 (T${id})`, `Tramo 2 (T${id})`, `Tramo 3 (T${id})`],
          plan: null, obj: null, analisis: null, pinned: null, bajas: [], regla5costaleros: false,
          puntuaciones: {}, tramosClaves: []
        }
      }),
      banco: []
    }

    const { error } = await supabase
      .from('proyectos')
      .insert([{
        nombre_paso,
        nombre_cuadrilla,
        num_trabajaderas,
        content: initialData
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

  async function addToCensus(e: React.FormEvent) {
    e.preventDefault()
    if (!newEntry.email || !newEntry.nombre) return
    setSaving(true)

    const trabajaderaNum = newEntry.trabajadera_sugerida ? parseInt(newEntry.trabajadera_sugerida) : null

    const payload = {
      ...newEntry,
      trabajadera_sugerida: trabajaderaNum
    }

    const { data, error } = await supabase
      .from('census')
      .insert([payload])
      .select()

    if (!error && data) {
      setCensus([data[0], ...census])
      setNewEntry({ email: '', nombre: '', apellidos: '', apodo: '', telefono: '', trabajadera_sugerida: '', proyecto_id: newEntry.proyecto_id })

      // Auto-sync: si tiene trabajadera asignada, meterlo en el proyecto
      if (trabajaderaNum && newEntry.proyecto_id) {
        const displayName = newEntry.apodo?.trim() || `${newEntry.nombre} ${newEntry.apellidos}`.trim()
        await syncCostaleroToProject(newEntry.proyecto_id, trabajaderaNum, displayName)
      }
    } else {
      alert(error?.message || 'Error al añadir al censo')
    }
    setSaving(false)
  }

  // Inserta un costalero del censo en la primera posición libre de su trabajadera
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

    // Buscar primer slot genérico libre: "Costalero N"
    const slotIdx = trab.nombres.findIndex(n => /^Costalero \d+$/.test(n))
    if (slotIdx === -1) {
      trab.nombres.push(displayName)
      if (trab.roles) trab.roles.push({ pri: 'COR', sec: 'FIJ' })
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

  // Sync completo: aplica TODO el censo al proyecto de una vez
  async function syncTodoCenso(proyectoId: string) {
    setSaving(true)

    const { data: censusData } = await supabase
      .from('census')
      .select('nombre, apellidos, apodo, trabajadera_sugerida')
      .eq('proyecto_id', proyectoId)
      .not('trabajadera_sugerida', 'is', null)
      .order('trabajadera_sugerida', { ascending: true })

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

    // Resetear todos los slots a genéricos primero
    content.trabajaderas.forEach(t => {
      t.nombres = t.nombres.map((n, i) => /^Costalero \d+$/.test(n) ? `Costalero ${i + 1}` : n)
    })

    // Agrupar por trabajadera y asignar en orden
    const byTrab: Record<number, string[]> = {}
    censusData.forEach(c => {
      const tid = c.trabajadera_sugerida as number
      const name = (c.apodo?.trim()) || `${c.nombre} ${c.apellidos}`.trim()
      if (!byTrab[tid]) byTrab[tid] = []
      byTrab[tid].push(name)
    })

    Object.entries(byTrab).forEach(([tidStr, names]) => {
      const tid = parseInt(tidStr)
      const trab = content.trabajaderas.find(t => t.id === tid)
      if (!trab) return
      names.forEach(name => {
        const slotIdx = trab.nombres.findIndex(n => /^Costalero \d+$/.test(n))
        if (slotIdx !== -1) trab.nombres[slotIdx] = name
        else trab.nombres.push(name)
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

  async function saveEdit(id: string) {
    setSaving(true)
    const { error } = await supabase
      .from('census')
      .update({
        ...editForm,
        trabajadera_sugerida: editForm.trabajadera_sugerida ? parseInt(String(editForm.trabajadera_sugerida)) : null
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
    <div className="p-4 flex flex-col gap-6 pb-20">
      <div className="text-center">
        <h2 className="text-2xl font-black cinzel text-[var(--oro)] uppercase tracking-widest">Panel de Control</h2>
        <div className="flex justify-center gap-4 mt-4 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setActiveTab('usuarios')}
            className={`pb-1 text-xs uppercase font-bold tracking-tighter transition-all whitespace-nowrap ${activeTab === 'usuarios' ? 'text-[var(--oro)] border-b-2 border-[var(--oro)]' : 'text-[var(--cre-o)]'}`}
          >
            Usuarios
          </button>
          <button 
            onClick={() => setActiveTab('censo')}
            className={`pb-1 text-xs uppercase font-bold tracking-tighter transition-all whitespace-nowrap ${activeTab === 'censo' ? 'text-[var(--oro)] border-b-2 border-[var(--oro)]' : 'text-[var(--cre-o)]'}`}
          >
            Censo
          </button>
          <button 
            onClick={() => setActiveTab('pasos')}
            className={`pb-1 text-xs uppercase font-bold tracking-tighter transition-all whitespace-nowrap ${activeTab === 'pasos' ? 'text-[var(--oro)] border-b-2 border-[var(--oro)]' : 'text-[var(--cre-o)]'}`}
          >
            Gestión de Pasos
          </button>
        </div>
      </div>

      {activeTab === 'usuarios' && (
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="p-8 text-center cinzel text-[var(--oro)] animate-pulse">Cargando usuarios...</div>
          ) : usuarios.map((u: Profile) => (
            <div key={u.id} className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-lg flex flex-col gap-3 relative">
              <button 
                onClick={() => eliminarUsuario(u.id)}
                className="absolute top-2 right-2 text-red-500 opacity-30 hover:opacity-100 p-2"
              >
                🗑️
              </button>
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
              <input className="inp" placeholder="Email*" type="email" required value={newEntry.email} onChange={e => setNewEntry({...newEntry, email: e.target.value})} />
              <input className="inp" placeholder="Nombre*" required value={newEntry.nombre} onChange={e => setNewEntry({...newEntry, nombre: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="inp" placeholder="Apellidos" value={newEntry.apellidos} onChange={e => setNewEntry({...newEntry, apellidos: e.target.value})} />
              <input className="inp" placeholder="Apodo" value={newEntry.apodo} onChange={e => setNewEntry({...newEntry, apodo: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="inp" placeholder="Teléfono" value={newEntry.telefono} onChange={e => setNewEntry({...newEntry, telefono: e.target.value})} />
              <input className="inp" placeholder="Trabajadera Sugerida (Nº)" type="number" value={newEntry.trabajadera_sugerida} onChange={e => setNewEntry({...newEntry, trabajadera_sugerida: e.target.value})} />
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
            ) : census.map((c: CensusEntry) => (
              <div key={c.id} className={`bg-[var(--card)] border ${editingId === c.id ? 'border-[var(--oro)]' : 'border-[var(--border)]'} p-3 rounded flex flex-col gap-2 transition-all`}>
                {editingId === c.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input className="inp text-xs" value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} />
                      <input className="inp text-xs" value={editForm.apellidos} onChange={e => setEditForm({...editForm, apellidos: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className="inp text-xs" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                      <input className="inp text-xs" placeholder="Apodo" value={editForm.apodo} onChange={e => setEditForm({...editForm, apodo: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className="inp text-xs" placeholder="Tel" value={editForm.telefono} onChange={e => setEditForm({...editForm, telefono: e.target.value})} />
                      <input className="inp text-xs" type="number" placeholder="Trab" value={editForm.trabajadera_sugerida} onChange={e => setEditForm({...editForm, trabajadera_sugerida: e.target.value ? parseInt(e.target.value) : undefined})} />
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
                        {c.trabajadera_sugerida && <span>🪜 Trab: {c.trabajadera_sugerida}</span>}
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
        </div>
      )}

      {activeTab === 'pasos' && (
        <div className="flex flex-col gap-6">
          <form onSubmit={crearPaso} className="bg-[var(--card)] border border-[var(--oro)]/30 p-4 rounded-lg flex flex-col gap-3">
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
    </div>
  )
}
