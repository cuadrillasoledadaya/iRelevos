import { describe, it, expect } from 'vitest'
import { create } from 'zustand'
import { createMutar } from '../mutar'
import { createTrabajaderaStore } from '../trabajaderaStore'
import { getTrab } from '../helpers'
import type { DatosPerfil, PasoDB } from '@/lib/types'

function createTestEnv() {
  const content: DatosPerfil = {
    banco: [],
    planes: [],
    trabajaderas: [
      {
        id: 1,
        nombres: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],
        roles: [
          { pri: 'COS', sec: 'FIJ' },
          { pri: 'COS', sec: 'FIJ' },
          { pri: 'COS', sec: 'FIJ' },
          { pri: 'COS', sec: 'FIJ' },
          { pri: 'COR', sec: 'FIJ' },
          { pri: 'COR', sec: 'FIJ' },
        ],
        salidas: 2,
        tramos: ['T1', 'T2', 'T3'],
        bajas: [],
        regla5costaleros: false,
        plan: null,
        obj: null,
        analisis: null,
        pinned: null,
        puntuaciones: {},
        tramosClaves: [],
      },
    ],
  }

  const pasos: PasoDB[] = [
    {
      id: 'test-pid',
      nombre_paso: 'Paso Test',
      nombre_cuadrilla: 'Test',
      num_trabajaderas: 1,
      content: JSON.parse(JSON.stringify(content)),
      created_at: '2025-01-01',
    },
  ]

  // Store tipo projectStore
  const projectStore = create<{ pasos: PasoDB[]; pid: string; S: DatosPerfil }>()(() => ({
    pasos: JSON.parse(JSON.stringify(pasos)),
    pid: 'test-pid',
    S: content,
  }))

  const mutar = createMutar(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projectStore.setState as any,
    projectStore.getState,
    () => {}, // no-op saveCloud
  )

  const trabajaderaStore = createTrabajaderaStore(mutar, getTrab, () => {})

  return { projectStore, trabajaderaStore }
}

describe('Integración: cambio de rol', () => {
  it('debería actualizar S en projectStore cuando cambia un rol', () => {
    const { projectStore, trabajaderaStore } = createTestEnv()

    const antes = projectStore.getState().S.trabajaderas[0].roles[0].pri
    expect(antes).toBe('COS')

    trabajaderaStore.getState().setRolPri(1, 0, 'PAT')

    const despues = projectStore.getState().S.trabajaderas[0].roles[0].pri
    expect(despues).toBe('PAT')
  })

  it('debería notificar a los suscriptores de projectStore', () => {
    const { projectStore, trabajaderaStore } = createTestEnv()

    let cambios = 0
    const unsub = projectStore.subscribe(() => {
      cambios++
    })

    trabajaderaStore.getState().setRolPri(1, 0, 'PAT')

    expect(cambios).toBeGreaterThan(0)
    unsub()
  })
})
