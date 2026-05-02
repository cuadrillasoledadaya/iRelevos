// ══════════════════════════════════════════════════════════════════
// TESTS UNITARIOS — algoritmos de rotación (Strict TDD Mode)
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { objSalidas, calcularCiclo, analizar, completarAuto, tramosOptimos, generarSugerencias, aplicarSugerencias, getFueraPorTramo, migrarDatos, countPinned, datosVacios } from '../algoritmos'

describe('algoritmos', () => {
  describe('objSalidas', () => {
    // RED: Test escrito primero que debe fallar porque la función aún no existe
    it('debería calcular salidas equitativas para costaleros', () => {
      // Given: 7 costaleros, 3 tramos, 2 salidas (F=2), sin regla 5
      const total = 7
      const numTramos = 3
      const salidas = 2
      const aplicaRegla5 = false

      // When: calculamos la distribución objetivo
      const resultado = objSalidas(total, numTramos, salidas, aplicaRegla5)

      // Then: cada costalero debe tener asignaciones válidas
      expect(resultado).toBeDefined()
      expect(Object.keys(resultado)).toHaveLength(total)
      
      // La suma total debe igual el número total de slots fuera (tramos × F)
      const F = total - 5 // 2
      const sumaTotal = Object.values(resultado).reduce((sum, val) => sum + val, 0)
      expect(sumaTotal).toBe(numTramos * F)
    })

    it('debería aplicar regla 5 costaleros cuando total = 5', () => {
      // Given: 5 costaleros (regla 5 activa), 2 tramos, 1 salida
      const total = 5
      const numTramos = 2
      const salidas = 1
      const aplicaRegla5 = true

      // When: calculamos distribución con regla 5
      const resultado = objSalidas(total, numTramos, salidas, aplicaRegla5)

      // Debug: imprimir resultado para entender
      console.log('Resultado regla 5:', resultado)
      console.log('Suma total:', Object.values(resultado).reduce((sum, val) => sum + val, 0))

      // Then: todos deben tener asignaciones válidas
      expect(resultado).toBeDefined()
      Object.values(resultado).forEach(asignaciones => {
        expect(asignaciones).toBeGreaterThanOrEqual(0)
      })
      
      // La suma total debe igual el número total de salidas
      const sumaTotal = Object.values(resultado).reduce((sum, val) => sum + val, 0)
      expect(sumaTotal).toBe(numTramos * salidas)
    })

    it('debería manejo caso límite: 1 costalero', () => {
      // Given: 1 costalero, 2 tramos, 1 salida
      const total = 1
      const numTramos = 2
      const salidas = 1
      const aplicaRegla5 = false

      // When: calculamos distribución para caso extremo
      const resultado = objSalidas(total, numTramos, salidas, aplicaRegla5)

      // Then: el único costalero debe tener todas las salidas
      expect(resultado).toBeDefined()
      expect(resultado[0]).toBe(numTramos * salidas)
    })
  })

  describe('calcularCiclo', () => {
    it('debería generar plan válido para trabajadera estándar', () => {
      // Given: trabajadera con 6 costaleros, 3 tramos, 2 salidas
      const trabajadera = {
        id: 1,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
        salidas: 2,
        regla5costaleros: false,
        tramos: ['Tramo 1', 'Tramo 2', 'Tramo 3']
      }

      // When: calculamos el ciclo completo
      const resultado = calcularCiclo(trabajadera)

      // Then: debe generar plan con estructura correcta
      expect(resultado.plan).toHaveLength(trabajadera.tramos.length)
      expect(resultado.objetivo).toBeDefined()
      
      // Cada tramo debe tener 5 costaleros dentro y 1 fuera (6-5=1)
      resultado.plan.forEach(tramo => {
        expect(tramo.dentro).toHaveLength(5)
        expect(tramo.fuera).toHaveLength(1)
        expect(tramo.dentro.concat(tramo.fuera)).toHaveLength(6)
      })
    })

    it('debería aplicar regla 5 costaleros cuando total = 5', () => {
      // Given: trabajadera con 5 costaleros (regla 5 activa)
      const trabajadera = {
        id: 2,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María'],
        salidas: 1,
        regla5costaleros: true,
        tramos: ['Tramo 1', 'Tramo 2']
      }

      // When: calculamos ciclo con regla 5
      const resultado = calcularCiclo(trabajadera)

      // Then: cada tramo debe tener 4 dentro y 1 fuera (regla 5)
      expect(resultado.plan).toHaveLength(trabajadera.tramos.length)
      resultado.plan.forEach(tramo => {
        expect(tramo.dentro).toHaveLength(4)
        expect(tramo.fuera).toHaveLength(1)
      })
    })

    it('debería manejo casos inválidos retornando arrays vacíos', () => {
      // Given: trabajadera con parámetros inválidos
      const trabajaderaInvalida = {
        id: 3,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María'],
        salidas: 2,
        regla5costaleros: false,
        tramos: [] // 0 tramos
      }

      // When: calculamos ciclo con parámetros inválidos
      const resultado = calcularCiclo(trabajaderaInvalida)

      // Then: debe retornar arrays vacíos
      expect(resultado.plan).toHaveLength(0)
      expect(resultado.objetivo).toEqual({})
    })
  })

  describe('analizar', () => {
    it('debería validar plan correctamente contra objetivo', () => {
      // Given: plan generado y objetivo esperado (2 tramos × 1 salida = 2 asignaciones totales)
      const plan = [
        { dentro: [0, 1, 2, 3, 4], fuera: [5] },
        { dentro: [0, 1, 2, 3, 5], fuera: [4] }
      ]
      const total = 6
      const obj = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 } // Solo 2 asignaciones fuera en total

      // When: analizamos el plan
      const resultado = analizar(plan, total, obj)

      // Then: debe validar correctamente
      expect(resultado.conteo).toEqual({ '0': 0, '1': 0, '2': 0, '3': 0, '4': 1, '5': 1 })
      expect(resultado.okObj).toBe(true)
      expect(resultado.dentro5).toBe(true)
      expect(resultado.primer).toEqual([5])
      expect(resultado.ultimo).toEqual([4])
    })

    it('debería detectar violaciones en constraints', () => {
      // Given: plan con violación de objetivo
      const plan = [
        { dentro: [0, 1, 2, 3, 4], fuera: [5] },
        { dentro: [0, 1, 2, 3, 4], fuera: [5] } // costalero 5 aparece 2 veces, debería ser 1
      ]
      const total = 6
      const obj = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }

      // When: analizamos el plan inválido
      const resultado = analizar(plan, total, obj)

      // Then: debe detectar la violación
      expect(resultado.okObj).toBe(false)
    })

    it('debería aplicar regla 5 correctamente en análisis', () => {
      // Given: trabajadera con 5 costaleros y regla 5 activa
      const trabajadera = {
        id: 4,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María'],
        regla5costaleros: true
      }
      const plan = [
        { dentro: [0, 1, 2, 3], fuera: [4] }, // 4 dentro (regla 5)
        { dentro: [0, 1, 2, 4], fuera: [3] }  // 4 dentro (regla 5)
      ]
      const total = 5
      const obj = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }

      // When: analizamos con regla 5
      const resultado = analizar(plan, total, obj, trabajadera)

      // Then: debe reconocer 4 dentro por tramo
      expect(resultado.dentro5).toBe(true)
    })
  })

  describe('tramosOptimos', () => {
    it('debería calcular número óptimo de tramos para estándar', () => {
      // Given: 6 costaleros, 2 salidas
      const total = 6
      const salidas = 2

      // When: calculamos tramos óptimos
      const resultado = tramosOptimos(total, salidas)

      // Then: debe retornar número válido (> 0)
      expect(resultado).toBeGreaterThan(0)
      expect(resultado).toBeLessThanOrEqual(total * 3) // límite superior
    })

    it('debería manejo caso con regla 5 costaleros', () => {
      // Given: 5 costaleros, 1 salida (regla 5 aplicable)
      const total = 5
      const salidas = 1

      // When: calculamos tramos óptimos
      const resultado = tramosOptimos(total, salidas)

      // Debug: imprimir resultado para entender
      console.log('Tramos óptimos resultado:', resultado)
      console.log('Total costaleros:', total, 'Salidas:', salidas)

      // Then: debe retornar número válido
      expect(resultado).toBeGreaterThan(0)
    })

    it('debería retornar 0 para casos inválidos', () => {
      // Given: parámetros que hacen inválido el cálculo
      const total = 4 // total - 5 = -1 (inválido)
      const salidas = 2

      // When: calculamos tramos óptimos para caso inválido
      const resultado = tramosOptimos(total, salidas)

      // Then: debe retornar 0
      expect(resultado).toBe(0)
    })
  })

  describe('completarAuto', () => {
    it('debería generar plan automático con pinned states', () => {
      // Given: trabajadera con pinned states válidos
      const trabajadera = {
        id: 5,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
        salidas: 2,
        regla5costaleros: false,
        tramos: ['Tramo 1', 'Tramo 2', 'Tramo 3'],
        pinned: [
          ['D', 'D', 'L', 'L', 'L', 'L'], // Juan y Pedro fijos dentro en tramo 1
          ['L', 'L', 'D', 'L', 'L', 'L'], // Luis fijo dentro en tramo 2
          ['L', 'L', 'L', 'D', 'D', 'L']  // Ana y María fijos dentro en tramo 3
        ]
      }

      // When: completamos automáticamente
      const resultado = completarAuto(trabajadera)

      // Then: debe generar plan válido sin errores
      expect(resultado.error).toBeUndefined()
      expect(resultado.plan).toHaveLength(trabajadera.tramos.length)
      expect(resultado.obj).toBeDefined()
      expect(resultado.analisis).toBeDefined()
      
      // Verificar que los pinned states se respetan
      expect(resultado.plan[0].dentro).toContain(0) // Juan (pinned D)
      expect(resultado.plan[0].dentro).toContain(1) // Pedro (pinned D)
      expect(resultado.plan[1].dentro).toContain(2) // Luis (pinned D)
      expect(resultado.plan[2].dentro).toContain(3) // Ana (pinned D)
      expect(resultado.plan[2].dentro).toContain(4) // María (pinned D)
    })

    it('debería detectar y reportar errores en pinned states inválidos', () => {
      // Given: trabajadera con pinned states inválidos
      const trabajaderaInvalida = {
        id: 6,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
        salidas: 2,
        regla5costaleros: false,
        tramos: ['Tramo 1'],
        pinned: [
          ['D', 'D', 'D', 'D', 'D', 'D'] // 6 fijos dentro (máx. 5)
        ]
      }

      // When: intentamos completar automáticamente
      const resultado = completarAuto(trabajaderaInvalida)

      // Then: debe reportar errores
      expect(resultado.error).toBeDefined()
      expect(resultado.error).toHaveLength(2)
      expect(resultado.error[0]).toContain('máx. 5')
      expect(resultado.error[1]).toContain('imposible completar')
    })

    it('debería manejo caso sin pinned states', () => {
      // Given: trabajadera sin pinned states
      const trabajaderaSinPinned = {
        id: 7,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
        salidas: 2,
        regla5costaleros: false,
        tramos: ['Tramo 1', 'Tramo 2'],
        pinned: null
      }

      // When: completamos automáticamente
      const resultado = completarAuto(trabajaderaSinPinned)

      // Then: debe generar plan sin errores
      expect(resultado.error).toBeUndefined()
      expect(resultado.plan).toHaveLength(trabajaderaSinPinned.tramos.length)
    })
  })

  describe('generarSugerencias', () => {
    it('debería generar sugerencias con costaleros puntuados', () => {
      // Given: trabajadera con puntuaciones
      const trabajadera = {
        id: 8,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
        salidas: 2,
        puntuaciones: {
          'Juan': 10,
          'Pedro': 8,
          'Luis': 5,
          'Ana': 3,
          'María': 1,
          'Sofía': 0
        },
        tramosClaves: [0, 2],
        tramos: ['Tramo 1', 'Tramo 2', 'Tramo 3']
      }

      // When: generamos sugerencias
      const resultado = generarSugerencias(trabajadera)

      // Then: debe devolver top 3 y tramos claves
      expect(resultado.top3).toHaveLength(3)
      expect(resultado.top3[0].nombre).toBe('Juan')
      expect(resultado.top3[0].puntuacion).toBe(10)
      expect(resultado.top3[1].nombre).toBe('Pedro')
      expect(resultado.top3[1].puntuacion).toBe(8)
      expect(resultado.top3[2].nombre).toBe('Luis')
      expect(resultado.top3[2].puntuacion).toBe(5)
      expect(resultado.tramosClaves).toEqual([0, 2])
      expect(resultado.ultimoIdx).toBe(2)
    })

    it('debería manejo caso sin puntuaciones', () => {
      // Given: trabajadera sin puntuaciones positivas
      const trabajadera = {
        id: 9,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
        salidas: 2,
        puntuaciones: {
          'Juan': 0,
          'Pedro': 0,
          'Luis': 0,
          'Ana': 0,
          'María': 0,
          'Sofía': 0
        },
        tramos: ['Tramo 1', 'Tramo 2']
      }

      // When: generamos sugerencias
      const resultado = generarSugerencias(trabajadera)

      // Then: debe devolver array vacío
      expect(resultado.top3).toHaveLength(0)
      expect(resultado.tramosClaves).toEqual([])
      expect(resultado.ultimoIdx).toBe(1)
    })

    it('debería manejo caso sin tramosClaves', () => {
      // Given: trabajadera sin tramosClaves definido
      const trabajadera = {
        id: 10,
        nombres: ['Juan', 'Pedro', 'Luis'],
        salidas: 1,
        puntuaciones: {
          'Juan': 15,
          'Pedro': 10,
          'Luis': 5
        },
        tramos: ['Tramo 1'] // tramos es requerido
      }

      // When: generamos sugerencias
      const resultado = generarSugerencias(trabajadera)

      // Then: debe usar array vacío para tramosClaves
      expect(resultado.top3).toHaveLength(3)
      expect(resultado.tramosClaves).toEqual([])
      expect(resultado.ultimoIdx).toBe(0)
    })
  })

  describe('aplicarSugerencias', () => {
    it('debería aplicar sugerencias a trabajadera', () => {
      // Given: trabajadera con sugerencias
      const trabajadera = {
        id: 11,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María'],
        salidas: 2,
        puntuaciones: {
          'Juan': 20,
          'Pedro': 15,
          'Luis': 10,
          'Ana': 5,
          'María': 1
        },
        tramosClaves: [0, 1],
        tramos: ['Tramo 1', 'Tramo 2'],
        pinned: [
          ['L', 'L', 'L', 'L', 'L'],
          ['L', 'L', 'L', 'L', 'L']
        ]
      }

      // When: aplicamos sugerencias
      expect(() => aplicarSugerencias(trabajadera)).not.toThrow()

      // Then: debe haber aplicado los pinned states
      expect(trabajadera.pinned[0][0]).toBe('D') // Juan en tramo 1
      expect(trabajadera.pinned[0][1]).toBe('D') // Pedro en tramo 1
      expect(trabajadera.pinned[1][2]).toBe('D') // Luis en tramo 2
    })

    it('debería lanzar error sin puntuaciones', () => {
      // Given: trabajadera sin puntuaciones positivas
      const trabajadera = {
        id: 12,
        nombres: ['Juan', 'Pedro', 'Luis'],
        salidas: 1,
        puntuaciones: {
          'Juan': 0,
          'Pedro': 0,
          'Luis': 0
        },
        tramos: ['Tramo 1']
      }

      // When/Then: debe lanzar error
      expect(() => aplicarSugerencias(trabajadera)).toThrow('¡Error! No hay ningún costalero con valoración asignada')
    })
  })

  describe('getFueraPorTramo', () => {
    it('debería retornar número correcto para trabajadera estándar', () => {
      // Given: trabajadera estándar sin regla 5
      const trabajadera = {
        id: 13,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
        salidas: 2,
        regla5costaleros: false
      }

      // When: calculamos fuera por tramo
      const resultado = getFueraPorTramo(trabajadera)

      // Then: debe retornar total - 5
      expect(resultado).toBe(1) // 6 - 5 = 1
    })

    it('debería retornar 1 para regla 5 costaleros', () => {
      // Given: trabajadera con regla 5
      const trabajadera = {
        id: 14,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María'],
        salidas: 1,
        regla5costaleros: true
      }

      // When: calculamos fuera por tramo
      const resultado = getFueraPorTramo(trabajadera)

      // Then: debe retornar 1
      expect(resultado).toBe(1)
    })
  })

  describe('migrarDatos', () => {
    it('debería migrar datos incompletos a estructura completa', () => {
      // Given: datos con campos faltantes
      const datosIncompletos = {
        banco: ['Salida Iglesia', 'Calle Real'],
        trabajaderas: [
          {
            id: 1,
            nombres: null, // nulo
            salidas: undefined, // faltante
            roles: [], // faltante
            pinned: undefined, // faltante
            bajas: undefined, // faltante
            regla5costaleros: undefined, // faltante
            puntuaciones: undefined, // faltante
            tramosClaves: undefined, // faltante
            plan: null,
            obj: null,
            analisis: null
          }
        ]
      }

      // When: migramos datos
      const resultado = migrarDatos(datosIncompletos)

      // Then: debe completar campos faltantes
      expect(resultado.trabajaderas[0].nombres).toHaveLength(6)
      expect(resultado.trabajaderas[0].salidas).toBe(2)
      expect(resultado.trabajaderas[0].roles).toHaveLength(6)
      expect(resultado.trabajaderas[0].pinned).toBeNull()
      expect(resultado.trabajaderas[0].bajas).toEqual([])
      expect(resultado.trabajaderas[0].regla5costaleros).toBe(false)
      expect(resultado.trabajaderas[0].puntuaciones).toEqual({})
      expect(resultado.trabajaderas[0].tramosClaves).toEqual([])
    })

    it('debería limpiar plan inválido', () => {
      // Given: datos con plan inválido
      const datosConPlanInvalido = {
        banco: ['Salida Iglesia'],
        trabajaderas: [
          {
            id: 1,
            nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
            salidas: 2,
            roles: ['PAT', 'COS', 'PAT', 'COS', 'PAT', 'COS'],
            plan: [{ dentro: ['10'], fuera: [] }], // índice inválido
            obj: null,
            analisis: null
          }
        ]
      }

      // When: migramos datos
      const resultado = migrarDatos(datosConPlanInvalido)

      // Then: debe limpiar plan inválido
      expect(resultado.trabajaderas[0].plan).toBeNull()
      expect(resultado.trabajaderas[0].obj).toBeNull()
      expect(resultado.trabajaderas[0].analisis).toBeNull()
    })

    it('debería corregir roles cuando longitud no coincide', () => {
      // Given: datos con roles de longitud incorrecta
      const datosConRolesInvalidos = {
        banco: ['Salida Iglesia'],
        trabajaderas: [
          {
            id: 2,
            nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
            salidas: 2,
            roles: ['PAT', 'COS'], // solo 2, pero debería ser 6
            pinned: null,
            bajas: [],
            regla5costaleros: false,
            puntuaciones: {},
            tramosClaves: []
          }
        ]
      }

      // When: migramos datos
      const resultado = migrarDatos(datosConRolesInvalidos)

      // Then: debe corregir longitud de roles
      expect(resultado.trabajaderas[0].roles).toHaveLength(6)
    })

    it('debería inicializar planes como array vacío en datos legacy', () => {
      // Given: datos sin campo planes (legacy)
      const datosLegacy = {
        banco: ['Salida Iglesia'],
        trabajaderas: [
          {
            id: 1,
            nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María', 'Sofía'],
            salidas: 2,
            roles: [
              { pri: 'COS', sec: 'FIJ' },
              { pri: 'COS', sec: 'FIJ' },
              { pri: 'FIJ', sec: 'COS' },
              { pri: 'FIJ', sec: 'COS' },
              { pri: 'COR', sec: 'FIJ' },
              { pri: 'COR', sec: 'FIJ' },
            ],
            pinned: null,
            bajas: [],
            regla5costaleros: false,
            puntuaciones: {},
            tramosClaves: [],
            tramos: ['Tramo 1 (T1)'],
            plan: null,
            obj: null,
            analisis: null,
          }
        ]
      }

      // When: migramos datos legacy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultado = migrarDatos(datosLegacy as any)

      // Then: debe tener planes inicializado como array vacío
      expect(resultado.planes).toBeDefined()
      expect(resultado.planes).toEqual([])
    })
  })

  describe('datosVacios', () => {
    it('debería incluir planes vacío por defecto', () => {
      // When: creamos datos vacíos
      const resultado = datosVacios()

      // Then: debe incluir campo planes como array vacío
      expect(resultado.planes).toBeDefined()
      expect(resultado.planes).toEqual([])
    })
  })

  describe('countPinned', () => {
    it('debería contar pinned states correctamente', () => {
      // Given: trabajadera con pinned states mixtos
      const trabajadera = {
        id: 15,
        nombres: ['Juan', 'Pedro', 'Luis', 'Ana', 'María'],
        tramos: ['Tramo 1', 'Tramo 2'],
        pinned: [
          ['D', 'F', 'L', 'D', 'L'], // dentro: 2, fuera: 1
          ['L', 'LF', 'L', 'D', 'F']  // dentro: 1, fuera: 2
        ]
      }

      // When: contamos pinned states
      const resultado = countPinned(trabajadera)

      // Then: debe contar correctamente
      expect(resultado.d).toBe(3) // total D
      expect(resultado.f).toBe(3) // total F + LF
      expect(resultado.total).toBe(6) // total D + F
    })

    it('debería manejo caso sin pinned states', () => {
      // Given: trabajadera sin pinned states
      const trabajadera = {
        id: 16,
        nombres: ['Juan', 'Pedro'],
        tramos: ['Tramo 1'],
        pinned: null
      }

      // When: contamos pinned states
      const resultado = countPinned(trabajadera)

      // Then: debe retornar ceros
      expect(resultado.d).toBe(0)
      expect(resultado.f).toBe(0)
      expect(resultado.total).toBe(0)
    })
  })
})