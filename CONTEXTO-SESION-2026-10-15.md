# 📌 Contexto de sesión — Cuadrilla Doblada

**Fecha:** 2026-10-15 (jueves noche)
**Estado:** Pausa · Continuaremos mañana

---

## 🗂️ Proyecto

- **Ruta:** `/home/chiqui/Proyectos ai/relevos antigra`
- **Stack:** Next.js 14.2.35 + React 18 + TypeScript 5 + Zustand + Supabase + Vitest
- **Nombre:** `relevos-app` v1.4.4
- **Dominio:** PWA para gestionar **relevos de costaleros** (cargadores) en pasos de Semana Santa
- **Deploy prod:** `i-relevos.vercel.app`
- **Git:** `main` · Commits están limpios, no hay nada sin commitear del lado de git del proyecto

## 🎯 Feature en juego

**Cuadrilla Doblada** — cuando una trabajadera tiene 10+ costaleros, se divide en 2 cuadrillas (A y B) de 5+ cada una para rotar relevos sin que un mismo costalero cargue demasiados tramos seguidos.

### Archivos críticos

| Archivo | Líneas | Qué hace |
|---|---|---|
| `src/lib/algoritmos/cuadrillaDoblada.ts` | 1084 | Núcleo del algoritmo (v1.4.0 cadencia mini-ciclo + v1.4.1 inversión disp) |
| `src/lib/algoritmos/cuadrillaDoblada.test.ts` | 2080 | 113 tests, todos pasan actualmente |
| `src/lib/algoritmos/dispatcher.ts` | 442 | `dispatchSimulacion()` — punto único de entrada (M4) |
| `src/lib/algoritmos/rotacion.ts` | 212 | `calcularCiclo()` — split entre estándar y doblada |
| `src/stores/trabajaderaStore.ts` | 473 | Acciones de UI (toggle, distribución, tipos P/S) |
| `src/components/pages/ConfigPage.tsx` | 940 | UI para activar doblada y editar tipos |
| `src/components/pages/PlanPage.tsx` | 1100+ | Vista del plan calculado |

### Reglas de negocio vigentes

- **Regla 1** (v1.3.2): Un relevo nunca cruza personas entre A y B. `sale` y `entra` son siempre de la misma cuadrilla. ✅ Implementada
- **Regla 2** (v1.3.2): Ningún costalero puede estar fuera > 3 tramos consecutivos (streak). ⚠️ Parcialmente rota en LOAD case fallback
- **Cadencia mini-ciclo estricta 2-2** (v1.4.0): Turno 0=A hace 2 relevos (LOAD+SWAP), turno 1=B hace 2 relevos, etc. Ignora `tramosTipo`, solo usa posición. ⚠️ Esto es el "Bug 3" del usuario
- **Inversión del disp en transición** (v1.4.1): `disponibles = [...cargando, ...disponibles]` (just-unloaded al frente). Solucionó rotación atrapada de v1.3.2

---

## 🐛 Bugs confirmados por el usuario

### **Bug 3 — Cadencia no respeta tipos P/S marcados** (CONFIRMADO, prioritario)

El usuario dice: "no respeta los tipos P/S que yo marqué". El algoritmo actual fuerza cadencia **por posición** (mod 2 del turno) sin mirar `t.tramosTipo`. Si el capataz marca `[P,P,P,S,S,S]` espera agrupación tipo; el algoritmo da `[A,A,B,B,A,A]`.

### **Bug 1 — Regla 2 violada en algunos tramos** (CONFIRMADO, secundario)

Tracejando manualmente con A=7, B=7, `[P,S,P,S] × 2 salidas`, encontré:
- c7 llega a streak=4 después de R4 (B 1er SWAP ciclo 0)
- c14 llega a streak=4 después de R4
- c1 llega a streak=4 después de R5 (A LOAD ciclo 1)

**Causa raíz:** En `aplicarRelevoIntermedio` LOAD case, la regla2 solo rescata **un** costalero por slot. Cuando hay 2+ candidatos en `restantes` con streak≥3, el segundo espera otro slot y su streak sube a 4 antes de ser rescatado.

**Síntoma en la app real:** Caso del screenshot (12 costaleros `[Victor, Joaki, Manu, Javier, C5..C12]`, 12 tramos, 2 salidas), cada costalero tiene 5 D's × 7 F's — no detecto violación visible en mi repro.

### **Bug 2 — Rotación lenta para costaleros "del medio"** (NO priorizado, sin confirmar)

