'use client'

import { useEffect, useState } from 'react'
import { useEstado } from '@/hooks/useEstado'
import { supabase } from '@/lib/supabase'

interface CensusEntry {
  id: string
  nombre: string
  apellidos: string
  apodo?: string
  trabajadera_sugerida?: number
}

export default function CensusSheet() {
  const { pid, activeSheet, closeSheet, censusTarget, setCensusTarget, setNombre } = useEstado()
  const [census, setCensus] = useState<CensusEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const isOpen = activeSheet === 'censo'

  useEffect(() => {
    async function fetchCensus() {
      if (!pid) return
      setLoading(true)
      const { data, error } = await supabase
        .from('census')
        .select('id, nombre, apellidos, apodo, trabajadera_sugerida')
        .eq('proyecto_id', pid)
        .order('nombre', { ascending: true })

      if (!error && data) {
        setCensus(data)
      }
      setLoading(false)
    }

    if (isOpen && pid) {
      fetchCensus()
    }
  }, [isOpen, pid])

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
            filtered.map((c) => (
              <div
                key={c.id}
                className="bs-item flex items-center gap-3 cursor-pointer hover:bg-[rgba(201,168,76,0.1)] transition-colors"
                onClick={() => handleSelect(c)}
              >
                <div className="flex-1">
                  <div className="font-bold text-[var(--cre)]">
                    {c.nombre} {c.apellidos}
                  </div>
                  {c.apodo && (
                    <div className="text-[0.65rem] text-[var(--oro)] uppercase font-black tracking-widest">
                      @{c.apodo}
                    </div>
                  )}
                </div>
                {c.trabajadera_sugerida && (
                  <div className="t-badge !w-6 !h-6 !text-[0.6rem]" title="Trabajadera sugerida">
                    {c.trabajadera_sugerida}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
