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

export function createTemporadaStore(refetchPasos?: () => Promise<void>) {
	return create<TemporadaStore>()((set) => ({
		temporadas: [],
		activeTemporadaId: "",

		setActiveTemporadaId: (id) => {
			set({ activeTemporadaId: id });
			if (id) {
				localStorage.setItem(LS_TID, id);
				refetchPasos?.();
			}
		},

		setTemporadas: (temporadas) => set({ temporadas }),
	}));
}

export const temporadaStore = createTemporadaStore();
