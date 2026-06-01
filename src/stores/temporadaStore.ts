// ══════════════════════════════════════════════════════════════════
// TEMPORADA STORE — Slice de temporadas (Phase 3.2)
// ══════════════════════════════════════════════════════════════════

import { create } from "zustand";
import type { Temporada } from "@/lib/types";

const LS_TID = "cpwa_active_temp_id";

export interface TemporadaStoreState {
	temporadas: Temporada[];
	activeTemporadaId: string;
}

export interface TemporadaStoreActions {
	setActiveTemporadaId: (id: string) => void;
	setTemporadas: (temporadas: Temporada[]) => void;
}

export type TemporadaStore = TemporadaStoreState & TemporadaStoreActions;

let _refetchPasos: (() => Promise<void>) | null = null;
export function setTemporadaRefetch(fn: () => Promise<void>) {
	_refetchPasos = fn;
}

export const temporadaStore = create<TemporadaStore>()((set) => ({
	temporadas: [],
	activeTemporadaId: "",

	setActiveTemporadaId: (id) => {
		set({ activeTemporadaId: id });
		if (id) {
			localStorage.setItem(LS_TID, id);
			_refetchPasos?.();
		}
	},

	setTemporadas: (temporadas) => set({ temporadas }),
}));
