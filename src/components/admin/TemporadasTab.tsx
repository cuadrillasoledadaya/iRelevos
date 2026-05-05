'use client'

import type { Temporada } from '@/lib/types'
import type { NewTempForm } from './types'

interface TemporadasTabProps {
  temporadas: Temporada[]
  activeTemporadaId: string
  saving: boolean
  newTemp: NewTempForm
  onNewTempChange: (v: NewTempForm) => void
  onSelectTemporada: (id: string) => void
  onEliminarTemporada: (id: string) => void
  onCrearTemporada: () => void
}

export default function TemporadasTab({
  temporadas, activeTemporadaId, saving,
  newTemp, onNewTempChange,
  onSelectTemporada, onEliminarTemporada, onCrearTemporada,
}: TemporadasTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <div className="font-bold text-[var(--oro)] mb-3">TEMPORADA ACTIVA</div>
        <div className="flex flex-col gap-2">
          {temporadas.map(t => (
            <div key={t.id} className="flex gap-2">
              <button
                className={`btn flex-1 flex items-center justify-between ${t.id === activeTemporadaId ? 'btn-oro' : 'btn-ghost'}`}
                onClick={() => onSelectTemporada(t.id)}
              >
                <span>{t.nombre}</span>
                {t.id === activeTemporadaId && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded">ACTUAL</span>}
              </button>
              <button
                title="Eliminar Temporada"
                className="btn btn-ghost text-red-500 p-2"
                onClick={() => onEliminarTemporada(t.id)}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <div className="font-bold text-[var(--oro)] mb-3">NUEVA TEMPORADA</div>
        <div className="flex flex-col gap-3">
          <input
            className="inp"
            placeholder="Nombre de la temporada (ej: SS 2025)"
            value={newTemp.nombre}
            onChange={e => onNewTempChange({ ...newTemp, nombre: e.target.value })}
          />

          <div className="flex flex-col gap-2 p-3 bg-black/20 rounded border border-white/5">
            <div className="text-[10px] uppercase opacity-40 font-bold mb-1">Opciones de Clonación</div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newTemp.clonarCenso}
                onChange={e => onNewTempChange({ ...newTemp, clonarCenso: e.target.checked })} />
              <span className="text-xs">Clonar Censo del año anterior</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newTemp.clonarPasos}
                onChange={e => onNewTempChange({ ...newTemp, clonarPasos: e.target.checked })} />
              <span className="text-xs">Clonar estructura de Pasos / Cuadrillas</span>
            </label>

            {temporadas.length > 0 && (
              <div className="mt-2">
                <div className="text-[9px] opacity-40 mb-1">Origen de los datos:</div>
                <select
                  className="inp sm h-8 text-[10px]"
                  value={newTemp.sourceTempId}
                  onChange={e => onNewTempChange({ ...newTemp, sourceTempId: e.target.value })}
                >
                  {temporadas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          <button className="btn btn-oro w-full" onClick={onCrearTemporada} disabled={saving}>
            {saving ? 'CREANDO...' : 'CREAR NUEVA TEMPORADA'}
          </button>
        </div>
      </div>
    </div>
  )
}
