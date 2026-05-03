// ══════════════════════════════════════════════════════════════════
// ESTADO GLOBAL — Hook combinado de stores Zustand (Phase 7.3)
// Ya no usa React Context. Los stores son singletons accesibles
// directamente. Este hook solo combina estado + acciones para
// compatibilidad con consumidores existentes.
// ══════════════════════════════════════════════════════════════════
'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  ActivePage, ActiveSheet,
  CellTarget, CensusTarget, DatosPerfil, PasoDB,
  PinState, RolCode, SwapState, Trabajadera, Temporada,
} from '@/lib/types'

export type { ActivePage, ActiveSheet, PasoDB, DatosPerfil, Trabajadera, RolCode, PinState, SwapState, CellTarget, CensusTarget, Temporada }

import {
  completarAuto, tramosOptimos, validarPinned,
} from '@/lib/algoritmos'
import { ordenarDentroFisico } from '@/lib/roles'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'
import {
  uiStore, projectStore, temporadaStore,
  trabajaderaStore, planStore, bancoStore,
} from '@/stores'

// ── Contexto (compatibilidad de tipos) ─────────────────────────────

export interface EstadoCtx {
  // Datos
  pasos: PasoDB[]
  pid: string
  setPid: (id: string) => void
  S: DatosPerfil
  nombrePaso: string
  nombreCuadrilla: string

  // UI
  activePage: ActivePage
  setActivePage: (p: ActivePage) => void
  activeSheet: ActiveSheet
  openSheet: (s: ActiveSheet) => void
  closeSheet: () => void

  // Tema
  tema: 'dark' | 'light'
  toggleTema: () => void

  // Swap (Capataz)
  swapSel: Partial<SwapState> | null
  setSwapSel: (sel: Partial<SwapState> | null) => void

  // Celda (Plan)
  cellTarget: CellTarget | null
  setCellTarget: (t: CellTarget | null) => void

  // Banco / sugerencia
  bancoTarget: { tid: number; ti: number } | null
  setBancoTarget: (t: { tid: number; ti: number } | null) => void

  // Censo selector
  censusTarget: CensusTarget | null
  setCensusTarget: (t: CensusTarget | null) => void

  // Accordion abierto en equipo
  openEqs: Set<number>
  toggleEq: (id: number) => void

  // Mutaciones de trabajaderas
  setNombre: (tid: number, i: number, nombre: string) => void
  addCost: (tid: number) => void
  delCost: (tid: number, i: number) => void
  toggleBaja: (tid: number, i: number) => boolean
  setRolPri: (tid: number, i: number, rol: string) => void
  setRolSec: (tid: number, i: number, rol: string) => void
  toggleRegla5: (tid: number) => void
  addTrab: () => void
  setPuntuacion: (tid: number, nombre: string, pts: number) => void
  addCostUltimo: (tid: number, nombre: string, roles: string[]) => void

  // Mutaciones de tramos
  setNombreTramo: (tid: number, ti: number, nombre: string) => void
  addTramo: (tid: number) => void
  delTramo: (tid: number, ti: number) => void
  setSalidas: (tid: number, salidas: number) => void
  usarBanco: (tid: number, ti: number, nombre: string) => void
  tramosOptimosFor: (tid: number, salidas?: number) => number
  sugerirTramos: (tid: number, targetSalidas?: number) => void
  toggleTramoClave: (tid: number, ti: number) => void
  sugerirYCalcular: (tid: number) => void

  // Banco
  addBanco: (nombre: string) => void
  delBanco: (i: number) => void

  // Plan
  calcularTodo: () => void
  calcularTrab: (tid: number) => void
  completarPlan: (tid: number) => void
  limpiarPlan: (tid: number) => void
  quitarBloqueos: (tid: number) => void
  setPinned: (tid: number, ti: number, ci: number, v: PinState) => void
  getErroresPinned: (tid: number) => string[]

  // Capataz
  confirmarSwap: (ws: SwapState) => void

  // Reset / Limpieza
  limpiarPlanificacion: () => void
  limpiarTrabajaderas: () => void
  limpiarBanco: () => void
  vaciarCenso: () => Promise<void>
  resetTodo: () => void

  // Planes de Relevos
  addPlan: (nombre: string, tramos?: string[]) => void
  updatePlan: (id: string, nombre: string) => void
  delPlan: (id: string) => void
  cargarPlanEnTrabajadera: (tid: number, planId: string) => void

