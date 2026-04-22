// ══════════════════════════════════════════════════════════════════
// ESTADO GLOBAL — Contexto Multi-Paso (Supabase Proyectos)
// ══════════════════════════════════════════════════════════════════
'use client'

import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from 'react'
import type {
  ActivePage, ActiveSheet,
  CellTarget, DatosPerfil, PasoDB,
  PinState, RolCode, SwapState, Trabajadera,
} from '@/lib/types'
import {
  calcularCiclo, completarAuto, analizar,
  datosVacios, tramosOptimos,
  getPinned, validarPinned, aplicarSugerencias,
} from '@/lib/algoritmos'
import {
  defaultRoles, ordenarDentroFisico,
} from '@/lib/roles'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'

// ── Contexto ───────────────────────────────────────────────────────

export interface EstadoCtx {
  // Datos
  pasos: PasoDB[]      // Lista de proyectos desde Supabase
  pid: string       // ID del proyecto activo
  setPid: (id: string) => void
  S: DatosPerfil    // El estado del paso actual
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
  setSwapSel: React.Dispatch<React.SetStateAction<Partial<SwapState> | null>>

  // Celda (Plan)
  cellTarget: CellTarget | null
  setCellTarget: React.Dispatch<React.SetStateAction<CellTarget | null>>

  // Banco / sugerencia
  bancoTarget: { tid: number; ti: number } | null
  setBancoTarget: React.Dispatch<React.SetStateAction<{ tid: number; ti: number } | null>>

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

  // Reset
  resetTodo: () => void
}

const EstadoContext = createContext<EstadoCtx | null>(null)

const LS_PID = 'cpwa_active_paso_id'
const LS_TEMA = 'cpwa_tema'

// ── Provider ───────────────────────────────────────────────────────