c4, c5 en CASO 1 (mi simulación con 12 costaleros 6/6) no hacen "swap real" — se mueven mecánicamente entre cargando y disp en cada transición. No confirmado por el usuario.

---

## 🔬 Lo que reproduje hoy (trace manual + ejecuté el algoritmo)

**Scripts temporales creados y borrados** (`repro-caso-real.ts`, `debug-caso.ts`, `debug-probe.ts`) — los borré tras verificar. **No dejar archivos `*.ts` en la raíz si recreamos.**

### Salida real del algoritmo para el caso del screenshot

```
CADENCIA: A,A,B,B,A,A,B,B (repite por salidas)

R 1  A LOAD  entra=[Victor, Joaki, Manu, Javier, C5]      sale=[]
R 2  A SWAP  sale=[Victor]                                entra=[C6]
R 3  B LOAD  entra=[C7, C8, C9, C10, C11]                sale=[]
R 4  B SWAP  sale=[C7]                                    entra=[C12]
R 5  A LOAD  entra=[Manu, Javier, C5, C6, Victor]         sale=[]
R 6  A SWAP  sale=[Manu]                                  entra=[Joaki]
R 7  B LOAD  entra=[C9, C10, C11, C12, C7]                sale=[]
R 8  B SWAP  sale=[C9]                                    entra=[C8]
R 9  A LOAD  entra=[C5, C6, Victor, Joaki, Manu]          sale=[]
R10  A SWAP  sale=[C5]                                    entra=[Javier]
R11  B LOAD  entra=[C11, C12, C7, C8, C9]                sale=[]
R12  B SWAP  sale=[C11]                                  entra=[C10]
```

Verifiqué cada paso con `debug-probe.ts` — el algoritmo **es determinista y correcto en su lógica**.

Para 2 salidas, los R13-R24 son **idénticos** a R1-R12 (esto es esperado porque con A=6 y B=6 exactos, después de 12 relevos las dos cuadrillas vuelven al mismo estado inicial).

---

## ❓ Preguntas pendientes para mañana

El usuario mandó un screenshot pero **no me describió el fallo concreto**. La imagen es demasiado pequeña para distinguir exactamente cuál cell es D vs F. Mañana necesito:

### Pregunta 1 — Identificación del fallo visible
> **"¿Qué está mal en el patrón?"** Dame una opción:
> 1. ¿Algún costalero tiene 6-7 D's en una salida (en vez de 5)? — dime nombre
> 2. ¿Algún costalero tiene 4+ F's consecutivos? — dime costalero + tramo
> 3. ¿La cadencia visible no es `[A,A,B,B,A,A]` o `[A,B,A,B]`? — dime qué patrón ves
> 4. ¿Los tipos P/S marcados no se respetan en el plan? — dime un caso concreto
> 5. ¿Otro? (ej: error en pantalla, alert, popup, dato corrupto)

### Pregunta 2 — Estado del flag Cuadrilla Doblada
> **"En la config, ¿el toggle 'Doblada' está ON?"** — en el screenshot no veo el badge "⚒ Cuadrilla Doblada" así que asumo OFF.

### Pregunta 3 — Cadencia deseada (clave para Bug 3)
Necesito que el usuario describa **con sus palabras** qué quiere. Opciones:
- **A) Pareja-based:** cada (P,S) consecutivo es 1 turno de 1 cuadrilla. Tramos impares sueltos = 1 relevo suelto.
- **B) Tipo → cuadrilla:** P=A siempre, S=B siempre (1:1, no agrupación por pares).
- **C) Tipo-based agrupado:** todos los P juntos los hace A, todos los S juntos los hace B. Para `[P,P,P,S,S,S]` da `[A,A,A,B,B,B]`.
- **D) Libre:** otro comportamiento que describa.

Yo propuse **A** por defecto (porque casa con su explicación literal del ejemplo), pero quiero confirmación antes de codear.

---

## 🛠️ Plan propuesto para mañana (no empezar sin respuesta del usuario)

### Paso 1 — Branch de trabajo
```bash
cd "/home/chiqui/Proyectos ai/relevos antigra"
git checkout -b fix/cuadrilla-doblada-cadencia-y-regla2
git status  # limpio antes de empezar
```

### Paso 2 — Tests rojos primero (TDD por bug)

