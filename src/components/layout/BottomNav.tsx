'use client'

import { useEstado, type ActivePage } from '../../hooks/useEstado'
import { useAuth } from '@/hooks/useAuth'

export default function BottomNav() {
  const { activePage, setActivePage } = useEstado()
  const { profile } = useAuth()

  // Definir pestañas según el rol
  const visibleTabs: { id: ActivePage; label: string; icon: string }[] = []

  const role = profile?.role?.toLowerCase()
  const esMando = role === 'superadmin' || role === 'capataz' || role === 'auxiliar'

  if (esMando) {
    visibleTabs.push({ id: 'config', label: 'Config', icon: '⚙' })
    visibleTabs.push({ id: 'equipo', label: 'Equipo', icon: '🎥' })
    visibleTabs.push({ id: 'plan', label: 'Plan', icon: '🔒' })
    visibleTabs.push({ id: 'capataz', label: 'Capataz', icon: '👁' })
    visibleTabs.push({ id: 'carga', label: 'Carga', icon: '📊' })
    visibleTabs.push({ id: 'admin', label: 'Admin', icon: '🛡' })
  } else {
    // Vista limitada para Costaleros
    visibleTabs.push({ id: 'equipo', label: 'Equipo', icon: '🎥' })
    visibleTabs.push({ id: 'plan', label: 'Mi Plan', icon: '🔒' })
  }

  return (
    <nav className="bnav">
      {visibleTabs.map(tab => (
        <button
          key={tab.id}
          className={`bnav-item${activePage === tab.id ? ' active' : ''}`}
          onClick={() => setActivePage(tab.id)}
        >
          <span className="ic">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