export function EstadoProvider({ children }: { children: React.ReactNode }) {
  const [pasos, setPasos] = useState<PasoDB[]>([])
  const [pid, setPid] = useState<string>('')
  const [activePage, setActivePage] = useState<ActivePage>('plan')
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [tema, setTema] = useState<'dark' | 'light'>('dark')
  const [swapSel, setSwapSel] = useState<Partial<SwapState> | null>(null)
  const [cellTarget, setCellTarget] = useState<CellTarget | null>(null)
  const [bancoTarget, setBancoTarget] = useState<{ tid: number; ti: number } | null>(null)
  const [openEqs, setOpenEqs] = useState<Set<number>>(new Set())
  const { user, loading: authLoading } = useAuth()
  const inited = useRef(false)

  // 1. Cargar lista de proyectos de Supabase
  useEffect(() => {
    if (authLoading) return

    async function init() {
      const { data, error } = await supabase
        .from('proyectos')
        .select('id, nombre_paso, nombre_cuadrilla, num_trabajaderas, content, created_at')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        setPasos(data)
        const savedPid = localStorage.getItem(LS_PID)
        if (savedPid && data.some(p => p.id === savedPid)) {
          setPid(savedPid)
        } else {
          setPid(data[0].id)
        }
      }
      
      const t = localStorage.getItem(LS_TEMA)
      if (t === 'light' || t === 'dark') setTema(t)
      inited.current = true
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

  // Aplicar tema
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('light', tema === 'light')
    localStorage.setItem(LS_TEMA, tema)
  }, [tema])

  // Guardar PID actual
  useEffect(() => {
    if (pid) localStorage.setItem(LS_PID, pid)
  }, [pid])

  // Helper para guardar cambios en la nube
  const saveCloud = useCallback(async (content: DatosPerfil, targetPid: string) => {
    if (!user || !targetPid) return
    await supabase
      .from('proyectos')
      .update({ content })
      .eq('id', targetPid)
  }, [user])

  // Datos del paso activo
  const pasoActual = pasos.find(p => p.id === pid)
  const S: DatosPerfil = pasoActual?.content ?? datosVacios()
  const nombrePaso = pasoActual?.nombre_paso ?? 'Sin Paso'
  const nombreCuadrilla = pasoActual?.nombre_cuadrilla ?? 'Sin Cuadrilla'
  
  // ── Mutación con persistencia ──────────────────────────────────
  
  const mutar = useCallback((fn: (draft: DatosPerfil) => void): void => {
    if (!pid) return
    setPasos(prev => {
      const nextPasos = [...prev]
      const idx = nextPasos.findIndex(p => p.id === pid)
      if (idx === -1) return prev

      const draft = JSON.parse(JSON.stringify(nextPasos[idx].content)) as DatosPerfil
      fn(draft)
      nextPasos[idx] = { ...nextPasos[idx], content: draft }
      
      // Persistencia asíncrona
      saveCloud(draft, pid)
      return nextPasos
    })
  }, [pid, saveCloud])

  const getTrab = useCallback((d: DatosPerfil, tid: number): Trabajadera => {
    return d.trabajaderas.find(t => t.id === tid)!
  }, [])

  // ── Implementación de Mutaciones ───────────────────────────────

  const completarPlan = useCallback((tid: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      const res = completarAuto(t)
      if ('error' in res) return
      ordenarDentroFisico(t, res.plan)
      t.plan = res.plan; t.obj = res.obj; t.analisis = res.analisis
    })
  }, [mutar, getTrab])

  const setNombre = useCallback((tid: number, i: number, nombre: string) => {
    mutar(d => { getTrab(d, tid).nombres[i] = nombre })
  }, [mutar, getTrab])

  const addCost = useCallback((tid: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      t.nombres.push(`Costalero ${t.nombres.length + 1}`)
      if (!t.roles) t.roles = defaultRoles(t.nombres.length - 1, tid)
      t.roles.push({ pri: 'COR', sec: 'FIJ' })
      t.plan = null; t.obj = null; t.analisis = null; t.pinned = null
    })
    setOpenEqs(prev => new Set(prev).add(tid))
  }, [mutar, getTrab])

  const delCost = useCallback((tid: number, i: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      const bajas = t.bajas ?? []
      t.nombres.splice(i, 1)
      t.roles?.splice(i, 1)
      t.bajas = bajas.filter(b => b !== i).map(b => b > i ? b - 1 : b)
      t.plan = null; t.obj = null; t.analisis = null; t.pinned = null
    })
  }, [mutar, getTrab])

  const toggleBaja = useCallback((tid: number, i: number): boolean => {
    let ok = true
    mutar(d => {
      const t = getTrab(d, tid)
      if (!t.bajas) t.bajas = []
      const idx = t.bajas.indexOf(i)
      if (idx >= 0) {
        t.bajas.splice(idx, 1)
      } else {
        const activos = t.nombres.length - t.bajas.length
        if (activos <= 6) { ok = false; return }
        t.bajas.push(i)
      }
      t.plan = null; t.obj = null; t.analisis = null; t.pinned = null
    })
    return ok
  }, [mutar, getTrab])

  const setRolPri = useCallback((tid: number, i: number, rol: string) => {
    mutar(d => {
      const t = getTrab(d, tid)
      if (!t.roles[i]) t.roles[i] = { pri: 'COR', sec: 'FIJ' }
      t.roles[i].pri = rol as RolCode
      if (t.roles[i].sec === rol) t.roles[i].sec = 'COR'
    })
  }, [mutar, getTrab])

  const setRolSec = useCallback((tid: number, i: number, rol: string) => {
    mutar(d => {
      const t = getTrab(d, tid)
      if (!t.roles[i]) t.roles[i] = { pri: 'COR', sec: 'FIJ' }
      t.roles[i].sec = rol as RolCode
    })
  }, [mutar, getTrab])

  const setPuntuacion = useCallback((tid: number, nombre: string, pts: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      if (!t.puntuaciones) t.puntuaciones = {}
      t.puntuaciones[nombre] = pts
    })
  }, [mutar, getTrab])

  const addCostUltimo = useCallback((tid: number, nombre: string, roles: string[]) => {
    mutar(d => {
      const t = getTrab(d, tid)
      const nuevoIdx = t.nombres.length
      t.nombres.push(nombre)
      t.roles.push({ pri: roles[0] as RolCode, sec: (roles[1] || 'COR') as RolCode })
      
      if (t.plan) {
        t.plan.forEach(slot => { slot.fuera.push(nuevoIdx) })
      }
      if (t.pinned) {
        t.pinned.forEach(row => row.push('L'))
      }
      t.obj = null; t.analisis = null
    })
    setTimeout(() => completarPlan(tid), 50)
  }, [mutar, getTrab, completarPlan])

  const toggleRegla5 = useCallback((tid: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      t.regla5costaleros = !t.regla5costaleros
      t.plan = null; t.obj = null; t.analisis = null; t.pinned = null
    })
  }, [mutar, getTrab])

  const addTrab = useCallback(() => {
    mutar(d => {
      const nextId = d.trabajaderas.length + 1
      d.trabajaderas.push({
        id: nextId, nombres: ['Costalero 1', 'Costalero 2', 'Costalero 3', 'Costalero 4', 'Costalero 5', 'Costalero 6'],
        salidas: 2, roles: defaultRoles(6, nextId), tramos: [`Tramo 1 (T${nextId})`, `Tramo 2 (T${nextId})`, `Tramo 3 (T${nextId})`],
        plan: null, obj: null, analisis: null, pinned: null, bajas: [], regla5costaleros: false,
        puntuaciones: {}, tramosClaves: [],
      })
    })
  }, [mutar])

  const setNombreTramo = useCallback((tid: number, ti: number, nombre: string) => {
    mutar(d => { getTrab(d, tid).tramos[ti] = nombre })
  }, [mutar, getTrab])

  const addTramo = useCallback((tid: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      t.tramos.push(`Tramo ${t.tramos.length + 1} (T${tid})`)
      t.plan = null; t.obj = null; t.analisis = null; t.pinned = null
    })
  }, [mutar, getTrab])

  const delTramo = useCallback((tid: number, ti: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      t.tramos.splice(ti, 1)
      t.plan = null; t.obj = null; t.analisis = null; t.pinned = null
    })
  }, [mutar, getTrab])

  const setSalidas = useCallback((tid: number, salidas: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      t.salidas = salidas
      t.plan = null; t.obj = null; t.analisis = null; t.pinned = null
    })
  }, [mutar, getTrab])

  const usarBanco = useCallback((tid: number, ti: number, nombre: string) => {
    mutar(d => { getTrab(d, tid).tramos[ti] = nombre })
  }, [mutar, getTrab])

  const tramosOptimosFor = useCallback((tid: number, salidas?: number): number => {
    const t = S.trabajaderas.find(x => x.id === tid)!
    const nActivos = t.nombres.length - (t.bajas?.length ?? 0)
    return tramosOptimos(nActivos, salidas ?? t.salidas ?? 2)
  }, [S])

  const sugerirTramos = useCallback((tid: number, targetSalidas?: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      if (targetSalidas !== undefined) t.salidas = targetSalidas
      const nActivos = t.nombres.length - (t.bajas?.length ?? 0)
      const nOpt = tramosOptimos(nActivos, t.salidas ?? 2)
      const actual = t.tramos.length
      if (actual < nOpt) {
        for (let i = actual; i < nOpt; i++) t.tramos.push(`Tramo ${i + 1} (T${tid})`)
      } else if (actual > nOpt) {
        t.tramos = t.tramos.slice(0, nOpt)
      }
      t.plan = null; t.obj = null; t.analisis = null; t.pinned = null
    })
  }, [mutar, getTrab])

  const toggleTramoClave = useCallback((tid: number, ti: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      if (!t.tramosClaves) t.tramosClaves = []
      const idx = t.tramosClaves.indexOf(ti)
      if (idx >= 0) t.tramosClaves.splice(idx, 1)
      else t.tramosClaves.push(ti)
      t.tramosClaves.sort((a, b) => a - b)
    })
  }, [mutar, getTrab])

  const sugerirYCalcular = useCallback((tid: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      try {
        aplicarSugerencias(t)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        alert(msg)
      }
    })
    setTimeout(() => completarPlan(tid), 50)
  }, [mutar, getTrab, completarPlan])

  const addBanco = useCallback((nombre: string) => {
    mutar(d => { d.banco.push(nombre) })
  }, [mutar])

  const delBanco = useCallback((i: number) => {
    mutar(d => { d.banco.splice(i, 1) })
  }, [mutar])

  const calcularTrab = useCallback((tid: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      const { plan, objetivo } = calcularCiclo(t)
      ordenarDentroFisico(t, plan)
      t.plan = plan
      t.obj = objetivo
      t.analisis = analizar(plan, t.nombres.length, objetivo, t)
      t.pinned = null
    })
  }, [mutar, getTrab])

  const calcularTodo = useCallback(() => {
    mutar(d => {
      d.trabajaderas.forEach(t => {
        const { plan, objetivo } = calcularCiclo(t)
        ordenarDentroFisico(t, plan)
        t.plan = plan; t.obj = objetivo
        t.analisis = analizar(plan, t.nombres.length, objetivo, t)
        t.pinned = null
      })
    })
  }, [mutar])

  const quitarBloqueos = useCallback((tid: number) => {
    mutar(d => { getTrab(d, tid).pinned = null })
  }, [mutar, getTrab])

  const limpiarPlan = useCallback((tid: number) => {
    mutar(d => {
      const t = getTrab(d, tid)
      t.plan = null; t.obj = null; t.analisis = null
    })
  }, [mutar, getTrab])

  const setPinned = useCallback((tid: number, ti: number, ci: number, v: PinState) => {
    mutar(d => {
      const t = getTrab(d, tid)
      const p = getPinned(t)
      p[ti][ci] = v
      t.pinned = p
    })
  }, [mutar, getTrab])

  const getErroresPinned = useCallback((tid: number): string[] => {
    const t = S.trabajaderas.find(x => x.id === tid)
    if (!t) return []
    return validarPinned(t)
  }, [S])

  const confirmarSwap = useCallback((ws: SwapState) => {
    mutar(d => {
      const { a, ambosD, nuevoDentroF, nuevoFuera } = ws
      const t = getTrab(d, a.tid)
      const r = t.plan![a.ti]
      if (r) {
        r.dentroFisico = [...nuevoDentroF]
        r.dentro = nuevoDentroF.filter((x): x is number => x !== null)
        if (!ambosD) {
          r.fuera = [...nuevoFuera]
          t.analisis = analizar(t.plan!, t.nombres.length, t.obj!, t)
        }
      }
    })
    setSwapSel(null)
  }, [mutar, getTrab])

  const resetTodo = useCallback(() => {
    mutar(d => {
      d.trabajaderas = [{
        id: 1, nombres: ['Costalero 1', 'Costalero 2', 'Costalero 3', 'Costalero 4', 'Costalero 5', 'Costalero 6'],
        salidas: 2, roles: defaultRoles(6, 1), tramos: [`Tramo 1 (T1)`, `Tramo 2 (T1)`, `Tramo 3 (T1)`],
        plan: null, obj: null, analisis: null, pinned: null, bajas: [], regla5costaleros: false,
        puntuaciones: {}, tramosClaves: [],
      }]
      d.banco = []
    })
  }, [mutar])

  const toggleEq = useCallback((id: number) => {
    setOpenEqs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const openSheet = useCallback((s: ActiveSheet) => setActiveSheet(s), [])
  const closeSheet = useCallback(() => setActiveSheet(null), [])
  const toggleTema = useCallback(() => setTema(t => t === 'dark' ? 'light' : 'dark'), [])

  return (
    <EstadoContext.Provider value={{
      pasos, pid, setPid, S, nombrePaso, nombreCuadrilla,
      activePage, setActivePage,
      activeSheet, openSheet, closeSheet,
      tema, toggleTema,
      swapSel, setSwapSel,
      cellTarget, setCellTarget,
      bancoTarget, setBancoTarget,
      openEqs, toggleEq,
      setNombre, addCost, delCost, toggleBaja, setRolPri, setRolSec, toggleRegla5, addTrab, setPuntuacion, addCostUltimo,
      setNombreTramo, addTramo, delTramo, setSalidas, usarBanco, tramosOptimosFor, sugerirTramos, toggleTramoClave, sugerirYCalcular,
      addBanco, delBanco,
      calcularTodo, calcularTrab, completarPlan, limpiarPlan, quitarBloqueos, setPinned, getErroresPinned,
      confirmarSwap,
      resetTodo,
    }}>
      {children}
    </EstadoContext.Provider>
  )
}

export function useEstado(): EstadoCtx {
  const ctx = useContext(EstadoContext)
  if (!ctx) throw new Error('useEstado must be used within EstadoProvider')
  return ctx
}
