'use client'

import { useEstado } from '@/hooks/useEstado'
import { getFueraPorTramo } from '@/lib/algoritmos'
import type { Trabajadera } from '@/lib/types'
import { nameAt, shortName } from '@/lib/nombres'
import { getRol } from '@/lib/roles'

export default function CargaPage() {
  const { S, openEqs, toggleEq, calcularTodo, censusHeights } = useEstado()
  
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
      <div className="sec">Carga y Análisis</div>
      
      <HeightAnalysis trabajaderas={S.trabajaderas} censusHeights={censusHeights} />

      <div className="sec mt6">Carga y Salidas</div>
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
function HeightAnalysis({ trabajaderas, censusHeights }: { trabajaderas: Trabajadera[], censusHeights: Record<string, number> }) {
  // Prioridad de altura esperada por rol: 1=más alto, 3=más bajo
  const ROL_PRIO: Record<string, number> = { PAT: 1, COS: 1, FIJ: 2, COR: 3 }
  const ROL_COLOR: Record<string, { bg: string; border: string; text: string }> = {
    PAT: { bg: 'rgba(139,26,26,0.35)', border: 'rgba(192,57,43,0.7)', text: '#ffc0c0' },
    COS: { bg: 'rgba(139,26,26,0.35)', border: 'rgba(192,57,43,0.7)', text: '#ffc0c0' },
    FIJ: { bg: 'rgba(180,100,0,0.35)', border: 'rgba(230,140,20,0.7)', text: '#ffe082' },
    COR: { bg: 'rgba(26,92,42,0.35)', border: 'rgba(39,174,96,0.6)', text: '#7dcea0' },
  }

  const data = trabajaderas.map(t => {
    const isBaja = (i: number) => t.bajas?.includes(i)
    const entries = t.nombres.map((n: string, idx: number) => {
      const rol = getRol(t, idx).pri
      return {
        idx,
        nombre: n.trim(),
        baja: isBaja(idx),
        altura: (!isBaja(idx) && censusHeights[n.trim()]) ? censusHeights[n.trim()] : null,
        rol,
        rolPrio: ROL_PRIO[rol] ?? 3,
      }
    })

    const activos = entries.filter(e => !e.baja)
    const conAltura = activos.filter(e => e.altura !== null).map(e => e.altura as number)
    const maxH = conAltura.length > 0 ? Math.max(...conAltura) : null
    const minH = conAltura.length > 0 ? Math.min(...conAltura) : null
    const media = conAltura.length > 0 ? conAltura.reduce((a, b) => a + b, 0) / conAltura.length : null
    const delta = (maxH !== null && minH !== null) ? maxH - minH : null
    const sinDatos = conAltura.length === 0

    // Detectar inversiones (alguien de rol inferior es más alto que uno de rol superior)
    let inversiones = 0
    if (!sinDatos) {
      const conH = activos.filter(e => e.altura !== null)
      for (let i = 0; i < conH.length; i++) {
        for (let j = i + 1; j < conH.length; j++) {
          const a = conH[i], b = conH[j]
          if (a.rolPrio < b.rolPrio && (a.altura as number) < (b.altura as number)) inversiones++
          if (b.rolPrio < a.rolPrio && (b.altura as number) < (a.altura as number)) inversiones++
        }
      }
    }

    // Ordenar en forma de V (más altos a los extremos, más bajos al centro)
    const byHeight = [...activos].sort((a, b) => {
      const hA = a.altura ?? 0
      const hB = b.altura ?? 0
      if (hA !== hB) return hB - hA // Mayor a menor
      return a.rolPrio - b.rolPrio // Desempate por rol
    })

    const vShape = new Array(byHeight.length)
    let left = 0
    let right = byHeight.length - 1
    for (let i = 0; i < byHeight.length; i++) {
      if (i % 2 === 0) {
        vShape[left] = byHeight[i]
        left++
      } else {
        vShape[right] = byHeight[i]
        right--
      }
    }

    let estado: 'ok' | 'warn' | 'err' | 'nd' = 'nd'
    if (!sinDatos && delta !== null) {
      if (delta <= 1.5) estado = 'ok'
      else if (delta <= 2.5) estado = 'warn'
      else estado = 'err'
    }
    return { t, vShape, maxH, minH, media, delta, estado, sinDatos, inversiones }
  })

  const criticas = data.filter(d => d.estado === 'err')
  const aceptables = data.filter(d => d.estado === 'warn')
  const optimas = data.filter(d => d.estado === 'ok')
  const sinInfo = data.filter(d => d.estado === 'nd')
  const conInversiones = data.filter(d => d.inversiones > 0)

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* — Resumen ejecutivo — */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { label: 'Óptimas', val: optimas.length, col: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: '✓' },
          { label: 'Aceptables', val: aceptables.length, col: '#eab308', bg: 'rgba(234,179,8,0.12)', icon: '⚠' },
          { label: 'Críticas', val: criticas.length, col: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '✗' },
          { label: 'Sin datos', val: sinInfo.length, col: 'var(--cre-o)', bg: 'rgba(255,255,255,0.04)', icon: '—' },
        ].map(({ label, val, col, bg, icon }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${col}40`, borderRadius: '8px', padding: '0.6rem 0.4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: col, fontFamily: 'Cinzel, serif' }}>{icon} {val}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--cre-o)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* — Alertas — */}
      {criticas.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#ec9e9e' }}>
          <strong style={{ color: '#ef4444' }}>✗ Corrección urgente:</strong> Trabajadera{criticas.length > 1 ? 's' : ''} <strong>{criticas.map(d => d.t.id).join(', ')}</strong> — Δ &gt; 2.5 cm.
        </div>
      )}
      {conInversiones.length > 0 && (
        <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#e8c97a' }}>
          <strong style={{ color: '#eab308' }}>↕ Inversión de roles:</strong> Trabajadera{conInversiones.length > 1 ? 's' : ''} <strong>{conInversiones.map(d => d.t.id).join(', ')}</strong> — un costalero de menor rango es más alto que uno de mayor rango.
        </div>
      )}

      {/* — Leyenda de roles — */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {[
          { rol: 'PAT/COS', c: ROL_COLOR.PAT, hint: 'Los más altos' },
          { rol: 'FIJ', c: ROL_COLOR.FIJ, hint: 'Altura media' },
          { rol: 'COR', c: ROL_COLOR.COR, hint: 'Los más bajos' },
        ].map(({ rol, c, hint }) => (
          <div key={rol} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ padding: '1px 6px', borderRadius: '4px', background: c.bg, border: `1px solid ${c.border}`, fontSize: '0.58rem', color: c.text, fontFamily: 'Cinzel, serif', fontWeight: 700 }}>{rol}</div>
            <span style={{ fontSize: '0.58rem', color: 'var(--cre-o)' }}>{hint}</span>
          </div>
        ))}
      </div>

      {/* — Mapa por trabajadera — */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.map(({ t, vShape, maxH, minH, media, delta, estado, sinDatos, inversiones }) => {
          const borderColor = estado === 'ok' ? 'rgba(34,197,94,0.35)'
            : estado === 'warn' ? 'rgba(234,179,8,0.35)'
            : estado === 'err' ? 'rgba(239,68,68,0.35)'
            : 'rgba(255,255,255,0.08)'

          return (
            <div key={t.id} style={{ background: 'var(--neg-m)', border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
              {/* Cabecera */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.85rem', background: 'rgba(201,168,76,0.04)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--oro-o), var(--oro))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: '0.72rem', color: 'var(--neg)', flexShrink: 0 }}>{t.id}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'var(--cre)', fontWeight: 700 }}>Trabajadera {t.id}</div>
                  {!sinDatos && media && (
                    <div style={{ fontSize: '0.62rem', color: 'var(--cre-o)', marginTop: '1px' }}>
                      Media <strong style={{ color: 'var(--oro)' }}>{media.toFixed(1)} cm</strong>
                      {' · '}Rango <strong style={{ color: 'var(--cre)' }}>{minH?.toFixed(1)} – {maxH?.toFixed(1)} cm</strong>
                      {inversiones > 0 && <span style={{ color: '#eab308', marginLeft: '6px' }}>↕ {inversiones} inv.</span>}
                    </div>
                  )}
                  {sinDatos && <div style={{ fontSize: '0.62rem', color: 'var(--cre-o)', opacity: 0.6 }}>Sin datos de altura en el censo</div>}
                </div>
                {delta !== null && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.25rem 0.5rem', borderRadius: '6px', background: borderColor.replace('0.35', '0.15'), border: `1px solid ${borderColor}` }}>
                    <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: '0.9rem', color: estado === 'ok' ? '#22c55e' : estado === 'warn' ? '#eab308' : '#ef4444' }}>Δ {delta.toFixed(1)}</span>
                    <span style={{ fontSize: '0.52rem', color: 'var(--cre-o)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>cm</span>
                  </div>
                )}
              </div>

              {/* Celdas ordenadas en V (más altos en extremos, más bajos al medio) */}
              {!sinDatos && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.6rem 0.75rem', justifyContent: 'center' }}>
                  {vShape.map((e) => {
                    const rc = ROL_COLOR[e.rol] ?? ROL_COLOR.COR
                    return (
                      <div key={e.idx} style={{ background: rc.bg, border: `1.5px solid ${rc.border}`, borderRadius: '7px', padding: '0.35rem 0.5rem', minWidth: '58px', textAlign: 'center', position: 'relative' }}>
                        {/* Badge de rol */}
                        <div style={{ fontSize: '0.5rem', fontFamily: 'Cinzel, serif', fontWeight: 900, color: rc.text, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85, marginBottom: '2px' }}>{e.rol}</div>
                        {/* Altura */}
                        <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: '0.82rem', color: rc.text }}>
                          {e.altura !== null ? `${e.altura}` : '?'}
                          <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>cm</span>
                        </div>
                        {/* Nombre */}
                        <div style={{ fontSize: '0.58rem', color: 'var(--cre-o)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '58px', marginTop: '1px' }}>
                          {e.nombre.split(' ')[0] || `#${e.idx + 1}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* — Leyenda semáforo — */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.75rem' }}>
        {[
          { col: '#22c55e', label: '≤ 1.5 cm · Óptima' },
          { col: '#eab308', label: '≤ 2.5 cm · Aceptable' },
          { col: '#ef4444', label: '> 2.5 cm · Crítica' },
        ].map(({ col, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col, opacity: 0.8 }} />
            <span style={{ fontSize: '0.62rem', color: 'var(--cre-o)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

