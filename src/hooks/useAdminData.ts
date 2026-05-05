// ══════════════════════════════════════════════════════════════════
// USE ADMIN DATA — Hook de fetching de datos para el panel de admin
// ══════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/hooks/useAuth'
import type { PasoDB } from '@/lib/types'
import type { CensusEntry } from '@/components/admin/types'

export function useAdminData(activeTemporadaId: string) {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [census, setCensus] = useState<CensusEntry[]>([])
  const [pasos, setPasos] = useState<PasoDB[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nombre', { ascending: true })

    if (!error && data) setUsuarios(data as Profile[])
    setLoading(false)
  }, [])

  const fetchCensus = useCallback(async (filterPid: string = 'all') => {
    if (!activeTemporadaId) return
    setLoading(true)

    const { data: projIds } = await supabase.from('proyectos').select('id').eq('temporada_id', activeTemporadaId)
    const validPids = (projIds || []).map(p => p.id)

    let query = supabase.from('census').select('*')

    if (validPids.length > 0) {
      query = query.or(`temporada_id.eq.${activeTemporadaId},proyecto_id.in.(${validPids.join(',')})`)
    } else {
      query = query.eq('temporada_id', activeTemporadaId)
    }

    if (filterPid !== 'all') {
      query = query.eq('proyecto_id', filterPid)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching census:', error)
      alert('Error al cargar el censo: ' + error.message)
    }

    if (!error && data) setCensus(data as CensusEntry[])
    setLoading(false)
  }, [activeTemporadaId])

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

  return {
    usuarios, setUsuarios,
    census, setCensus,
    pasos, setPasos,
    loading, setLoading,
    fetchUsuarios, fetchCensus, fetchPasos,
  }
}
