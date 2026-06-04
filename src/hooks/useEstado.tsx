// ══════════════════════════════════════════════════════════════════
// ESTADO GLOBAL — Thin wrapper sobre stores Zustand (Phase 8)
// Stores singletons → acciones estables sin useCallback.
// useAppInit → @/hooks/useAppInit | EstadoCtx → @/hooks/useEstadoTypes
// ══════════════════════════════════════════════════════════════════
"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { SwapState } from "@/lib/types";
import { getTrab, tramosOptimosForTrab } from "@/stores/helpers";
import {
	uiStore,
	projectStore,
	temporadaStore,
	trabajaderaStore,
	planStore,
	bancoStore,
} from "@/stores";
import type { EstadoCtx } from "./useEstadoTypes";

export type { EstadoCtx };
export type {
	ActivePage,
	ActiveSheet,
	PasoDB,
	DatosPerfil,
	Trabajadera,
	RolCode,
	PinState,
	SwapState,
	CellTarget,
	CensusTarget,
	Temporada,
} from "./useEstadoTypes";

/**
 * @deprecated Prefer individual store hooks (e.g. uiStore, projectStore)
 * or Zustand selector subscriptions directly. useEstado returns a fat object
 * that causes unnecessary re-renders when any slice changes.
 */
export function useEstado(): EstadoCtx {
	const activePage = uiStore((s) => s.activePage);
	const activeSheet = uiStore((s) => s.activeSheet);
	const tema = uiStore((s) => s.tema);
	const swapSel = uiStore((s) => s.swapSel);
	const cellTarget = uiStore((s) => s.cellTarget);
	const bancoTarget = uiStore((s) => s.bancoTarget);
	const censusTarget = uiStore((s) => s.censusTarget);
	const openEqs = uiStore((s) => s.openEqs);
	const pasos = projectStore((s) => s.pasos);
	const pid = projectStore((s) => s.pid);
	const S = projectStore((s) => s.S);
	const nombrePaso = projectStore((s) => s.nombrePaso);
	const nombreCuadrilla = projectStore((s) => s.nombreCuadrilla);
	const censusHeights = projectStore((s) => s.censusHeights);
	const temporadas = temporadaStore((s) => s.temporadas);
	const activeTemporadaId = temporadaStore((s) => s.activeTemporadaId);

	useEffect(() => {
		if (activeTemporadaId) projectStore.getState().fetchCensusHeights();
	}, [pid, activeTemporadaId]);

	const addCost = useCallback((tid: number) => {
		trabajaderaStore.getState().addCost(tid);
		uiStore.getState().openEq(tid);
	}, []);
	const confirmarSwap = useCallback((ws: SwapState) => {
		planStore.getState().confirmarSwap(ws);
		uiStore.getState().setSwapSel(null);
	}, []);
	const tramosOptimosFor = useCallback(
		(tid: number, salidas?: number): number => {
			const t = getTrab(projectStore.getState().S, tid);
			return tramosOptimosForTrab(t, salidas);
		},
		[],
	);
	const refetchPasos = useCallback(
		async () => projectStore.getState().refetchPasos(),
		[],
	);
	const vaciarCenso = useCallback(
		async () => projectStore.getState().vaciarCenso(),
		[],
	);

	const ctx = useMemo(
		() => ({
			activePage,
			setActivePage: uiStore.getState().setActivePage,
			activeSheet,
			openSheet: uiStore.getState().openSheet,
			closeSheet: uiStore.getState().closeSheet,
			tema,
			toggleTema: uiStore.getState().toggleTema,
			swapSel,
			setSwapSel: uiStore.getState().setSwapSel,
			cellTarget,
			setCellTarget: uiStore.getState().setCellTarget,
			bancoTarget,
			setBancoTarget: uiStore.getState().setBancoTarget,
			censusTarget,
			setCensusTarget: uiStore.getState().setCensusTarget,
			openEqs,
			toggleEq: uiStore.getState().toggleEq,
			pasos,
			pid,
			setPid: projectStore.getState().setPid,
			S,
			nombrePaso,
			nombreCuadrilla,
			censusHeights,
			refetchPasos,
			vaciarCenso,
			temporadas,
			activeTemporadaId,
			setActiveTemporadaId: temporadaStore.getState().setActiveTemporadaId,
			setNombre: trabajaderaStore.getState().setNombre,
			addCost,
			delCost: trabajaderaStore.getState().delCost,
			toggleBaja: trabajaderaStore.getState().toggleBaja,
			setRolPri: trabajaderaStore.getState().setRolPri,
			setRolSec: trabajaderaStore.getState().setRolSec,
			toggleRegla5: trabajaderaStore.getState().toggleRegla5,
			addTrab: trabajaderaStore.getState().addTrab,
			setPuntuacion: trabajaderaStore.getState().setPuntuacion,
			addCostUltimo: trabajaderaStore.getState().addCostUltimo,
			setNombreTramo: trabajaderaStore.getState().setNombreTramo,
			addTramo: trabajaderaStore.getState().addTramo,
			delTramo: trabajaderaStore.getState().delTramo,
			setSalidas: trabajaderaStore.getState().setSalidas,
			usarBanco: trabajaderaStore.getState().usarBanco,
			tramosOptimosFor,
			sugerirTramos: trabajaderaStore.getState().sugerirTramos,
			toggleTramoClave: trabajaderaStore.getState().toggleTramoClave,
			sugerirYCalcular: trabajaderaStore.getState().sugerirYCalcular,
			previsualizarSugerencia: trabajaderaStore.getState().previsualizarSugerencia,
			confirmarSugerencia: trabajaderaStore.getState().confirmarSugerencia,
			addBanco: bancoStore.getState().addBanco,
			delBanco: bancoStore.getState().delBanco,
			limpiarBanco: bancoStore.getState().limpiarBanco,
			calcularTodo: planStore.getState().calcularTodo,
			calcularTrab: planStore.getState().calcularTrab,
			completarPlan: planStore.getState().completarPlan,
			limpiarPlan: planStore.getState().limpiarPlan,
			quitarBloqueos: planStore.getState().quitarBloqueos,
			setPinned: planStore.getState().setPinned,
			getErroresPinned: planStore.getState().getErroresPinned,
			confirmarSwap,
			limpiarPlanificacion: planStore.getState().limpiarPlanificacion,
			limpiarTrabajaderas: planStore.getState().limpiarTrabajaderas,
			resetTodo: planStore.getState().resetTodo,
			addPlan: planStore.getState().addPlan,
			updatePlan: planStore.getState().updatePlan,
			delPlan: planStore.getState().delPlan,
			cargarPlanEnTrabajadera: planStore.getState().cargarPlanEnTrabajadera,
		}),
		[
			activePage,
			activeSheet,
			tema,
			swapSel,
			cellTarget,
			bancoTarget,
			censusTarget,
			openEqs,
			pasos,
			pid,
			S,
			nombrePaso,
			nombreCuadrilla,
			censusHeights,
			temporadas,
			activeTemporadaId,
			addCost,
			confirmarSwap,
			tramosOptimosFor,
			refetchPasos,
			vaciarCenso,
		],
	);

	return ctx;
}
