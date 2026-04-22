'use client'

import { useEstado, type PasoDB } from '../../hooks/useEstado'

export default function PerfilesSheet() {
  const {
    pasos, pid, setPid, activeSheet, closeSheet,
  } = useEstado()
  const isOpen = activeSheet === 'perfiles'

  return (
    <>
      <div className={`bso${isOpen ? ' open' : ''}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? ' open' : ''}`}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">📋 Selección de Paso</span>
          <button className="btn btn-ghost btn-sm" onClick={closeSheet}>✕</button>
        </div>
        <div className="bs-body">
          {pasos.length === 0 && (
            <div className="p4 text-center text-muted">
              No hay pasos disponibles. Contacta con el administrador.
            </div>
          )}
          
          {pasos.map((p: PasoDB) => (
            <div 
              key={p.id} 
              className={`perfil-item${p.id === pid ? ' activo' : ''}`}
              onClick={() => { setPid(p.id); closeSheet() }}
              style={{ cursor: 'pointer' }}
            >
              <div className="perfil-item-info">
                <div className="perfil-item-nombre">{p.nombre_paso}</div>
                <div className="perfil-item-meta">
                  Cuadrilla: {p.nombre_cuadrilla} · {p.num_trabajaderas} trabajaderas
                </div>
              </div>
              {p.id === pid && <div className="text-[var(--oro)]">✓</div>}
            </div>
          ))}

          <div className="mt-4 p-3 bg-[var(--card)] rounded-lg border border-[var(--border)] text-[0.8rem] text-muted">
            <p>💡 Los pasos son creados y gestionados por el Superadmin desde el Panel de Control.</p>
          </div>
        </div>
      </div>
    </>
  )
}
