'use client'

import { useEstado } from '../../hooks/useEstado'
import { tramosOptimos } from '@/lib/algoritmos'
import type { Trabajadera } from '@/lib/types'

export default function SugerenciaSheet() {
  const { S, activeSheet, closeSheet, bancoTarget, sugerirTramos } = useEstado()
  const isOpen = activeSheet === 'sugerencia'

  if (!bancoTarget) {
    return (
      <>
        <div className={`bso${isOpen ? ' open' : ''}`} onClick={closeSheet} />
        <div className={`bss${isOpen ? ' open' : ''}`} />
      </>
    )
  }

  const { tid } = bancoTarget
  const t = S.trabajaderas.find((x: Trabajadera) => x.id === tid)!
  if (!t) return null

  const bajas = t.bajas ?? []
  const nActivos = t.nombres.length - bajas.length
  const nOpt2 = tramosOptimos(nActivos, 2)
  const nOpt3 = tramosOptimos(nActivos, 3)
  const actual = t.tramos.length
  const F = nActivos - 5

  function salidas_info(nTramos: number) {
    const plazas = nTramos * F
    const base = Math.floor(plazas / nActivos)
    const extras = plazas % nActivos
    if (extras === 0) return `${base} salidas por costalero`
    return `${nActivos - extras} × ${base} sal. · ${extras} × ${base + 1} sal.`
  }

  function aplicar(nTramos: number, sal: number) {
    // Actualizar salidas y tramos
    sugerirTramos(tid, sal)
    closeSheet()
  }

  const opciones = [
    { n: nOpt2, sal: 2, cls: 's2', label: 'Óptimo 2 salidas' },
    { n: nOpt3, sal: 3, cls: 's3', label: 'Óptimo 3 salidas' },
  ].filter(o => o.n !== actual)

  return (
    <>
      <div className={`bso${isOpen ? ' open' : ''}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? ' open' : ''}`}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">📐 Sugerencia de Tramos</span>
          <button className="btn btn-ghost btn-sm" onClick={closeSheet}>✕</button>
        </div>
        <div className="sug-info">
          T{tid} · {nActivos} costaleros activos · {F} fuera/tramo
        </div>
        <div className="bs-body">
          <div className="sug-cards">
            {/* Configuración actual */}
            <div className="sug-card actual">
              <div className="sug-title">Configuración actual</div>
              <div className="sug-row">
                <span className="sug-num">{actual}</span>
                <span className="sug-unit">tramos</span>
              </div>
              <div className="sug-detail">{salidas_info(actual)}</div>
            </div>

            {opciones.map((op: typeof opciones[number]) => (
              <div key={op.n} className={`sug-card ${op.cls}`}>
                <div className="sug-title">{op.label}</div>
                <div className="sug-row">
                  <span className="sug-num">{op.n}</span>
                  <span className="sug-unit">tramos</span>
                </div>
                <div className="sug-detail">{salidas_info(op.n)}</div>
                <div className="sug-action">
                  <button className="sug-btn" onClick={() => aplicar(op.n, op.sal)}>
                    Aplicar →
                  </button>
                </div>
              </div>
            ))}

            {opciones.length === 0 && (
              <div className="sug-card actual" style={{ cursor: 'default' }}>
                <div className="sug-title">Ya es el configuración óptima</div>
                <div className="sug-detail">Los {actual} tramos son el número ideal para {nActivos} costaleros.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
