"use client";

import { useState, useCallback } from "react";
import { trabajaderaStore } from "@/stores";

interface DistributionEditorProps {
  tid: number;
  nombres: string[];
  distribucion: { a: number[]; b: number[] };
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DistributionEditor({
  tid,
  nombres,
  distribucion,
  onConfirm,
  onCancel,
}: DistributionEditorProps) {
  const [localA, setLocalA] = useState<number[]>([...distribucion.a]);
  const [localB, setLocalB] = useState<number[]>([...distribucion.b]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragSource, setDragSource] = useState<"a" | "b" | null>(null);

  const moveName = useCallback(
    (fromCol: "a" | "b", idx: number, toCol: "a" | "b") => {
      const fromArr = fromCol === "a" ? localA : localB;
      const toArr = toCol === "a" ? localA : localB;
      const nameIdx = fromArr[idx];
      if (nameIdx === undefined) return;

      const newFrom = fromArr.filter((_, i) => i !== idx);
      const newTo = [...toArr, nameIdx];

      if (toCol === "a") {
        setLocalA(newTo);
        setLocalB(newFrom);
      } else {
        setLocalA(newFrom);
        setLocalB(newTo);
      }
    },
    [localA, localB],
  );

  const handleConfirm = () => {
    try {
      trabajaderaStore.getState().setDistribucionCuadrillas(tid, localA, localB);
      onConfirm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      if (typeof alert !== "undefined") alert(msg);
    }
  };

  const handleCancel = () => {
    setLocalA([...distribucion.a]);
    setLocalB([...distribucion.b]);
    onCancel();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    col: "a" | "b",
    idx: number,
  ) => {
    if (e.key === "ArrowRight" && col === "a") {
      e.preventDefault();
      moveName("a", idx, "b");
    } else if (e.key === "ArrowLeft" && col === "b") {
      e.preventDefault();
      moveName("b", idx, "a");
    } else if (e.key === "Enter") {
      e.preventDefault();
      moveName(col, idx, col === "a" ? "b" : "a");
    }
  };

  const renderColumn = (col: "a" | "b", items: number[]) => (
    <div className="flex flex-col gap-1">
      <div className="text-[0.65rem] uppercase tracking-wider text-[var(--cd-tx)] font-bold mb-1">
        Cuadrilla {col.toUpperCase()} ({items.length})
      </div>
      {items.map((nameIdx, i) => (
        <div
          key={nameIdx}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--cd-bg)] border border-[var(--cd-bd)] text-[var(--cd-tx)] text-sm cursor-grab select-none"
          draggable
          onDragStart={() => {
            setDragIdx(i);
            setDragSource(col);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragSource && dragSource !== col && dragIdx !== null) {
              moveName(dragSource, dragIdx, col);
            }
            setDragIdx(null);
            setDragSource(null);
          }}
          onKeyDown={(e) => handleKeyDown(e, col, i)}
          tabIndex={0}
          role="button"
          aria-label={`${nombres[nameIdx]}, press Enter or arrow to move`}
        >
          <span className="text-[0.55rem] text-[var(--cre-o)] w-5">{i + 1}.</span>
          <span className="flex-1">{nombres[nameIdx]}</span>
          <span className="text-[0.5rem] text-[var(--cre-o)]">
            {col === "a" ? "→" : "←"}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mbox mt-3">
      <div className="text-[0.7rem] text-[var(--cd-tx)] mb-2 font-bold">
        Distribución Cuadrillas A/B
      </div>
      <div className="flex gap-4">
        <div className="flex-1">{renderColumn("a", localA)}</div>
        <div className="flex-1">{renderColumn("b", localB)}</div>
      </div>
      <div className="flex gap-2 mt-3">
        <button className="btn btn-oro btn-sm f1" onClick={handleConfirm}>
          ✓ Confirmar
        </button>
        <button className="btn btn-ghost btn-sm f1" onClick={handleCancel}>
          ✕ Cancelar
        </button>
      </div>
      <div className="text-[0.55rem] text-[var(--cre-o)] mt-2 text-center">
        Arrastra nombres entre columnas o usa ← → + Enter
      </div>
    </div>
  );
}
