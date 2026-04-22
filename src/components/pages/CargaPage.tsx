'use client'

import { useEstado } from '@/hooks/useEstado'
import { getFueraPorTramo } from '@/lib/algoritmos'
import type { Trabajadera } from '@/lib/types'
import { nameAt, shortName } from '@/lib/nombres'

export default function CargaPage() {
  const { S, openEqs, toggleEq, calcularTodo } = useEstado()
  
  const conPlan = S.trabajaderas.filter((t: Trabajadera) => t.plan && t.analisis)
  if (!conPlan.length) {
    return (
      <>
        <div className="sec">Carga y Salidas</div>
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
      <div className="sec">Carga y Salidas</div>
      {conPlan.map((t: Trabajadera) => (
        <CargaTrabajadera
          key={t.id}
          t={t}
          isOpen={openEqs.has(t.id)}
          onToggle={() => toggleEq(t.id)}
        />
      ))}
    </>
  )
}

function CargaTrabajadera({ t, isOpen, onToggle }: { t: Trabajadera; isOpen: boolean; onToggle: () => void }) {
  const nBajas = t.bajas?.length ?? 0
  const total = t.nombres.length - nBajas
  const F = getFueraPorTramo(t)
  const plazas = t.tramos.length * F
  const an = t.analisis!

  // Calcular métricas
  const repiten = an.rep.length
  const cons = an.cons
  const esRegla5 = t.regla5costaleros && t.nombres.length === 5

  const objV = Object.values(t.obj!)
  const minS = Math.min(...objV)
  const maxS = Math.max(...objV)
  const distOk = an.okObj
  const objMsg = minS === maxS 
    ? `${minS} salidas todos`
    : `${minS} sal. para ${total - objV.filter(x => x === maxS).length} · ${maxS} sal. para ${objV.filter(x => x === maxS).length}`

  return (
    <div className={`card ${isOpen ? 'open' : ''} res-trab`}>
      <div className="trab-hdr" onClick={onToggle}>
        <div className="t-badge">{t.id}</div>
        <div className="t-info">
          <div className="t-name">Trabajadera {t.id}</div>
          <div className="t-meta">
            {total} act. · {distOk ? '✓ Equilibrado' : '⚠ Desequilibrado'}
          </div>
        </div>
        <div className="t-chev">▼</div>
      </div>
      
      <div className="trab-body fc g3">
        
        {/* Chips de métricas */}
        <div className="sal-chips">
          <div className={`sc ${distOk ? 'ok' : 'bad'}`}>
            <span className="n">Reparto</span>
            <span className="v">{distOk ? 'OK' : '⚠'}</span>
          </div>
          <div className={`sc ${repiten === 0 ? 'ok' : 'hi'}`}>
            <span className="n">1º = Últ.</span>
            <span className="v">{repiten}</span>
          </div>
          <div className={`sc ${cons === 0 ? 'ok' : 'bad'}`}>
            <span className="n">Consecs</span>
            <span className="v">{cons}</span>
          </div>
          <div className={`sc ${esRegla5 ? 'hi' : 'ok'}`}>
            <span className="n">Reglas</span>
            <span className="v">{esRegla5 ? '5C' : 'Norm'}</span>
          </div>
          <div className="sc">
            <span className="n">Total</span>
            <span className="v">{plazas}</span>
          </div>
        </div>

        <div className="alert warn" style={{ background: 'rgba(201,168,76,.05)', borderColor: 'rgba(201,168,76,.2)', color: 'var(--cre)', marginBottom: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--oro)' }}>Objetivo matemático:</div>
          {objMsg} (Total {plazas} plazas de descanso en {t.tramos.length} tramos)
        </div>

        <div className="bars-row mt3">
          {t.nombres.map((_: string, ci: number) => {
            if (t.bajas?.includes(ci)) return null
            const obj = t.obj![ci] ?? 0
            const rea = an.conteo[ci] ?? 0
            const pct = Math.min((rea / Math.max(obj, rea)) * 100, 100)
            const isOk = rea === obj
            const isHi = rea > obj
            
            return (
              <div key={ci} className="bar-item">
                <div className="bar-out">
                  <div 
                    className={`bar-in ${isOk ? 'ok' : isHi ? 'hi' : 'bad'}`} 
                    style={{ height: `${pct}%` }} 
                  />
                </div>
                <div className="bar-v">{rea}</div>
                <div className="bar-n">{shortName(nameAt(t, ci))}</div>
              </div>
            )
          })}
        </div>

        {/* Tabla cruda */}
        <div className="rot-wrap">
          <table>
            <thead>
              <tr>
                <th className="thl">Costalero</th>
                <th title="Salidas objetivo">Obj</th>
                <th title="Salidas reales">Real</th>
                <th>1º/Últ</th>
                <th>Cons</th>
              </tr>
            </thead>
            <tbody>
              {t.nombres.map((_: string, ci: number) => {
                if (t.bajas?.includes(ci)) return null
                const isRep = an.rep.includes(ci)
                let cV = 0
                for (let ti = 1; ti < t.plan!.length; ti++) {
                  if (t.plan![ti].fuera.includes(ci) && t.plan![ti-1].fuera.includes(ci)) cV++
                }

                return (
                  <tr key={ci}>
                    <td className="td-n">{shortName(nameAt(t, ci))}</td>
                    <td>{t.obj![ci]}</td>
                    <td className={`cinzel toro ${an.conteo[ci] === t.obj![ci] ? 'tok' : 'terr'}`} style={{ fontWeight: 700 }}>
                      {an.conteo[ci]}
                    </td>
                    <td className={isRep ? 'td-n u' : 'td-n'}>{isRep ? 'Sí' : '—'}</td>
                    <td className={cV > 0 ? 'td-n u' : 'td-n'}>{cV > 0 ? cV : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
