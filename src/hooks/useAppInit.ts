// ══════════════════════════════════════════════════════════════════
// useAppInit — Inicialización de la app (temporadas, tema, realtime)
// Se debe llamar UNA VEZ desde AppInitializer en el layout.
// ══════════════════════════════════════════════════════════════════
'use client'

import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'
import { uiStore, projectStore, temporadaStore } from '@/stores'
import type { Temporada } from '@/lib/types'

const LS_TID = 'cpwa_active_temp_id'

export function useAppInit() {
  const { user, loading: authLoading } = useAuth()

  // 1. Cargar temporadas desde Supabase
  useEffect(() => {
    if (authLoading) return
    async function init() {
      const { data: temps, error: tErr } = await supabase.from('temporadas').select('*').order('created_at', { ascending: false })
      if (!tErr && temps?.length) {
        temporadaStore.getState().setTemporadas(temps)
        const savedTid = localStorage.getItem(LS_TID)
        const currentTemp = (savedTid && temps.find((t: Temporada) => t.id === savedTid)) || temps.find((t: Temporada) => t.activa) || temps[0]
        temporadaStore.getState().setActiveTemporadaId(currentTemp.id)
      }
    }
    init()
    const channel = supabase.channel('proyectos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proyectos' }, () => { init() }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, authLoading])

  // 2. Sincronizar activeTemporadaId entre stores + refetch
  const activeTemporadaId = temporadaStore((s) => s.activeTemporadaId)
  useEffect(() => {
    if (activeTemporadaId) { projectStore.getState().setActiveTemporadaId(activeTemporadaId); projectStore.getState().refetchPasos(); localStorage.setItem(LS_TID, activeTemporadaId) }
  }, [activeTemporadaId])

  // 3. Aplicar tema al DOM
  const tema = uiStore((s) => s.tema)
  useEffect(() => { if (typeof document !== 'undefined') document.documentElement.classList.toggle('light', tema === 'light') }, [tema])
}