  censusHeights: Record<string, number>
  temporadas: Temporada[]
  activeTemporadaId: string
  setActiveTemporadaId: (id: string) => void
  refetchPasos: () => Promise<void>
}

const LS_TID = 'cpwa_active_temp_id'

// ══════════════════════════════════════════════════════════════════
// INICIALIZACIÓN DE LA APP — Se debe llamar UNA VEZ en el layout
// ══════════════════════════════════════════════════════════════════

export function useAppInit() {
  const { user, loading: authLoading } = useAuth()

  // 1. Cargar temporadas de Supabase
  useEffect(() => {
    if (authLoading) return

    async function init() {
      const { data: temps, error: tErr } = await supabase
        .from('temporadas')
        .select('*')
        .order('created_at', { ascending: false })

      if (!tErr && temps && temps.length > 0) {
        temporadaStore.getState().setTemporadas(temps)
        const savedTid = localStorage.getItem(LS_TID)
        const currentTemp =
          (savedTid && temps.find((t: Temporada) => t.id === savedTid)) ||
          temps.find((t: Temporada) => t.activa) ||
          temps[0]
        temporadaStore.getState().setActiveTemporadaId(currentTemp.id)
      }
    }

    init()

    const channel = supabase
      .channel('proyectos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proyectos' }, () => {
        init()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, authLoading])

  // 2. Sincronizar activeTemporadaId entre stores y disparar refetch
  const activeTemporadaId = temporadaStore((s) => s.activeTemporadaId)
  useEffect(() => {
    if (activeTemporadaId) {
      projectStore.getState().setActiveTemporadaId(activeTemporadaId)
      projectStore.getState().refetchPasos()
      localStorage.setItem(LS_TID, activeTemporadaId)
    }
  }, [activeTemporadaId])

  // Aplicar tema al DOM
  const tema = uiStore((s) => s.tema)
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('light', tema === 'light')
  }, [tema])
}

// ══════════════════════════════════════════════════════════════════
// USE ESTADO — Hook combinado (sin Context)
// ══════════════════════════════════════════════════════════════════

