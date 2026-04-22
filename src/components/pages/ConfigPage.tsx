'use client'

import React, { useState } from 'react'
import { useEstado } from '@/hooks/useEstado'
import type { Trabajadera } from '@/lib/types'
import { tramosOptimos } from '@/lib/algoritmos'
import { shortName, pillName } from '@/lib/nombres'

export default function ConfigPage() {
  const { S, addBanco, delBanco, calcularTodo, resetTodo } = useEstado()
  const [bancoInp, setBancoInp] = useState('')

  function handleAddBanco() {
    const val = bancoInp.trim()
    if (!val) return
    addBanco(val)
    setBancoInp('')
  }

  function handleReset() {
    if (confirm('⚠ ATENCIÓN: Esta acción borrará TODO el plan actual, todos los costaleros, roles, tramos y estadísticas de este Paso.\n\n¿Estás completamente seguro de que quieres empezar desde cero?')) {
      resetTodo()
    }
  }

  return (
    <div className="pb-8">
      {/* Banco de Nombres */}
      <div className="spanel mb4">
        <div className="sec">✦ Banco de Nombres</div>
        <div className="banco-tags mb3 flex flex-wrap gap-2">
          {S.banco.map((n: string, i: number) => (
            <div key={i} className="banco-tag">
              <span>{n}</span>
              <span className="bdel" onClick={() => delBanco(i)}>✕</span>
            </div>
          ))}
        </div>
        <div className="flex g2">
          <input 
            className="inp f1" 
            placeholder="Nuevo nombre de tramo…" 
            maxLength={50}
            value={bancoInp}
            onChange={e => setBancoInp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddBanco()}
          />
          <button className="btn btn-out btn-sm" onClick={handleAddBanco}>+ Añadir</button>
        </div>
      </div>

      {/* Trabajaderas */}
      <div className="sec">✦ Trabajaderas</div>
      <p className="sm tcre-o mb3" style={{ lineHeight: 1.6 }}>
        <span className="tok">① 5 dentro siempre</span> · 
        <span style={{ color: 'var(--oro-c)' }}> ② Salidas equitativas</span> · 
        <span className="terr"> ③ Sin repetir 1º/último</span>
      </p>

      <div id="trab-list">
        {S.trabajaderas.map((t: Trabajadera) => (
          <ConfigTrabajadera key={t.id} t={t} />
        ))}
      </div>

      <div className="btn-row mt4">
        <button className="btn btn-oro f1 w100" onClick={calcularTodo}>⚙ Calcular Todas</button>
        <button className="btn btn-danger w100" onClick={handleReset}>↺ Reset</button>
      </div>
    </div>
  )
}

