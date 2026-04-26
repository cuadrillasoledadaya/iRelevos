'use client'

import { useEffect, useState } from 'react'
import { useEstado } from '@/hooks/useEstado'
import { supabase } from '@/lib/supabase'

interface CensusEntry {
  id: string
  nombre: string
  apellidos: string
  apodo?: string
  trabajadera?: number
}

export default function CensusSheet() {
  const { pid, activeSheet, closeSheet, censusTarget, setCensusTarget, setNombre, activeTemporadaId } = useEstado()
  const [census, setCensus] = useState<CensusEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const isOpen = activeSheet === 'censo'

  useEffect(() => {
    async function fetchCensus() {
      if (!activeTemporadaId) return
      setLoading(true)
      const { data, error } = await supabase
        .from('census')
        .select('id, nombre, apellidos, apodo, trabajadera')
        .eq('temporada_id', activeTemporadaId)
        .order('nombre', { ascending: true })

      if (!error && data) {
        setCensus(data)
      }
      setLoading(false)
    }

    if (isOpen && activeTemporadaId) {
      fetchCensus()
    }
  }, [isOpen, activeTemporadaId])

  function handleSelect(c: CensusEntry) {
    if (censusTarget) {
      const display = c.apodo ? c.apodo : `${c.nombre} ${c.apellidos}`
      setNombre(censusTarget.tid, censusTarget.ci, display)
      setCensusTarget(null)
      closeSheet()
    }
  }

  const filtered = census.filter(c => 
    `${c.nombre} ${c.apellidos} ${c.apodo || ''}`.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <>
      <div className={`bso${isOpen ? ' open' : ''}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? ' open' : ''}`}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">📋 Censo de Cuadrilla</span>
          <button className="btn btn-ghost btn-sm" onClick={closeSheet}>✕</button>
        </div>
        
        <div className="px-4 mb-2">
          <input 
            className="inp w-full" 
            placeholder="Buscar por nombre o apodo..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ height: '40px' }}
          />
        </div>

        <div className="bs-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? (
            <div className="p-4 text-center tcre-o cinzel">Cargando censo...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center tcre-o">No hay costaleros registrados en el censo para este proyecto.</div>
          ) : (
            (() => {
              // Agrupar por trabajadera
              const groups: Record<string, CensusEntry[]> = {}
              filtered.forEach(c => {
                const t = c.trabajadera ? `TRABAJADERA ${c.trabajadera}` : 'SIN ASIGNAR'
                if (!groups[t]) groups[t] = []
                groups[t].push(c)
              })

              // Ordenar grupos (primero TR 1, TR 2... luego SIN ASIGNAR)
              const sortedGroups = Object.keys(groups).sort((a, b) => {
                if (a === 'SIN ASIGNAR') return 1
                if (b === 'SIN ASIGNAR') return -1
                return a.localeCompare(b, undefined, { numeric: true })
              })

              return sortedGroups.map(groupName => (
                <div key={groupName} className="mb-6">
                  <div className="px-4 py-2 bg-[rgba(184,151,62,0.2)] text-[var(--oro)] text-[0.7rem] font-black uppercase tracking-[0.3em] border-y-2 border-[var(--oro)]/30 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
                    <span>{groupName}</span>
                    <span className="opacity-60 text-[0.6rem]">{groups[groupName].length} PERSONAS</span>
                  </div>
                  <div className="divide-y divide-[var(--oro)]/10">
                    {groups[groupName].map((c) => (
                      <div
                        key={c.id}
                        className="bs-item flex items-center gap-3 cursor-pointer hover:bg-[rgba(201,168,76,0.1)] transition-colors py-3"
                        onClick={() => handleSelect(c)}
                      >
                        <div className="flex-1">
                          <div className="font-bold text-[var(--cre)] text-base">
                            {c.nombre} {c.apellidos}
                          </div>
                          {c.apodo && (
                            <div className="text-[0.65rem] text-[var(--oro)] uppercase font-black tracking-widest mt-0.5">
                              @{c.apodo}
                            </div>
                          )}
                        </div>
                        {c.trabajadera && (
                          <div className="t-badge !w-7 !h-7 !text-[0.7rem] border-[var(--oro)]/50" title="Trabajadera">
                            {c.trabajadera}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()
          )}
        </div>
      </div>
    </>
  )
}
