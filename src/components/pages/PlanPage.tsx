'use client'

import { useState } from 'react'
import { useEstado } from '../../hooks/useEstado'
import { getPinned, countPinned, getFueraPorTramo } from '@/lib/algoritmos'
import { nameAt, shortName } from '@/lib/nombres'
import type { Trabajadera } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

export default function PlanPage() {
  const { S, calcularTodo } = useEstado()
  const { profile } = useAuth()
  const esMando = profile?.role === 'superadmin' || profile?.role === 'capataz' || profile?.role === 'auxiliar'

  // Si es costalero, mostrar vista personal
  if (!esMando) {
    return <MiPlanPersonal S={S} profile={profile} />
  }
  
  return (
    <>
      <div className="sec flex jb aic">
        <span>Plan de Rotaciones</span>
        <button className="btn btn-oro btn-sm" onClick={calcularTodo}>
          ⚙ Calcular Todos
        </button>
      </div>
      
      {S.trabajaderas.map((t: Trabajadera) => (
        <PlanTrabajadera key={t.id} t={t} />
      ))}
    </>
  )
}

// ── Vista Personal para Costaleros ────────────────────────────────

import type { DatosPerfil } from '@/hooks/useEstado'
import type { Profile } from '@/hooks/useAuth'

function MiPlanPersonal({ S, profile }: { S: DatosPerfil; profile: Profile | null }) {
  // 1. Buscar trabajadera por profile.trabajadera (campo explícito)
  // 2. Fallback: fuzzy match nombre+apellidos en todas las trabajaderas
  const myName = `${profile?.nombre ?? ''} ${profile?.apellidos ?? ''}`.toLowerCase().trim()
  const myApodo = profile?.apodo?.toLowerCase().trim() ?? ''

  type Match = { t: Trabajadera; ci: number }
  let match: Match | null = null

  if (profile?.trabajadera) {
    const t = S.trabajaderas.find(x => x.id === profile.trabajadera)
    if (t) {
      const ci = t.nombres.findIndex((n, i) => {
        if (t.bajas?.includes(i)) return false
        const ns = n.toLowerCase()
        return ns.includes(myName) || myName.includes(ns) || (myApodo && ns.includes(myApodo))
      })
      if (ci !== -1) match = { t, ci }
      else match = { t, ci: -1 } // tiene trabajadera asignada pero no se encontró el nombre
    }
  }

  if (!match) {
    for (const t of S.trabajaderas) {
      const ci = t.nombres.findIndex((n, i) => {
        if (t.bajas?.includes(i)) return false
        const ns = n.toLowerCase()
        return ns.includes(myName) || myName.includes(ns) || (myApodo && ns.includes(myApodo))
      })
      if (ci !== -1) { match = { t, ci }; break }
    }
  }

  if (!match || !match.t.plan) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="sec">Mi Plan Personal</div>
        <div className="alert warn">
          {!match
            ? `⚠ No se encontró tu nombre en ninguna trabajadera. Contactá con el administrador para que te asigne.`
            : `⚠ El plan de tu trabajadera aún no ha sido calculado. Consultá con el capataz.`
          }
        </div>
      </div>
    )
  }

  const { t, ci } = match
  const plan = t.plan!
  const salidas = t.analisis?.conteo[ci] ?? 0
  const objetivo = t.obj?.[ci] ?? 0
  const primerTramo = plan.findIndex(r => r.dentro.includes(ci))
  const ultimoTramo = [...plan].reverse().findIndex(r => r.dentro.includes(ci))
  const ultimoReal = ultimoTramo !== -1 ? plan.length - 1 - ultimoTramo : -1

  return (
    <div className="flex flex-col gap-4 p-1 animate-in fade-in duration-500">
      {/* Cabecera */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-black cinzel text-[var(--oro)]">¡Hola, {profile?.nombre}!</h1>
        <p className="text-[0.65rem] uppercase tracking-widest text-[var(--cre-o)] font-bold">
          Trabajadera {t.id} · {t.tramos.length} tramos
        </p>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-black cinzel text-[var(--oro)]">{salidas}</div>
          <div className="text-[0.55rem] uppercase tracking-wider text-[var(--cre-o)] font-bold mt-0.5">Salidas</div>
        </div>
        {(() => {
          const firstTramoObj = t.tramos[primerTramo]
          return (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
              <div className="text-2xl font-black cinzel text-[var(--oro)] truncate px-1" title={firstTramoObj}>
                {primerTramo !== -1 ? (firstTramoObj || `T${primerTramo + 1}`) : '—'}
              </div>
              <div className="text-[0.55rem] uppercase tracking-wider text-[var(--cre-o)] font-bold mt-0.5">Primera</div>
            </div>
          )
        })()}
        {(() => {
          const lastTramoObj = t.tramos[ultimoReal]
          return (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
              <div className="text-2xl font-black cinzel text-[var(--oro)] truncate px-1" title={lastTramoObj}>
                {ultimoReal !== -1 ? (lastTramoObj || `T${ultimoReal + 1}`) : '—'}
              </div>
              <div className="text-[0.55rem] uppercase tracking-wider text-[var(--cre-o)] font-bold mt-0.5">Última</div>
            </div>
          )
        })()}
      </div>

      {/* Cuadrícula de tramos */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--oro)] font-black">Tu relevo</h2>
        <div className="flex flex-col gap-1.5">
          {t.tramos.map((nombreTramo, ti) => {
            const r = plan[ti]
            const esDentro = r.dentro.includes(ci)
            const esFuera = r.fuera.includes(ci)
            const esClave = t.tramosClaves?.includes(ti)

            return (
              <div
                key={ti}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
                  esDentro
                    ? 'bg-[var(--oro)] border-[var(--oro)] shadow-lg'
                    : esFuera
                    ? 'bg-[var(--card)] border-[var(--border)]'
                    : 'bg-[var(--card)] border-[var(--border)] opacity-40'
                }`}
              >
                <div className={`text-[10px] font-black cinzel w-12 shrink-0 ${esDentro ? 'text-black' : 'text-[var(--oro)]'}`}>
                  {t.tramos[ti] || `T${ti + 1}`}
                </div>
                <div className={`flex-1 text-xs font-bold truncate ${esDentro ? 'text-black' : 'text-[var(--cre)]'}`}>
                  {nombreTramo}
                  {esClave && <span className="ml-1 text-[0.55rem]">★</span>}
                </div>
                <div className={`text-xs font-black uppercase tracking-wider shrink-0 ${
                  esDentro ? 'text-black' : esFuera ? 'text-[var(--cre-o)]' : 'text-[var(--border)]'
                }`}>
                  {esDentro ? '⬇ DENTRO' : esFuera ? 'FUERA' : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[0.65rem] uppercase tracking-wider text-[var(--cre-o)] font-bold">Objetivo de salidas</span>
          <span className="text-sm font-black cinzel text-[var(--oro)]">{salidas}/{objetivo}</span>
        </div>
        <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--oro)] rounded-full transition-all"
            style={{ width: objetivo > 0 ? `${Math.min(100, (salidas / objetivo) * 100)}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  )
}


function PlanTrabajadera({ t }: { t: Trabajadera }) {
  const {
    openSheet, setCellTarget, setBancoTarget,
    addTramo, delTramo, setSalidas,
    calcularTrab, completarPlan, limpiarPlan, getErroresPinned, quitarBloqueos,
    sugerirYCalcular
  } = useEstado()
  const { profile } = useAuth()
  const esMando = profile?.role === 'superadmin' || profile?.role === 'capataz' || profile?.role === 'auxiliar'

  // Lógica de filtrado para costaleros
  const myName = `${profile?.nombre} ${profile?.apellidos}`.toLowerCase().trim()
  const myApodo = profile?.apodo?.toLowerCase().trim()

  const [isOpen, setIsOpen] = useState(false)
  const pinStatus = countPinned(t)
  const hasPins = pinStatus.total > 0
  const nBajas = t.bajas?.length ?? 0
  const nActivos = t.nombres.length - nBajas
  const F = getFueraPorTramo(t)

  const erroresPinned = getErroresPinned(t.id)
  const pinned = getPinned(t)

  function openBanco(ti: number) {
    setBancoTarget({ tid: t.id, ti })
    openSheet('banco')
  }

  function handleCell(ti: number, ci: number) {
    setCellTarget({ tid: t.id, ti, ci })
    openSheet('celda')
  }

  const an = t.analisis
  const statusOk = an?.okObj && an?.dentro5 && an?.rep.length === 0 && an?.cons === 0

  return (
    <div className={`card ${statusOk ? 'ok' : (an ? 'err' : '')} ${isOpen ? 'open' : ''} plan-trab`}>
      <div className="trab-hdr" onClick={() => setIsOpen(!isOpen)}>
        <div className="t-badge">{t.id}</div>
        <div className="t-info">
          <div className="t-name">Trabajadera {t.id}</div>
          <div className="t-meta">
            {nActivos} act. · {t.tramos.length} tramos · Salen {F}
          </div>
        </div>
        <div className="t-chev">▼</div>
      </div>

      <div className="trab-body">
        
        {/* Controles de Tramos y Salidas (Solo Mandos) */}
        {esMando && (
          <div className="mbox">
            <div className="mrow mb3">
              <span className="ml">Total tramos:</span>
              <div className="ctr">
                <button className="ctr-btn" onClick={() => delTramo(t.id, t.tramos.length - 1)} disabled={t.tramos.length <= 1}>−</button>
                <span className="ctr-val">{t.tramos.length}</span>
                <button className="ctr-btn" onClick={() => addTramo(t.id)}>+</button>
              </div>
              <button className="btn btn-ghost btn-sm ml-auto" onClick={() => { setBancoTarget({ tid: t.id, ti: -1 }); openSheet('sugerencia') }}>
                Sugerir óptimo
              </button>
            </div>
            <div className="mrow">
              <span className="ml">Salidas obj:</span>
              <div className="ctr">
                <button className="ctr-btn" onClick={() => setSalidas(t.id, (t.salidas??2)-1)} disabled={(t.salidas??2) <= 1}>−</button>
                <span className="ctr-val">{t.salidas ?? 2}</span>
                <button className="ctr-btn" onClick={() => setSalidas(t.id, (t.salidas??2)+1)}>+</button>
              </div>
            </div>
          </div>
        )}

        {/* El Plan Híbrido */}
        <div className="plan-head">
          <div className="plan-head-info">
            Relevos <br/>
            {hasPins && <span className="locked-count">({pinStatus.d} fijos D, {pinStatus.f} fijos F)</span>}
          </div>
          <div className="plan-legend">
            <div className="leg-item"><div className="leg-dot D"></div> D</div>
            <div className="leg-item"><div className="leg-dot F"></div> F</div>
            <div className="leg-item"><div className="leg-dot L"></div> Auto</div>
          </div>
        </div>

        {erroresPinned.length > 0 && (
          <div className="plan-err mb3">
            <strong>❌ Reglas de fijación rotas:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '.3rem' }}>
              {erroresPinned.map((err: string, i: number) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="plan-scroll">
          <table className="plan-table">
            <thead>
              <tr>
                <th className="col-name">Costalero</th>
                {t.tramos.map((_, ti) => {
                  const esClave = t.tramosClaves?.includes(ti)
                  return (
                    <th 
                      key={ti} 
                      className={`col-tramo ${ti === 0 ? 'es-pri' : ''} ${ti === t.tramos.length - 1 ? 'es-ult' : ''}`}
                      style={esClave ? { backgroundColor: 'rgba(201,168,76,0.1)', borderTop: '2px solid var(--oro)' } : {}}
                    >
                      <div className="flex fc aic g2 cursor-pointer" onClick={() => openBanco(ti)}>
                        <span className="flex aic g1">
                          {esClave ? (
                            <span className="flex aic jcc text-[10px]" style={{ width: '16px', height: '16px', backgroundColor: 'var(--oro)', color: '#000', borderRadius: '50%', boxShadow: '0 0 5px rgba(201,168,76,0.5)' }}>★</span>
                          ) : null}
                          <span style={esClave ? { color: 'var(--oro)', fontWeight: 'bold' } : {}} className="truncate max-w-[60px]" title={t.tramos[ti] || `T${ti+1}`}>
                            {t.tramos[ti] || `T${ti+1}`}
                          </span>
                        </span>
                        <span className="xs toro-o" style={{ textTransform: 'none', fontWeight: 400 }}>✎</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {t.nombres.map((name, ci) => {
                if (t.bajas?.includes(ci)) return null
                
                // Si es costalero, solo ver su propia fila
                if (!esMando) {
                  const nameStr = name.toLowerCase().trim()
                  const isMatch = nameStr.includes(myName) || myName.includes(nameStr) || (myApodo && nameStr.includes(myApodo))
                  if (!isMatch) return null
                }

                return (
                  <tr key={ci}>
                    <td className="td-name">
                      <div className="flex aic jb gap-1">
                        <span className="truncate">{shortName(nameAt(t, ci))}</span>
                        {an && an.conteo[ci] !== undefined && (
                          <span className={`text-[0.65rem] cinzel px-1 rounded-sm whitespace-nowrap font-bold opacity-80 ${
                            an.conteo[ci] === t.obj?.[ci] ? 'text-[var(--oro)]' : 'text-err-tx'
                          }`}>
                            x{an.conteo[ci]}
                          </span>
                        )}
                      </div>
                    </td>
                    {t.tramos.map((_, ti) => {
                      const v = pinned[ti][ci]
                      const r = t.plan?.[ti]
                      let isAutoD = false
                      let isAutoF = false
                      let hasWarn = false
                      let hasCons = false
                      
                      if (r) {
                        isAutoD = v === 'L' && r.dentro.includes(ci)
                        isAutoF = (v === 'L' || v === 'LF') && r.fuera.includes(ci)
                        if (r.fuera.includes(ci)) {
                          if (an?.rep.includes(ci) && ti === t.tramos.length - 1) hasWarn = true
                          if (ti > 0 && t.plan?.[ti-1]?.fuera.includes(ci)) hasCons = true
                        }
                      }
                      
                      const clsMap = {
                        'L': isAutoD ? 'd' : isAutoF ? 'f' : 'L',
                        'D': 'D',
                        'F': 'F',
                        'LF': isAutoF ? 'f' : 'LF',
                      }
                      let cls = clsMap[v]
                      if (hasWarn) cls += ' warn-v'
                      if (hasCons && !hasWarn) cls += ' cons-v'

                      const lbl = v === 'L' ? (isAutoD ? 'D' : isAutoF ? 'F' : '·') 
                                : v === 'D' ? 'D' : v === 'F' ? 'F' 
                                : (isAutoF ? 'F' : '⚡')

                      return (
                        <td key={ti}>
                          <div className={`pcell ${cls}`} onClick={() => esMando && handleCell(ti, ci)}>
                            {lbl}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Acciones (Solo Mandos) */}
        {esMando && (
          <div className="plan-actions flex gap-2">
            <button 
              className="btn btn-oro f1" 
              onClick={() => hasPins ? completarPlan(t.id) : calcularTrab(t.id)}
              disabled={erroresPinned.length > 0}
              style={{ opacity: erroresPinned.length ? 0.5 : 1 }}
            >
              {hasPins ? '🪄 Completar' : '⚙ Calcular Auto'}
            </button>
            
            <button 
              className="btn btn-out f1"
              style={{ borderColor: 'var(--oro)', color: 'var(--oro)' }}
              onClick={() => sugerirYCalcular(t.id)}
              title="Sugerir asignación basada en puntuaciones y tramos clave"
            >
              💡 Sugerir Asig.
            </button>

            {t.plan && (
              <button 
                className="btn btn-icon" 
                style={{ border: '1px solid var(--border)', flexShrink: 0 }}
                onClick={() => limpiarPlan(t.id)} 
                title="Limpiar plan actual"
              >
                🧹
              </button>
            )}

            {hasPins && (
              <button className="btn btn-icon" style={{ border: '1px solid var(--err-bd)', color: 'var(--err-tx)', flexShrink: 0 }} onClick={() => quitarBloqueos(t.id)} title="Quitar fijados">
                ×
              </button>
            )}
          </div>
        )}

        {/* Resultados */}
        {an && (
          <div className={`mt3 ${statusOk ? 'plan-ok' : 'plan-err'}`}>
            <div style={{ fontWeight: 700, marginBottom: '.3rem' }}>
              {statusOk ? '✓ Plan Correcto' : '⚠ Hay problemas en el plan'}
            </div>
            {!an.okObj && <div>• Desequilibrio en las salidas.</div>}
            {!an.dentro5 && <div>• Algún tramo no tiene 5 costaleros dentro.</div>}
            {an.rep.length > 0 && <div>• {an.rep.length} costalero(s) repiten primero y último.</div>}
            {an.cons > 0 && <div>• Hay salidas consecutivas.</div>}
          </div>
        )}

      </div>
    </div>
  )
}
