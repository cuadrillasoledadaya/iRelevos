'use client'

import { useEstado } from '../hooks/useEstado'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import ConfigPage from '@/components/pages/ConfigPage'
import EquipoPage from '@/components/pages/EquipoPage'
import PlanPage from '@/components/pages/PlanPage'
import CapatazPage from '@/components/pages/CapatazPage'
import CargaPage from '@/components/pages/CargaPage'
import BancoSheet from '@/components/sheets/BancoSheet'
import PerfilesSheet from '@/components/sheets/PerfilesSheet'
import CeldaSheet from '@/components/sheets/CeldaSheet'
import SwapSheet from '@/components/sheets/SwapSheet'
import SugerenciaSheet from '@/components/sheets/SugerenciaSheet'
import RelevosSheet from '@/components/sheets/RelevosSheet'
import CensusSheet from '@/components/sheets/CensusSheet'
import AdminPage from '@/components/pages/AdminPage'
import DashboardPage from '@/components/pages/DashboardPage'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { activePage } = useEstado()
  const { session, loading, profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [session, loading, router])

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="text-[var(--oro)] cinzel text-xl animate-pulse">Iniciando sesión...</div>
      </div>
    )
  }

  const esMando = profile?.role === 'superadmin' || profile?.role === 'capataz' || profile?.role === 'auxiliar'

  return (
    <div className="shell">
      <AppHeader />

      <main className="main">
        <div className={activePage === 'home' ? 'page active' : 'page'}>
          <DashboardPage />
        </div>

        {esMando && (
          <div className={activePage === 'config' ? 'page active' : 'page'}>
            <ConfigPage />
          </div>
        )}
        
        <div className={activePage === 'equipo' ? 'page active' : 'page'}>
          <EquipoPage />
        </div>
        
        <div className={activePage === 'plan' ? 'page active' : 'page'}>
          <PlanPage />
        </div>

        {esMando && (
          <>
            <div className={activePage === 'capataz' ? 'page active' : 'page'}>
              <CapatazPage />
            </div>
            <div className={activePage === 'carga' ? 'page active' : 'page'}>
              <CargaPage />
            </div>
            <div className={activePage === 'admin' ? 'page active' : 'page'}>
              <AdminPage />
            </div>
          </>
        )}
      </main>

      <BottomNav />

      {/* Bottom Sheets */}
      <BancoSheet />
      <PerfilesSheet />
      <CeldaSheet />
      <SwapSheet />
      <SugerenciaSheet />
      <RelevosSheet />
      <CensusSheet />
    </div>
  )
}
