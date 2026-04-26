'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useEstado } from '@/hooks/useEstado'
import packageJson from '../../../package.json'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { setActivePage } = useEstado()
  const [stats, setStats] = useState({
    censados: 0,
    pasos: 0,
    trabajaderas: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: censusCount } = await supabase.from('census').select('*', { count: 'exact', head: true })
        const { count: pasosCount } = await supabase.from('proyectos').select('*', { count: 'exact', head: true })
        
        // Simulación o cálculo de ocupación si tuviéramos los datos de trabajaderas ocupadas
        // Por ahora mostramos los censados y pasos reales
        setStats({
          censados: censusCount || 0,
          pasos: pasosCount || 0,
          trabajaderas: 0 // Podríamos ampliar esto luego
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="flex flex-col gap-6 p-4 animate-in fade-in duration-500">
      {/* Bienvenida */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black cinzel text-[var(--oro)]">
          ¡Hola, {profile?.nombre || 'Costalero'}!
        </h1>
        <p className="text-[var(--cre-o)] text-sm uppercase tracking-widest font-bold">
          Bienvenido al centro de mando
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg">
          <span className="text-4xl font-black text-[var(--oro)] cinzel">
            {loading ? '...' : stats.censados}
          </span>
          <span className="text-[0.6rem] uppercase tracking-widest text-[var(--cre-o)] font-bold">Censados</span>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg">
          <span className="text-4xl font-black text-[var(--oro)] cinzel">
            {loading ? '...' : stats.pasos}
          </span>
          <span className="text-[0.6rem] uppercase tracking-widest text-[var(--cre-o)] font-bold">Pasos</span>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--oro)] font-black">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 gap-2">
          <button 
            onClick={() => setActivePage('plan')}
            className="btn btn-oro h-16 text-lg flex items-center justify-between px-6"
          >
            <span>GESTIONAR RELEVOS</span>
            <span className="text-2xl">➡️</span>
          </button>
          <button 
            onClick={() => setActivePage('admin')}
            className="btn btn-out h-14 text-sm flex items-center justify-between px-6"
          >
            <span>PANEL DE CONTROL</span>
            <span className="text-xl">⚙️</span>
          </button>
        </div>
      </div>

      {/* Info de la App */}
      <div className="mt-auto pt-8 border-t border-[var(--border)] flex justify-between items-end opacity-50">
        <div className="flex flex-col">
          <span className="text-[0.6rem] uppercase tracking-widest font-bold text-[var(--cre-o)]">Versión del Sistema</span>
          <span className="text-sm font-black cinzel text-[var(--oro)]">v{packageJson.version}</span>
        </div>
        <div className="text-right">
          <span className="text-[0.5rem] uppercase tracking-widest font-bold text-[var(--cre-o)]">Servidores</span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[0.6rem] font-bold text-green-500">ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
