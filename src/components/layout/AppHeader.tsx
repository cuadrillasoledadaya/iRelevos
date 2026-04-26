'use client'

import { useEstado } from '../../hooks/useEstado'
import { exportarDatos, exportarPDF } from '@/lib/exportar'

import { useAuth } from '@/hooks/useAuth'

export default function AppHeader() {
  const { S, pasos, nombrePaso, tema, toggleTema, openSheet } = useEstado()
  const { profile, signOut } = useAuth()
  const esMando = profile?.role === 'superadmin' || profile?.role === 'capataz' || profile?.role === 'auxiliar'

  return (
    <header className="app-hdr">
      {/* Exportar JSON - Solo Mando */}
      {esMando && (
        <button
          className="hdr-btn"
          title="Exportar datos"
          onClick={() => exportarDatos(pasos)}
        >
          ⬇
        </button>
      )}

      {/* Selector de Paso - Solo Mando */}
      {esMando && (
        <button
          className="perfil-selector"
          onClick={() => openSheet('perfiles')}
          title="Cambiar Paso"
        >
          <span className="perfil-nombre">{nombrePaso}</span>
          <span className="perfil-chev">▼</span>
        </button>
      )}

      {/* Info Usuario / Apodo */}
      {profile && (
        <div className="flex flex-col jc items-start px-2 border-l border-[var(--border)] ml-1">
          <span className="text-[0.6rem] text-[var(--oro)] font-bold uppercase tracking-tighter leading-none">
            {profile.role}
          </span>
          <span className="text-[0.7rem] text-[var(--cre)] font-bold leading-none mt-0.5">
            {profile.apodo || profile.nombre}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Toggle Tema */}
      <button
        className="hdr-btn"
        title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        onClick={toggleTema}
      >
        {tema === 'dark' ? '☀' : '🌙'}
      </button>

      {/* Exportar relevos - Solo Mando */}
      {esMando && (
        <button
          className="hdr-btn"
          title="Exportar relevos"
          onClick={() => openSheet('relevos')}
        >
          📋
        </button>
      )}

      {/* PDF - Solo Mando */}
      {esMando && (
        <button
          className="hdr-btn"
          title="Hoja del capataz (PDF)"
          onClick={() => exportarPDF(S.trabajaderas)}
        >
          🖨
        </button>
      )}

      {/* Cerrar Sesión */}
      <button
        className="hdr-btn text-red-500/80"
        title="Cerrar Sesión"
        onClick={signOut}
      >
        🚪
      </button>
    </header>
  )
}