function ConfigTrabajadera({ t }: { t: Trabajadera }) {
  const { 
    setSalidas, addTramo, delTramo, setNombreTramo, 
    setBancoTarget, openSheet, calcularTrab,
    toggleTramoClave,
  } = useEstado()
  
  const [isOpen, setIsOpen] = useState(false)

  const total = t.nombres.length
  const nBajas = t.bajas?.length || 0
  const totalActivos = total - nBajas
  const F = t.regla5costaleros && total === 5 ? 1 : total - 5
  
  const salidas = t.salidas ?? 2
  const nOpt = tramosOptimos(totalActivos, salidas)
  const nAct = t.tramos.length
  const hayPlan = !!t.plan
  const an = t.analisis

  // Status computation (similar to original trabHTML logic)
  let stCls = ''
  let stTxt = ''
  let cardCls = ''
  if (!hayPlan) { stCls = 'pend'; stTxt = 'Pendiente'; cardCls = '' }
  else if (!an?.dentro5 || !an.okObj) { stCls = 'err'; stTxt = '✗ Error'; cardCls = 'err' }
  else if (an.rep.length > 0) { stCls = 'warn'; stTxt = `⚠ ${an.rep.length} repite`; cardCls = 'warn' }
  else { stCls = 'ok'; stTxt = '✓ OK'; cardCls = 'ok' }

  const objV = t.obj ? Object.values(t.obj) : []
  const minS = objV.length ? Math.min(...objV) : salidas
  const maxS = objV.length ? Math.max(...objV) : salidas
  const extC = objV.filter(v => v === maxS).length
  const salDesc = minS === maxS ? `${minS} sal./cost.` : `${minS}-${maxS} sal. (${extC} con ${maxS})`

  // Move array elements logic locally
  function moveTramo(ti: number, offset: number) {
    if (ti + offset < 0 || ti + offset >= t.tramos.length) return
    const arr = [...t.tramos]
    const temp = arr[ti]
    arr[ti] = arr[ti + offset]
    arr[ti + offset] = temp
    // Modifying through a simple array update wrapper trick or simply set names 
    setNombreTramo(t.id, ti, arr[ti])
    setNombreTramo(t.id, ti + offset, arr[ti + offset])
  }

  function openSug() {
    setBancoTarget({ tid: t.id, ti: -1 })
    openSheet('sugerencia')
  }

  function openBnc(ti: number) {
    setBancoTarget({ tid: t.id, ti })
    openSheet('banco')
  }

  return (
    <div className={`card ${cardCls} ${isOpen ? 'open' : ''} mb-4`}>
      <div className="trab-hdr" onClick={() => setIsOpen(!isOpen)}>
        <div className="t-badge">{t.id}</div>
        <div className="t-info">
          <div className="t-name">Trabajadera {t.id}</div>
          <div className="t-meta">{totalActivos} cost. · {F} fuera/tramo · {salDesc}</div>
        </div>
        <span className={`badge ${stCls}`}>{stTxt}</span>
        <span className="t-chev">▼</span>
      </div>
      
      <div className="trab-body">
        <div className="flex g4 fw mb3">
          <div className="fc" style={{ gap: '.18rem' }}>
            <span className="xs toro-o cinzel uppercase" style={{ letterSpacing: '.05em' }}>Salidas objetivo</span>
            <div className="ctr">
              <button className="ctr-btn" onClick={() => setSalidas(t.id, salidas - 1)} disabled={salidas <= 1}>−</button>
              <div className="ctr-val">{salidas}</div>
              <button className="ctr-btn" onClick={() => setSalidas(t.id, salidas + 1)}>+</button>
            </div>
          </div>
        </div>

        <div className="mbox">
          <div className="mrow">
            <span className="ml">Costaleros:</span><span className="mv">{totalActivos}</span><span className="ms">·</span>
            <span className="ml">Fuera/tramo:</span><span className="mv">{F}</span><span className="ms">·</span>
            <span className="ml">Salidas obj.:</span><span className="mv mok">{salidas}</span><span className="ms">·</span>
            <span className="ml">Tramos ópt.:</span><span className="mv mok">{nOpt}</span>
            {nAct !== nOpt && <span className="mw">← ahora {nAct}</span>}
          </div>
        </div>

        <div className="xs toro-o cinzel uppercase mb3" style={{ letterSpacing: '.06em' }}>Tramos del ciclo</div>
        
        <div className="tramos-list">
          {t.tramos.map((nombre, ti) => {
            const esPri = ti === 0
            const esUlt = ti === nAct - 1
            const tagHtml = esPri ? <span className="tr-tag p">1º</span> : (esUlt ? <span className="tr-tag u">Últ</span> : <span className="tr-sp"></span>)
            
            return (
              <div key={ti} className="tr-wrap">
                <div className="tr-row">
                  <span className="tr-num">{ti + 1}</span>{tagHtml}
                  <input 
                    className={`inp f1 ${esPri ? 'primero' : esUlt ? 'ultimo' : ''}`}
                    style={{ 
                      height: '40px', minHeight: '40px',
                      ...(t.tramosClaves?.includes(ti) ? { borderColor: 'var(--oro)', backgroundColor: 'rgba(201,168,76,0.08)', color: 'var(--oro)' } : {})
                    }}
                    value={nombre}
                    onChange={(e) => setNombreTramo(t.id, ti, e.target.value)}
                  />
                  <button 
                    className={`btn btn-icon btn-sm ${t.tramosClaves?.includes(ti) ? 'text-black shadow-[0_0_8px_rgba(201,168,76,0.5)]' : 'btn-ghost text-cre-o'}`}
                    style={t.tramosClaves?.includes(ti) ? { backgroundColor: 'var(--oro)' } : {}}
                    onClick={() => toggleTramoClave(t.id, ti)}
                    title={t.tramosClaves?.includes(ti) ? 'Quitar tramo clave' : 'Marcar como tramo clave'}
                  >
                    {t.tramosClaves?.includes(ti) ? '★' : '☆'}
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openBnc(ti)}>📋</button>
                  <button className="btn btn-ghost btn-icon btn-sm" disabled={esPri} onClick={() => moveTramo(ti, -1)}>↑</button>
                  <button className="btn btn-ghost btn-icon btn-sm" disabled={esUlt} onClick={() => moveTramo(ti, +1)}>↓</button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => delTramo(t.id, ti)} disabled={nAct <= 1}>✕</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="btn-row mt3 overflow-x-auto flex-wrap">
          <button className="btn btn-ghost btn-sm flex-1 min-w-[100px]" onClick={() => addTramo(t.id)}>+ Tramo</button>
          <button className="btn btn-out btn-sm flex-1 min-w-[100px]" onClick={openSug}>📐 Sugerir</button>
          <button className="btn btn-oro btn-sm flex-1 min-w-[100px]" onClick={() => calcularTrab(t.id)}>⚙ Calcular</button>
        </div>

        {hayPlan && an && (
          <div className="mt4">
            <div className="xs toro-o cinzel mb3 uppercase" style={{ letterSpacing: '.06em', marginTop: '.7rem' }}>
              Salidas por costalero
            </div>
            <div className="sal-chips flex flex-wrap gap-1 mb3">
              {t.nombres.map((nombre, i) => {
                const v = an.conteo[i] ?? 0
                const esp = t.obj?.[i] ?? 0
                const cls = v === esp ? (v === minS ? 'ok' : 'hi') : 'bad'
                return (
                  <div key={i} className={`sc flex flex-col items-center gap-px px-2 py-1 rounded border text-center ${cls}`}>
                    <div className="n text-[0.65rem] font-bold max-w-[60px] truncate whitespace-nowrap overflow-hidden">
                      {shortName(nombre)}
                    </div>
                    <div className="v text-[0.72rem] font-black cinzel">
                      {v}✕
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="frontera flex flex-wrap gap-2 items-center px-3 py-2 rounded-md bg-[rgba(201,168,76,0.04)] border border-[rgba(201,168,76,0.12)] mb3">
              {an.rep.length === 0 ? (
                <span className="fv ok bg-ok-bg border border-ok-bd text-ok-tx text-[0.58rem] px-2 py-0.5 rounded-full cinzel">✓ Sin repetidores</span>
              ) : (
                <span className="fv warn bg-err-bg border border-err-bd text-err-tx text-[0.58rem] px-2 py-0.5 rounded-full cinzel">⚠ {an.rep.map(i => pillName(t, i)).join(', ')}</span>
              )}
              <span className="fl text-[0.55rem] text-oro-o tracking-wider cinzel uppercase ml-1">CONSEC.:</span>
              {an.cons === 0 ? (
                <span className="fv ok bg-ok-bg border border-ok-bd text-ok-tx text-[0.58rem] px-2 py-0.5 rounded-full cinzel">✓ Sin consec.</span>
              ) : (
                <span className="fv warn bg-err-bg border border-err-bd text-err-tx text-[0.58rem] px-2 py-0.5 rounded-full cinzel">⚠ {an.cons} consec.</span>
              )}
            </div>

            <div className="rot-wrap overflow-x-auto mt-2">
              <table className="w-full text-[0.82rem] border-collapse">
                <thead>
                  <tr>
                    <th className="thl text-left cinzel text-[0.57rem] tracking-wider uppercase text-oro bg-neg-m px-1.5 py-1.5 border border-[rgba(201,168,76,0.12)]">Tramo</th>
                    <th className="cinzel text-[0.57rem] tracking-wider uppercase text-oro bg-neg-m px-1.5 py-1.5 border border-[rgba(201,168,76,0.12)] text-center">Dentro</th>
                    <th className="cinzel text-[0.57rem] tracking-wider uppercase text-oro bg-neg-m px-1.5 py-1.5 border border-[rgba(201,168,76,0.12)] text-center">Fuera</th>
                  </tr>
                </thead>
                <tbody>
                  {t.tramos.map((nombre, ti) => {
                    const r = t.plan![ti] || { dentro: [], fuera: [] }
                    const esPri = ti === 0
                    const esUlt = ti === nAct - 1
                    return (
                      <tr key={ti} className="odd:bg-transparent even:bg-[rgba(201,168,76,0.02)]">
                        <td className={`td-n px-1.5 py-1 whitespace-nowrap border border-[rgba(201,168,76,0.07)] text-left ${esPri ? 'text-ok-tx' : (esUlt ? 'text-err-tx' : 'text-cre-o')}`}>
                          {ti + 1}. {nombre}{esPri ? ' 🟢' : (esUlt ? ' 🔴' : '')}
                        </td>
                        <td className="px-1.5 py-1 border border-[rgba(201,168,76,0.07)]">
                          <div className="cell-pills flex flex-wrap gap-1 justify-center">
                            {r.dentro.map(i => (
                              <span key={i} className="cp d bg-[rgba(26,92,42,0.5)] border border-[rgba(39,174,96,0.5)] text-ok-tx px-2 py-0.5 rounded text-[0.72rem] font-bold max-w-[90px] truncate">
                                {pillName(t, i)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-1.5 py-1 border border-[rgba(201,168,76,0.07)]">
                          <div className="cell-pills flex flex-wrap gap-1 justify-center">
                            {r.fuera.map(i => {
                              const isRep = esUlt && an.primer.includes(i)
                              return (
                                <span key={i} className={`cp f px-2 py-0.5 rounded text-[0.72rem] font-bold max-w-[90px] truncate ${isRep ? 'rep bg-[rgba(139,26,26,0.85)] border border-[rgba(255,80,80,0.7)] text-[#ff9090] shadow-[0_0_4px_rgba(255,80,80,0.3)]' : 'bg-[rgba(139,26,26,0.4)] border border-[rgba(192,57,43,0.45)] text-err-tx'}`}>
                                  {pillName(t, i)}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
