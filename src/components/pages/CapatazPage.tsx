'use client'

import React from 'react'
import { useEstado } from '../../hooks/useEstado'
import { getRol, estructuraPaso, getDentroFisico, esRolHabitual } from '@/lib/roles'
import { shortName, nameAt } from '@/lib/nombres'
import type { Trabajadera, SwapState, SwapTarget, RolCode } from '@/lib/types'

export default function CapatazPage() {
  const { S, calcularTodo, openSheet } = useEstado()
  
  const conPlan = S.trabajaderas.filter((t: Trabajadera) => t.plan && t.analisis)
  if (!conPlan.length) {
    return (
      <>
        <div className="sec">Hoja del Capataz</div>
        <div className="alert warn">
          ⚠ Aún no hay rotaciones calculadas. Ve a la pestaña &quot;Plan&quot; y calcula las rotaciones primero.
        </div>
        <button className="btn btn-oro" onClick={calcularTodo}>
          ⚙ Calcular Todos Automáticamente
        </button>
      </>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="sec mb-0">Hoja del Capataz</div>
        <button className="btn btn-out btn-sm" onClick={() => openSheet('relevos')}>
          📋 Exportar PDF / Relevos
        </button>
      </div>
      {conPlan.map((t: Trabajadera) => (
        <CapatazTrabajadera key={t.id} t={t} />
      ))}
    </>
  )
}

function CapatazTrabajadera({ t }: { t: Trabajadera }) {
  const { setSwapSel, swapSel, openSheet } = useEstado()
  
  // swapSel local para saber si estamos interactuando con esta trabajadera
  const localSwapSel = swapSel?.a?.tid === t.id ? swapSel as SwapState : null

  function handleTapPill(target: SwapTarget, e: React.MouseEvent) {
    e.stopPropagation()
    const r = t.plan![target.ti]
    const dentroFisico = getDentroFisico(t, r)
    const dt = localSwapSel

    if (!dt || !('a' in dt)) {
      setSwapSel({ a: target })
      return
    }

    if (dt.a?.ti === target.ti && dt.a.ci === target.ci) {
      setSwapSel(null)
      return
    }

    if (dt.a?.ti !== target.ti) {
      setSwapSel({ a: target })
      return
    }

    const { a } = dt
    const b = target
    const ambosD = a.esDentro && b.esDentro
    const ambosF = a.esFuera && b.esFuera
    if (ambosF) {
      setSwapSel(null)
      return
    }

    const dFisicoNext = [...dentroFisico]
    const fueraNext = [...r.fuera]

    if (ambosD && a.posIdx !== null && b.posIdx !== null) {
      dFisicoNext[a.posIdx] = b.ci
      dFisicoNext[b.posIdx] = a.ci
    } else {
      const selD = a.esDentro ? a : b
      const selF = a.esDentro ? b : a
      if (selD.posIdx !== null) dFisicoNext[selD.posIdx] = selF.ci
      const idxF = fueraNext.indexOf(selF.ci)
      if (idxF !== -1) fueraNext[idxF] = selD.ci
    }

    setSwapSel({
      a, b,
      ambosD,
      nuevoDentroF: dFisicoNext,
      nuevoFuera: fueraNext.sort((x, y) => x - y),
      todoOk: true // Verificación real se hace en la hoja
    })
    openSheet('swap')
  }

  function getTapClass(target: SwapTarget) {
    if (!localSwapSel || !('a' in localSwapSel)) return 'tap-target'
    if (localSwapSel.a?.ti !== target.ti) return 'tap-target'
    if (localSwapSel.a?.ci === target.ci) return 'sel-swap'
    if (localSwapSel.a?.esFuera && target.esFuera) return ''
    return 'tap-target'
  }

  const est = estructuraPaso(t.id)

  return (
    <div className="card mb4" onClick={() => { if (localSwapSel) setSwapSel(null) }}>
      <div className="trab-hdr">
        <div className="t-badge">{t.id}</div>
        <div className="t-info">
          <div className="t-name">Trabajadera {t.id}</div>
          <div className="t-meta">{t.tramos.length} tramos</div>
        </div>
      </div>
      
      <div className="trab-body fc g3" style={{ display: 'flex' }}>
        {t.tramos.map((nombre: string, ti: number) => {
          const r = t.plan![ti]
          const dentroFisico = getDentroFisico(t, r)
          const isSwapTargetRow = localSwapSel && 'a' in localSwapSel && localSwapSel.a?.ti === ti

          return (
            <div key={ti} className="mb3">
              <div className="sec" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '.75rem', marginBottom: '.4rem' }}>
                <span className="cinzel toro mr2" style={{ opacity: 0.8 }}>T{ti+1}</span> {nombre}
              </div>
              
              {/* Dentro */}
              <div className="paso-row" style={{ opacity: localSwapSel && !isSwapTargetRow ? 0.3 : 1, transition: 'opacity 0.2s' }}>
                {est.map((rol: RolCode, posIdx: number) => {
                  const ci = dentroFisico[posIdx] ?? null
                  const isPri = ci !== null ? getRol(t, ci).pri === rol : false
                  const estrella = isPri ? '★' : '●'
                  const tClass = ci !== null ? getTapClass({ tid: t.id, ti, ci, esDentro: true, esFuera: false, posIdx, rolSlot: rol }) : ''

                  return (
                    <React.Fragment key={posIdx}>
                      <div className="paso-slot">
                        <div className="paso-pos-label">{rol}</div>
                        {ci !== null ? (
                          <div 
                            className={`paso-pill ${rol} ${tClass} relative`}
                            onClick={e => handleTapPill({ tid: t.id, ti, ci, esDentro: true, esFuera: false, posIdx, rolSlot: rol }, e)}
                          >
                            {!esRolHabitual(t, ci, rol) && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 border border-white" title="Fuera de rol habitual" />
                            )}
                            <span className="paso-pill-star inline-block text-[0.65rem] leading-none mb-0.5">{estrella}</span>
                            <span className="paso-pill-name block text-[0.75rem] whitespace-nowrap overflow-hidden text-ellipsis max-w-[56px]">{shortName(nameAt(t, ci))}</span>
                          </div>
                        ) : (
                          <div className="paso-pill vacio">Hueco</div>
                        )}
                      </div>
                      {posIdx === 1 && <div className="paso-sep"></div>}
                      {posIdx === 2 && <div className="paso-sep"></div>}
                    </React.Fragment>
                  )
                })}
              </div>

              {/* Fuera */}
              <div className="fuera-row" style={{ opacity: localSwapSel && !isSwapTargetRow ? 0.3 : 1, transition: 'opacity 0.2s' }}>
                <div className="fuera-label">Fuera</div>
                {r.fuera.map((ci: number) => {
                  const rolX = getRol(t, ci)
                  const stF = (rolX.pri === 'PAT' || rolX.pri === 'COS') ? 'PAT'
                            : rolX.pri === 'FIJ' ? 'FIJ' : 'COR'
                  
                  const isRep = ti === t.tramos.length - 1 && t.plan![0].fuera.includes(ci)
                  const isCons = ti > 0 && t.plan![ti-1].fuera.includes(ci)

                  const cf = isRep ? 'f rep' : isCons ? 'f cons' : 'f'
                  const tClass = getTapClass({ tid: t.id, ti, ci, esDentro: false, esFuera: true, posIdx: null, rolSlot: null })

                  return (
                    <div 
                      key={ci} 
                      className={`cp rol-${stF} ${cf} ${tClass} relative`}
                      onClick={e => handleTapPill({ tid: t.id, ti, ci, esDentro: false, esFuera: true, posIdx: null, rolSlot: null }, e)}
                    >
                      {shortName(nameAt(t, ci))} {isRep ? '⚠' : ''}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