export function useEstado(): EstadoCtx {
  // ── Estado de stores (Zustand selectors) ────────────────────────

  const activePage = uiStore((s) => s.activePage)
  const setActivePage = useCallback((p: ActivePage) => uiStore.getState().setActivePage(p), [])

  const activeSheet = uiStore((s) => s.activeSheet)
  const openSheet = useCallback((s: ActiveSheet) => uiStore.getState().openSheet(s), [])
  const closeSheet = useCallback(() => uiStore.getState().closeSheet(), [])

  const tema = uiStore((s) => s.tema)
  const toggleTema = useCallback(() => uiStore.getState().toggleTema(), [])

  const swapSel = uiStore((s) => s.swapSel)
  const setSwapSel = useCallback((sel: Partial<SwapState> | null) => uiStore.getState().setSwapSel(sel), [])

  const cellTarget = uiStore((s) => s.cellTarget)
  const setCellTarget = useCallback((t: CellTarget | null) => uiStore.getState().setCellTarget(t), [])

  const bancoTarget = uiStore((s) => s.bancoTarget)
  const setBancoTarget = useCallback((t: { tid: number; ti: number } | null) => uiStore.getState().setBancoTarget(t), [])

  const censusTarget = uiStore((s) => s.censusTarget)
  const setCensusTarget = useCallback((t: CensusTarget | null) => uiStore.getState().setCensusTarget(t), [])

  const openEqs = uiStore((s) => s.openEqs)
  const toggleEq = useCallback((id: number) => uiStore.getState().toggleEq(id), [])

  const pasos = projectStore((s) => s.pasos)
  const pid = projectStore((s) => s.pid)
  const setPid = useCallback((id: string) => projectStore.getState().setPid(id), [])
  const S = projectStore((s) => s.S)
  const nombrePaso = projectStore((s) => s.nombrePaso)
  const nombreCuadrilla = projectStore((s) => s.nombreCuadrilla)
  const refetchPasos = useCallback(async () => projectStore.getState().refetchPasos(), [])

  const temporadas = temporadaStore((s) => s.temporadas)
  const activeTemporadaId = temporadaStore((s) => s.activeTemporadaId)
  const setActiveTemporadaId = useCallback((id: string) => temporadaStore.getState().setActiveTemporadaId(id), [])

  // ── Census heights (local state, no store) ──────────────────────

  const [censusHeights, setCensusHeights] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!activeTemporadaId) return
    const fetchHeights = async () => {
      const { data } = await supabase
        .from('census')
        .select('nombre, apellidos, apodo, altura')
        .eq('temporada_id', activeTemporadaId)

      if (data) {
        const map: Record<string, number> = {}
        data.forEach((c: { nombre: string; apellidos: string; apodo?: string; altura?: number }) => {
          if (c.altura) {
            const fullName = `${c.nombre} ${c.apellidos}`.trim()
            map[fullName] = c.altura
            if (c.apodo) map[c.apodo.trim()] = c.altura
          }
        })
        setCensusHeights(map)
      }
    }
    fetchHeights()
  }, [pid, activeTemporadaId])

  // ── Trabajadera actions ─────────────────────────────────────────

  const setNombre = useCallback((tid: number, i: number, nombre: string) => {
    trabajaderaStore.getState().setNombre(tid, i, nombre)
  }, [])

  const addCost = useCallback((tid: number) => {
    trabajaderaStore.getState().addCost(tid)
    uiStore.getState().openEq(tid)
  }, [])

  const delCost = useCallback((tid: number, i: number) => {
    trabajaderaStore.getState().delCost(tid, i)
  }, [])

  const toggleBaja = useCallback((tid: number, i: number): boolean => {
    return trabajaderaStore.getState().toggleBaja(tid, i)
  }, [])

  const setRolPri = useCallback((tid: number, i: number, rol: string) => {
    trabajaderaStore.getState().setRolPri(tid, i, rol)
  }, [])

  const setRolSec = useCallback((tid: number, i: number, rol: string) => {
    trabajaderaStore.getState().setRolSec(tid, i, rol)
  }, [])

  const toggleRegla5 = useCallback((tid: number) => {
    trabajaderaStore.getState().toggleRegla5(tid)
  }, [])

  const addTrab = useCallback(() => {
    trabajaderaStore.getState().addTrab()
  }, [])

  const setPuntuacion = useCallback((tid: number, nombre: string, pts: number) => {
    trabajaderaStore.getState().setPuntuacion(tid, nombre, pts)
  }, [])

  const addCostUltimo = useCallback((tid: number, nombre: string, roles: string[]) => {
    trabajaderaStore.getState().addCostUltimo(tid, nombre, roles)
    setTimeout(() => completarPlan(tid), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setNombreTramo = useCallback((tid: number, ti: number, nombre: string) => {
    trabajaderaStore.getState().setNombreTramo(tid, ti, nombre)
  }, [])

  const addTramo = useCallback((tid: number) => {
    trabajaderaStore.getState().addTramo(tid)
  }, [])

  const delTramo = useCallback((tid: number, ti: number) => {
    trabajaderaStore.getState().delTramo(tid, ti)
  }, [])

  const setSalidas = useCallback((tid: number, salidas: number) => {
    trabajaderaStore.getState().setSalidas(tid, salidas)
  }, [])

  const usarBanco = useCallback((tid: number, ti: number, nombre: string) => {
    trabajaderaStore.getState().usarBanco(tid, ti, nombre)
  }, [])

  const sugerirTramos = useCallback((tid: number, targetSalidas?: number) => {
    trabajaderaStore.getState().sugerirTramos(tid, targetSalidas)
  }, [])

  const toggleTramoClave = useCallback((tid: number, ti: number) => {
    trabajaderaStore.getState().toggleTramoClave(tid, ti)
  }, [])

  const sugerirYCalcular = useCallback((tid: number) => {
    trabajaderaStore.getState().sugerirYCalcular(tid)
    setTimeout(() => completarPlan(tid), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Plan helpers ────────────────────────────────────────────────

  const completarPlan = useCallback((tid: number) => {
    const state = projectStore.getState()
    const t = state.S.trabajaderas.find((x: Trabajadera) => x.id === tid)
    if (!t) return
    const res = completarAuto(t)
    if ('error' in res) return
    ordenarDentroFisico(t, res.plan)
    // Actualizar directamente en el store
    projectStore.setState((prev) => {
      const nextS = { ...prev.S }
      const idx = nextS.trabajaderas.findIndex((x: Trabajadera) => x.id === tid)
      if (idx >= 0) {
        nextS.trabajaderas[idx] = { ...nextS.trabajaderas[idx] }
        nextS.trabajaderas[idx].plan = res.plan
        nextS.trabajaderas[idx].obj = res.obj
        nextS.trabajaderas[idx].analisis = res.analisis
      }
      return { S: nextS }
    })
  }, [])

  const tramosOptimosFor = useCallback((tid: number, salidas?: number): number => {
    const state = projectStore.getState()
    const t = state.S.trabajaderas.find((x: Trabajadera) => x.id === tid)
    if (!t) return 1
    const nActivos = t.nombres.length - (t.bajas?.length ?? 0)
    return tramosOptimos(nActivos, salidas ?? t.salidas ?? 2)
  }, [])

  // ── Banco actions ───────────────────────────────────────────────

  const addBanco = useCallback((nombre: string) => {
    bancoStore.getState().addBanco(nombre)
  }, [])

  const delBanco = useCallback((i: number) => {
    bancoStore.getState().delBanco(i)
  }, [])

  const limpiarBanco = useCallback(() => {
    bancoStore.getState().limpiarBanco()
  }, [])

  // ── Plan actions ────────────────────────────────────────────────

  const calcularTrab = useCallback((tid: number) => {
    planStore.getState().calcularTrab(tid)
  }, [])

  const calcularTodo = useCallback(() => {
    planStore.getState().calcularTodo()
  }, [])

  const quitarBloqueos = useCallback((tid: number) => {
    planStore.getState().quitarBloqueos(tid)
  }, [])

  const limpiarPlan = useCallback((tid: number) => {
    planStore.getState().limpiarPlan(tid)
  }, [])

  const setPinned = useCallback((tid: number, ti: number, ci: number, v: PinState) => {
    planStore.getState().setPinned(tid, ti, ci, v)
  }, [])

  const getErroresPinned = useCallback((tid: number): string[] => {
    const state = projectStore.getState()
    const t = state.S.trabajaderas.find((x: Trabajadera) => x.id === tid)
    if (!t) return []
    return validarPinned(t)
  }, [])

  const confirmarSwap = useCallback((ws: SwapState) => {
    planStore.getState().confirmarSwap(ws)
    uiStore.getState().setSwapSel(null)
  }, [])

  const limpiarPlanificacion = useCallback(() => {
    planStore.getState().limpiarPlanificacion()
  }, [])

  const limpiarTrabajaderas = useCallback(() => {
    planStore.getState().limpiarTrabajaderas()
  }, [])

  const resetTodo = useCallback(() => {
    planStore.getState().resetTodo()
  }, [])

  // ── Planes de Relevos ───────────────────────────────────────────

  const addPlan = useCallback((nombre: string, tramos?: string[]) => {
    planStore.getState().addPlan(nombre, tramos)
  }, [])

  const updatePlan = useCallback((id: string, nombre: string) => {
    planStore.getState().updatePlan(id, nombre)
  }, [])

  const delPlan = useCallback((id: string) => {
    planStore.getState().delPlan(id)
  }, [])

  const cargarPlanEnTrabajadera = useCallback((tid: number, planId: string) => {
    planStore.getState().cargarPlanEnTrabajadera(tid, planId)
  }, [])

  const vaciarCenso = useCallback(async () => {
    const currentPid = projectStore.getState().pid
    if (!currentPid) return
    const { error } = await supabase
      .from('census')
      .delete()
      .eq('proyecto_id', currentPid)

    if (error) {
      console.error('Error al vaciar censo:', error.message)
      alert('Error al vaciar el censo: ' + error.message)
    } else {
      alert('Censo vaciado correctamente.')
    }
  }, [])

  return {
    pasos, pid, setPid, S, nombrePaso, nombreCuadrilla,
    activePage, setActivePage,
    activeSheet, openSheet, closeSheet,
    tema, toggleTema,
    swapSel, setSwapSel,
    cellTarget, setCellTarget,
    bancoTarget, setBancoTarget,
    censusTarget, setCensusTarget,
    openEqs, toggleEq,
    setNombre, addCost, delCost, toggleBaja, setRolPri, setRolSec, toggleRegla5, addTrab, setPuntuacion, addCostUltimo,
    setNombreTramo, addTramo, delTramo, setSalidas, usarBanco, tramosOptimosFor, sugerirTramos, toggleTramoClave, sugerirYCalcular,
    addBanco, delBanco,
    calcularTodo, calcularTrab, completarPlan, limpiarPlan, quitarBloqueos, setPinned, getErroresPinned,
    confirmarSwap,
    limpiarPlanificacion, limpiarTrabajaderas, limpiarBanco, vaciarCenso, resetTodo,
    addPlan, updatePlan, delPlan, cargarPlanEnTrabajadera,
    censusHeights,
    temporadas, activeTemporadaId, setActiveTemporadaId, refetchPasos,
  }
}