**Para Bug 3 (cadencia / tipos):**
- Test: `simularCicloConTipos(t, ["primario","primario","primario","secundario","secundario","secundario"])` produce cadencia `[A,A,A,B,B,B]` (no `[A,A,B,B,A,A]` como actual).
- Test: tipo mixto `[S,P,P,P,S,S,P]` produce cadencia predecible según la opción A/B/C/D que elija el usuario.
- Test: `relevosATramoSlots` mapea correctamente cuando la cadencia cambia.
- Test: el capataz puede desactivar cuad. doblada y que vuelva a modo estándar.

**Para Bug 1 (Regla 2 fallback):**
- Test: con A=7, B=7, `[P,S] × 2` salidas, los streaks de cada costalero **nunca exceden 3** al final.
- Test: si la config es sub-ancho post-bajas (7,7 con 1 baja en A = 6 en A), lanza `CuadrillaDobladaSinDisponibleError` en vez del resultado streak=4 silencioso.
- Test: el dispatcher captura el error y devuelve `{ error: msg }` sin throw.

### Paso 3 — Implementar los fixes

**Fix Bug 3** (en `simularCicloConTipos`):
- Reemplazar el loop `turno % 2` por una función `cadenciaPorTipos(tramosTipo)` que devuelve la cadencia alternativa según la opción elegida.
- Mantener la firma externa intacta para no romper el dispatcher ni los callers.

**Fix Bug 1** (en `aplicarRelevoIntermedio` LOAD case):
- Después del override, checkear si los `restantes` contienen OTRO costalero con streak≥3.
- Si sí: lanzar `CuadrillaDobladaSinDisponibleError` con detalle (cuadrilla, restantesActivos, requeridos, candidatosProblemáticos).
- Mismo tratamiento en SWAP case si quedan 2+ en disp con streak≥3.
- Verificar que el dispatcher ya existente (`dispatcher.ts:158-165`) captura este error y lo surfacea al usuario.

### Paso 4 — Verificación de regresión
- Correr `npm test` (los 113 + nuevos tests, todos deben pasar)
- Correr `npm run type-check`
- Correr `npm run lint`
- Si todo OK, commit por bug con mensaje claro:
  - `fix(cuadrilla-doblada): cadencia respeta P/S marcados por capataz`
  - `test(cuadrilla-doblada): Regla 2 lanza error cuando hay 2+ rescatables`
  - `fix(cuadrilla-doblada): error tipado cuando restantes tienen 2+ streak-3`

### Paso 5 — Verificar contra el caso real
- Reproducir el patrón del screenshot usando los datos exactos (nombres de la Hermandad Virgen de la Soledad)
- Comparar output antes/después
- Subir el plan a producción (`vercel --prod` con env vars correctas)

---

## 📂 Archivos del proyecto que valen revisar antes de tocar

1. **`src/lib/algoritmos/cuadrillaDoblada.ts:1013-1073`** — el loop de cadencia mini-ciclo (`simularCicloConTipos` con `let turno = 0`)
2. **`src/lib/algoritmos/cuadrillaDoblada.ts:506-602`** — LOAD case de `aplicarRelevoIntermedio` (regla2 override)
3. **`src/lib/algoritmos/cuadrillaDoblada.ts:604-680`** — SWAP case (regla2 override)
4. **`src/lib/algoritmos/dispatcher.ts:158-170`** — catch-all para errores tipados
5. **`src/lib/algoritmos/cuadrillaDoblada.test.ts:1380-1450`** — tests de cadencia mini-ciclo y multi-salida (estos tests reflejan el comportamiento actual; habrá que actualizarlos si cambiamos a cadencia por tipos)

---

## 💡 Lo que NO hacer mañana

- ❌ No crear más scripts `*.ts` sueltos en la raíz. Usar archivos temporales en `/tmp/` y borrarlos tras usar, o meterlos en `src/_debug/` y excluirlos del coverage.
- ❌ No tocar el legacy path `simularCicloCompleto` (no se usa en el flujo nuevo).
- ❌ No cambiar la firma pública de `simularCicloConTipos` ni `relevosATramoSlots` (romperíamos `rotacion.ts` y `dispatcher.ts`).
- ❌ No empezar el fix sin tener la respuesta del usuario a las 3 preguntas de arriba. Si la respuesta es ambigua, pedir ejemplo concreto con nombres (`"[P,P,P,S,S,S] debería dar [A,A,A,B,B,B]"`) antes de codear.

---

## 🌙 Mañana continuamos desde aquí

Saludos,
_pi / MiniMax-M3, jueves 15 oct noche_
