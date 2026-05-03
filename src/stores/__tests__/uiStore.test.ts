// ══════════════════════════════════════════════════════════════════
// TESTS — uiStore.ts (Strict TDD — Phase 2.2 written FIRST, 2.1 after)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest'
import { uiStore, createUIStore } from '../uiStore'

function resetUIStore() {
  localStorage.clear()
  uiStore.setState({
    activePage: 'home',
    activeSheet: null,
    tema: 'light',
    openEqs: new Set([1]),
    swapSel: null,
    cellTarget: null,
    bancoTarget: null,
    censusTarget: null,
  })
}

describe('uiStore', () => {
  beforeEach(() => {
    resetUIStore()
  })

  // ── activePage ─────────────────────────────────────────────────

  describe('activePage', () => {
    it('debería inicializar activePage en "home"', () => {
      const store = uiStore
      expect(store.getState().activePage).toBe('home')
    })

    it('debería cambiar a "equipo" con setActivePage', () => {
      const store = uiStore
      store.getState().setActivePage('equipo')
      expect(store.getState().activePage).toBe('equipo')
    })

    it('debería persistir activePage en localStorage con clave cpwa_active_page', () => {
      // Limpiar localStorage antes
      localStorage.removeItem('cpwa_active_page')

      const storeA = uiStore
      storeA.getState().setActivePage('plan')

      // Simular recarga: nueva store debería leer de localStorage
      const storeB = createUIStore()
      expect(storeB.getState().activePage).toBe('plan')
    })
  })

  // ── activeSheet ────────────────────────────────────────────────

  describe('activeSheet', () => {
    it('debería inicializar activeSheet en null', () => {
      const store = uiStore
      expect(store.getState().activeSheet).toBeNull()
    })

    it('debería abrir un sheet con openSheet', () => {
      const store = uiStore
      store.getState().openSheet('banco')
      expect(store.getState().activeSheet).toBe('banco')
    })

    it('debería cerrar el sheet con closeSheet', () => {
      const store = uiStore
      store.getState().openSheet('celda')
      store.getState().closeSheet()
      expect(store.getState().activeSheet).toBeNull()
    })
  })

  // ── tema ───────────────────────────────────────────────────────

  describe('tema', () => {
    it('debería inicializar tema en "light"', () => {
      const store = uiStore
      expect(store.getState().tema).toBe('light')
    })

    it('debería alternar a dark con toggleTema', () => {
      const store = uiStore
      store.getState().toggleTema()
      expect(store.getState().tema).toBe('dark')
    })

    it('debería alternar de vuelta a light con otro toggleTema', () => {
      const store = uiStore
      store.getState().toggleTema() // dark
      store.getState().toggleTema() // light
      expect(store.getState().tema).toBe('light')
    })

    it('debería persistir tema en localStorage con clave cpwa_tema', () => {
      localStorage.removeItem('cpwa_tema')

      const storeA = uiStore
      storeA.getState().toggleTema() // dark

      const storeB = createUIStore()
      expect(storeB.getState().tema).toBe('dark')
    })
  })

  // ── openEqs / toggleEq ─────────────────────────────────────────

  describe('openEqs', () => {
    it('debería inicializar con Set([1])', () => {
      const store = uiStore
      const eqs = store.getState().openEqs
      expect(eqs).toBeInstanceOf(Set)
      expect(eqs.has(1)).toBe(true)
    })

    it('debería agregar un id con toggleEq si no está presente', () => {
      const store = uiStore
      store.getState().toggleEq(3)
      expect(store.getState().openEqs.has(3)).toBe(true)
    })

    it('debería remover un id con toggleEq si ya está presente', () => {
      const store = uiStore
      // El id 1 ya está en el Set inicial
      expect(store.getState().openEqs.has(1)).toBe(true)
      store.getState().toggleEq(1)
      expect(store.getState().openEqs.has(1)).toBe(false)
    })

    it('debería mantener otros ids al remover uno', () => {
      const store = uiStore
      store.getState().toggleEq(3) // agrega 3
      store.getState().toggleEq(1) // remueve 1
      expect(store.getState().openEqs.has(1)).toBe(false)
      expect(store.getState().openEqs.has(3)).toBe(true)
    })
  })

  // ── swapSel ─────────────────────────────────────────────────────

  describe('swapSel', () => {
    it('debería inicializar swapSel en null', () => {
      const store = uiStore
      expect(store.getState().swapSel).toBeNull()
    })

    it('debería setear swapSel con setSwapSel', () => {
      const store = uiStore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partial = { ambosD: true, todoOk: false } as any
      store.getState().setSwapSel(partial)
      expect(store.getState().swapSel).toEqual(partial)
    })

    it('debería volver a null con setSwapSel(null)', () => {
      const store = uiStore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store.getState().setSwapSel({} as any)
      store.getState().setSwapSel(null)
      expect(store.getState().swapSel).toBeNull()
    })
  })

  // ── cellTarget ──────────────────────────────────────────────────

  describe('cellTarget', () => {
    it('debería inicializar cellTarget en null', () => {
      const store = uiStore
      expect(store.getState().cellTarget).toBeNull()
    })

    it('debería setear cellTarget con setCellTarget', () => {
      const store = uiStore
      store.getState().setCellTarget({ tid: 1, ti: 0, ci: 2 })
      expect(store.getState().cellTarget).toEqual({ tid: 1, ti: 0, ci: 2 })
    })

    it('debería volver a null con setCellTarget(null)', () => {
      const store = uiStore
      store.getState().setCellTarget({ tid: 1, ti: 0, ci: 2 })
      store.getState().setCellTarget(null)
      expect(store.getState().cellTarget).toBeNull()
    })
  })

  // ── bancoTarget ─────────────────────────────────────────────────

  describe('bancoTarget', () => {
    it('debería inicializar bancoTarget en null', () => {
      const store = uiStore
      expect(store.getState().bancoTarget).toBeNull()
    })

    it('debería setear bancoTarget con setBancoTarget', () => {
      const store = uiStore
      store.getState().setBancoTarget({ tid: 1, ti: 0 })
      expect(store.getState().bancoTarget).toEqual({ tid: 1, ti: 0 })
    })
  })

  // ── censusTarget ────────────────────────────────────────────────

  describe('censusTarget', () => {
    it('debería inicializar censusTarget en null', () => {
      const store = uiStore
      expect(store.getState().censusTarget).toBeNull()
    })

    it('debería setear censusTarget con setCensusTarget', () => {
      const store = uiStore
      store.getState().setCensusTarget({ tid: 1, ci: 3 })
      expect(store.getState().censusTarget).toEqual({ tid: 1, ci: 3 })
    })
  })
})
