'use client'

import { useState, useEffect } from 'react'
import { useEstado } from '@/hooks/useEstado'
import { nameAt } from '@/lib/nombres'
import { estructuraPaso, getRol, rolLabel } from '@/lib/roles'
import type { RolCode, SwapState, Trabajadera } from '@/lib/types'

export default function SwapSheet() {
  const { S, activeSheet, closeSheet, swapSel, setSwapSel, confirmarSwap } = useEstado()
  const [forzar, setForzar] = useState(false)
  const isOpen = activeSheet === 'swap' && swapSel != null && 'a' in swapSel

  useEffect(() => {
    if (!isOpen) setForzar(false)
  }, [isOpen])

  if (!swapSel || !('a' in swapSel) || !('b' in swapSel)) {
    return (
      <>
        <div className={`bso${activeSheet === 'swap' ? ' open' : ''}`} onClick={closeSheet} />
        <div className={`bss${activeSheet === 'swap' ? ' open' : ''}`} />
      </>
    )
  }

  const ws = swapSel as SwapState
  const { a, b, ambosD } = ws
  const t = S.trabajaderas.find((x: Trabajadera) => x.id === a.tid)!
  const estructura = estructuraPaso(t.id)

  function validarRol(ci: number, rolNuevo: RolCode | null): { ok: boolean; msg: string } {
    if (rolNuevo === null) return { ok: true, msg: 'Descansa fuera' }
    const r = getRol(t, ci)
    if (r.pri === rolNuevo) return { ok: true, msg: '✓ Rol principal' }
    if (r.sec === rolNuevo) return { ok: true, msg: '✓ Rol secundario' }
    return { ok: false, msg: `No tiene ${rolLabel(rolNuevo, t.id)} en su repertorio` }
  }

  const rolActualA = a.esDentro ? (a.posIdx !== null ? estructura[a.posIdx] : null) : null
  const rolActualB = b.esDentro ? (b.posIdx !== null ? estructura[b.posIdx] : null) : null

  let rolNuevoA: RolCode | null, rolNuevoB: RolCode | null
  if (ambosD) {
    rolNuevoA = b.posIdx !== null ? estructura[b.posIdx] : null
    rolNuevoB = a.posIdx !== null ? estructura[a.posIdx] : null
  } else {
    const selD = a.esDentro ? a : b
    if (a.esDentro) {
      rolNuevoA = null
      rolNuevoB = selD.posIdx !== null ? estructura[selD.posIdx] : null
    } else {
      rolNuevoA = selD.posIdx !== null ? estructura[selD.posIdx] : null
      rolNuevoB = null
    }
  }

  const valA = validarRol(a.ci, rolNuevoA)
  const valB = validarRol(b.ci, rolNuevoB)
  
  const compatible = valA.ok && valB.ok
  const canConfirm = compatible || forzar

  const validMsg = compatible
    ? '✓ Intercambio válido — ambos cumplen sus roles'
    : `⚠ Incompatibilidad de roles: ${[
        !valA.ok ? `${nameAt(t, a.ci)} no es ${rolLabel(rolNuevoA!, t.id)}` : '',
        !valB.ok ? `${nameAt(t, b.ci)} no es ${rolLabel(rolNuevoB!, t.id)}` : '',
      ].filter(Boolean).join(' · ')}`

  function SwapCard({ ci, rolActual, rolNuevo, val, esDentro, rolClass }: {
    ci: number; rolActual: RolCode | null; rolNuevo: RolCode | null
    val: { ok: boolean; msg: string }; esDentro: boolean; rolClass: string
  }) {
    const nombre = nameAt(t, ci)
    return (
      <div className={`swap-card ${rolClass}`}>
        <div className="swap-card-name">{nombre}</div>
        <div className="swap-card-rol">{esDentro ? (rolActual ?? 'Dentro') : 'Fuera'}</div>
        <div className={`swap-card-new ${val.ok ? 'ok' : 'err'}`}>
          {rolNuevo ? `→ ${rolLabel(rolNuevo, t.id)}` : '→ Fuera'}
        </div>
        <div className={`swap-card-new ${val.ok ? 'ok' : 'err'}`} style={{ fontSize: '.55rem' }}>
          {val.msg}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`bso${isOpen ? ' open' : ''}`} onClick={() => { setSwapSel(null); closeSheet() }} />
      <div className={`bss${isOpen ? ' open' : ''}`}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">
            🔄 {ambosD ? 'Cambio de posición' : 'Cambio dentro/fuera'} — T{t.id} · Tramo {a.ti + 1}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSwapSel(null); closeSheet() }}>✕</button>
        </div>
        <div className="bs-body">
          <div className="swap-preview">
            <SwapCard
              ci={a.ci} rolActual={rolActualA} rolNuevo={rolNuevoA}
              val={valA} esDentro={a.esDentro}
              rolClass={rolActualA ?? rolNuevoA ?? 'COR'}
            />
            <div className="swap-arrow">⇄</div>
            <SwapCard
              ci={b.ci} rolActual={rolActualB} rolNuevo={rolNuevoB}
              val={valB} esDentro={b.esDentro}
              rolClass={rolActualB ?? rolNuevoB ?? 'COR'}
            />
          </div>
          <div className={`swap-validacion ${compatible ? 'ok' : 'warn'}`}>
            {validMsg}
            {!compatible && (
              <label className="flex items-center gap-2 mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded cursor-pointer">
                <input type="checkbox" checked={forzar} onChange={e => setForzar(e.target.checked)} className="w-4 h-4" />
                <span className="text-[0.7rem] font-bold text-red-100">Confirmar cambio manual (fuera de rol)</span>
              </label>
            )}
          </div>
        </div>
        <div className="swap-actions">
          <button
            className="btn btn-oro f1"
            disabled={!canConfirm}
            style={{ opacity: canConfirm ? 1 : 0.4 }}
            onClick={() => { confirmarSwap(ws); closeSheet() }}
          >✓ Confirmar</button>
          <button className="btn btn-ghost" onClick={() => { setSwapSel(null); closeSheet() }}>Cancelar</button>
        </div>
      </div>
    </>
  )
}
