'use client'

import { useRef, useState } from 'react'
import { useEstado } from '@/hooks/useEstado'

export default function BancoSheet() {
  const { S, activeSheet, closeSheet, addBanco, delBanco, bancoTarget, usarBanco, setBancoTarget } = useEstado()
  const [nuevoNombre, setNuevoNombre] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isOpen = activeSheet === 'banco'

  function handleAdd() {
    const n = nuevoNombre.trim()
    if (!n) return
    addBanco(n)
    setNuevoNombre('')
    inputRef.current?.focus()
  }

  function handleUsar(nombre: string) {
    if (bancoTarget) {
      usarBanco(bancoTarget.tid, bancoTarget.ti, nombre)
      setBancoTarget(null)
      closeSheet()
    }
  }

  return (
    <>
      <div className={`bso${isOpen ? ' open' : ''}`} onClick={closeSheet} />
      <div className={`bss${isOpen ? ' open' : ''}`}>
        <div className="bs-handle" />
        <div className="bs-hdr">
          <span className="bs-title">📚 Banco de Nombres</span>
          <button className="btn btn-ghost btn-sm" onClick={closeSheet}>✕</button>
        </div>
        {bancoTarget && (
          <div className="bs-sub">Toca un nombre para usarlo en el tramo</div>
        )}
        <div className="bs-body">
          {S.banco.map((nombre: string, i: number) => (
            <div
              key={i}
              className="bs-item"
              onClick={() => bancoTarget ? handleUsar(nombre) : undefined}
              style={{ cursor: bancoTarget ? 'pointer' : 'default' }}
            >
              <span style={{ flex: 1 }}>{nombre}</span>
              {!bancoTarget && (
                <button
                  className="bdel"
                  onClick={e => { e.stopPropagation(); delBanco(i) }}
                  title="Borrar"
                >✕</button>
              )}
            </div>
          ))}
          <div className="perfil-nuevo">
            <input
              ref={inputRef}
              className="inp f1"
              placeholder="Nuevo nombre de tramo…"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={{ height: '38px' }}
            />
            <button className="btn btn-out btn-sm" onClick={handleAdd}>+ Añadir</button>
          </div>
        </div>
      </div>
    </>
  )
}
