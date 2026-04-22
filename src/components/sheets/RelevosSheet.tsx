'use client'

import { useState } from 'react'
import { useEstado } from '@/hooks/useEstado'
import { exportarRelevos, exportarRelevosIndividual, exportarPDF, exportarRelevosMultiplesItems } from '@/lib/exportar'
import type { Trabajadera } from '@/lib/types'

export default function RelevosSheet() {
  const { S, activeSheet, closeSheet } = useEstado()
  const isOpen = activeSheet === 'relevos'
  const conPlan = S.trabajaderas.filter((t: Trabajadera): t is Trabajadera & { plan: NonNullable<Trabajadera['plan']>; analisis: NonNullable<Trabajadera['analisis']> } => !!(t.plan && t.analisis))

  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())
  const [tidIndividual, setTidIndividual] = useState<number | ''>('')
  const [ciIndividual, setCiIndividual] = useState<number | ''>('')

  function toggleTrab(id: number) {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleGenerarSeleccionadas() {
    const trabs = conPlan.filter((t: typeof conPlan[number]): t is typeof conPlan[number] => seleccionadas.has(t.id))
    if (!trabs.length) { alert('⚠ Selecciona al menos una trabajadera.'); return }
    closeSheet()
    exportarRelevos(trabs)
  }

  function handleGenerarIndividual() {
    if (!tidIndividual) { alert('⚠ Selecciona una trabajadera.'); return }
    if (ciIndividual === '') { alert('⚠ Selecciona un costalero.'); return }
    const t = conPlan.find((x: typeof conPlan[number]) => x.id === tidIndividual)
    if (!t) return
    const ci = +ciIndividual
    closeSheet()
    exportarRelevosIndividual(t, ci, t.nombres[ci])
  }

  function handleGenerarTodos() {
    if (!tidIndividual) { alert('⚠ Selecciona una trabajadera.'); return }
    const t = conPlan.find((x: typeof conPlan[number]) => x.id === tidIndividual)
    if (!t) return
    
    if (confirm(`¿Generar las tablas individuales de los ${t.nombres.length} costaleros de la Trabajadera ${t.id}?`)) {
      closeSheet()
      const indices = t.nombres
        .map((_: string, i: number) => i)
        .filter((i: number) => !t.bajas?.includes(i))
      exportarRelevosMultiplesItems(t, indices)
    }
  }

  const trabajaderaIndividual = conPlan.find((x: typeof conPlan[number]): x is typeof conPlan[number] => x.id === tidIndividual)

  return (
    <>
      <div className={`bso${isOpen ? ' open' : ''}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? ' open' : ''}`}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">📋 Exportar Relevos</span>
          <button className="btn btn-ghost btn-sm" onClick={closeSheet}>✕</button>
        </div>
        <div className="bs-body">
          {conPlan.length === 0 ? (
            <div className="alert warn" style={{ margin: '1rem' }}>
              ⚠ Calcula las rotaciones de al menos una trabajadera primero.
            </div>
          ) : (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Opción 1 */}
              <div>
                <div className="sec" style={{ marginBottom: '.6rem' }}>📋 Opción 1: Tablas normales</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '.75rem' }}>
                  {conPlan.map((t: Trabajadera) => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem', background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.15)', borderRadius: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(t.id)}
                        onChange={() => toggleTrab(t.id)}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--cre)' }}>Trabajadera {t.id}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--oro-o)' }}>
                          {t.nombres.length} costaleros · {t.tramos.length} tramos
                        </div>
                      </span>
                      {t.analisis?.rep.length === 0
                        ? <span style={{ color: 'var(--ok-tx)', fontWeight: 700 }}>✓</span>
                        : <span style={{ color: 'var(--warn-oro)', fontWeight: 700 }}>⚠</span>
                      }
                    </label>
                  ))}
                </div>
                <button className="btn btn-oro w100" onClick={handleGenerarSeleccionadas}>
                  📋 Generar (Opción 1)
                </button>
              </div>

              {/* Opción 2 */}
              <div style={{ borderTop: '1px solid rgba(201,168,76,.2)', paddingTop: '1rem' }}>
                <div className="sec" style={{ marginBottom: '.6rem' }}>🔹 Opción 2: Costalero individual</div>
                <div style={{ marginBottom: '.6rem' }}>
                  <label style={{ display: 'block', fontSize: '.75rem', color: 'var(--cre-o)', marginBottom: '.3rem' }}>
                    Trabajadera:
                  </label>
                  <select
                    className="inp"
                    value={tidIndividual}
                    onChange={e => { setTidIndividual(e.target.value ? +e.target.value : ''); setCiIndividual('') }}
                    style={{ height: '42px' }}
                  >
                    <option value="">-- Selecciona --</option>
                    {conPlan.map((t: Trabajadera) => (
                      <option key={t.id} value={t.id}>Trabajadera {t.id} ({t.nombres.length} costaleros)</option>
                    ))}
                  </select>
                </div>
                {trabajaderaIndividual && (
                  <div style={{ marginBottom: '.6rem' }}>
                    <label style={{ display: 'block', fontSize: '.75rem', color: 'var(--cre-o)', marginBottom: '.3rem' }}>
                      Costalero:
                    </label>
                    <select
                      className="inp"
                      value={ciIndividual}
                      onChange={e => setCiIndividual(e.target.value !== '' ? +e.target.value : '')}
                      style={{ height: '42px' }}
                    >
                      <option value="">-- Selecciona --</option>
                      {trabajaderaIndividual.nombres.map((nombre: string, i: number) => (
                        <option key={i} value={i}>{nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <button className="btn btn-oro f1" onClick={handleGenerarIndividual}>
                    🔹 Indiv.
                  </button>
                  <button className="btn btn-out f1" style={{ borderColor: 'var(--oro)', color: 'var(--oro)' }} onClick={handleGenerarTodos}>
                    👥 Todo el Equipo
                  </button>
                </div>
              </div>

              {/* Opción 3 */}
              <div style={{ borderTop: '1px solid rgba(201,168,76,.2)', paddingTop: '1rem' }}>
                <div className="sec" style={{ marginBottom: '.6rem' }}>⚙ Opción 3: Hoja del Capataz</div>
                <p style={{ fontSize: '.75rem', color: 'var(--cre-o)', marginBottom: '.8rem', lineHeight: 1.5 }}>
                  Genera una hoja horizontal (PDF) con la cuadrícula completa de relevos para todas las trabajaderas con plan.
                </p>
                <button className="btn btn-oro w100" onClick={() => { closeSheet(); exportarPDF(conPlan) }}>
                  ⚙ Generar PDF Capataz
                </button>
              </div>

              <button className="btn btn-ghost w100" onClick={closeSheet}>Cancelar</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
