# 📌 Contexto de sesión — Cuadrilla Doblada, pines sin mezcla

**Fecha:** 2026-10-17 (sábado mañana)
**Estado:** Pausa · Continuaremos más tarde

---

## 🗂️ Proyecto

- **Ruta:** `/home/chiqui/Proyectos ai/relevos antigra`
- **Stack:** Next.js 14.2.35 + React 18 + TypeScript 5 + Zustand + Supabase + Vitest
- **Nombre:** `relevos-app` v1.4.7 ← bump hoy
- **Deploy prod:** `i-relevos.vercel.app`
- **Git:** `main` · CI ✅ (test + build verdes)

## 🎯 Feature en juego

**Pines en Cuadrilla Doblada** — el capataz pinea un costalero D y otro F en T1 con Trabajadera 6 (12 costaleros, A=6, B=6, 20 tramos, 2 salidas, cuadrilla doblada ON). Esperaba:

> "Si hay un verde en una cuadrilla, ESA es la activa y la otra espera para su próximo relevo principal — nunca se mezclan miembros de distintas cuadrillas."

## 🐛 Bug confirmado por el usuario

**v1.4.0 — algoritmo original:** el dispatcher usaba `completarAuto` (greedy) cuando había pines + cuadrilla doblada. Resultado: T1+T2 con miembros mezclados de A y B. Mini-ciclo 2-2 violado.

**v1.4.6 (mi primer fix):** reemplacé el fallback por un swap A↔B que movía C8 de B a A y Juanjo de A a B. **El usuario lo rechazó explícitamente** porque eso mezclaba las cuadrillas.

## 🔧 Fix aplicado (v1.4.7, commits 9dc8771 + 1361176)

**Cambio en `intentarSwapParaPines` → `intentarReorderParaPines`:**

1. **Determinar cuadrilla activa para T1** desde los pines:
   - Si hay D-pinned en T1 → la cuadrilla que los contiene es la activa
   - Si solo hay F-pinned → la cuadrilla opuesta
   - Default: A

2. **Reordenar el `disp` de la cuadrilla activa in-place** (sin swap entre cuadrillas):
   - D-pinned en T1 → al FRENTE del array (entran en LOAD)
   - F-pinned en T1 → al FINAL del array (quedan fuera en LOAD)
   - Resto → en medio (FIFO natural)

3. **Pasar `turnoInicial`** a `simularCicloConTipos` y `calcularCiclo`:
   - Si A es activa → turnoInicial=0 (A hace T1+T2)
   - Si B es activa → turnoInicial=1 (B hace T1+T2)
   - **Mini-ciclo 2-2 strict preservado** — T1+T2 siempre misma cuadrilla

4. **Distribución original preservada** — ningún costalero se mueve entre A y B.

5. **Si los pines no quedan satisfechos** (caso degenerado) → fallback a `completarAuto` (greedy).

```ts
// Antes (v1.4.6 — swap A↔B, mezclaba cuadrillas):
if (necesitaIrA === "A") {
  dist.a = dist.a.filter((i) => i !== partner);
  dist.b = dist.b.filter((i) => i !== ci);
  dist.a = [ci, ...dist.a];           // ← C8 se mete en A
  dist.b = [...dist.b, partner];      // ← Juanjo se mete en B
}

// Después (v1.4.7 — reorder, no swap):
if (dPinned.length > 0) {
  const inA = dPinned.filter(ci => dist.a.includes(ci)).length;
  const inB = dPinned.filter(ci => dist.b.includes(ci)).length;
  if (inB > inA) activeCuadrilla = "B";
}
// Reorder SOLO el disp de la cuadrilla activa:
const dInActive = dPinned.filter(ci => current.includes(ci));
const fInActive = fPinned.filter(ci => current.includes(ci));
const middle = current.filter(ci => !dInActive.includes(ci) && !fInActive.includes(ci));
dist[targetKey] = [...dInActive, ...middle, ...fInActive];
```

## 🛤️ Camino recorrido (3 commits nuevos hoy)

| SHA | Mensaje | Estado |
|---|---|---|
| `52cf4c5` | docs(cuadrilla-doblada): document plan.length vs t.tramos.length mismatch (salidas>1) | ✅ Notas inline + commit doc |
| `9dc8771` | fix(cuadrilla-doblada): pins + mini-ciclo 2-2 respetados en dispatchSimulacion | ⚠️ Reemplazado por 1361176 (hacía swap, usuario rechazó) |
| `1361176` | fix(cuadrilla-doblada): pins honrados SIN mezclar costaleros entre cuadrillas | ✅ El fix correcto |
| Tag `v1.4.7` | sobre 1361176 | ✅ Release tag |

## ✅ Validación

- **903/903 tests verdes** (52 archivos) — 1 test nuevo para "caso A" (D-pin en A) y 1 para "caso B" (D-pin en B, caso del capataz)
- **CI GitHub Actions**: test ✅ + build ✅
- **type-check**: verde
- **Validación local con tus parámetros** (12 costaleros, A=6, B=6, 20 tramos, salidas=2, C8 D + C9 F en T1):
  - Distribución preservada (A y B originales, solo reorder dentro de B)
  - T1+T2 = B (mini-ciclo 2-2) ✓
  - T3+T4 = A (mini-ciclo 2-2) ✓
  - C8 inside T1 ✓, C9 outside T1 ✓
  - **0 mezclas A↔B en cualquier slot** de los 40 tramos

## 📊 Output de tu caso (v1.4.7)

```
T1: inside=[C7,C8,C10,C11,C12] A=0 B=5 → active=B
T2: inside=[C7,C9,C10,C11,C12] A=0 B=5 → active=B  ← mini-ciclo 2-2
T3: inside=[Juanjo,Castro,Adrián,Diego,Jacinto] A=5 B=0 → active=A
T4: inside=[Castro,Adrián,Diego,Jacinto,Víctor] A=5 B=0 → active=A  ← mini-ciclo 2-2
```

## 🚀 Deploy

- **Push a main**: ✅ `9dc8771..1361176` publicado
- **Tag v1.4.7**: ✅ publicado
- **Vercel deploy**: ✅ `i-relevos-2r8m11zsp` ● Ready (Production), creado Sat Oct 17 10:57:33
- **URL**: `https://i-relevos.vercel.app`

## 📁 Archivos tocados hoy

- `src/lib/algoritmos/cuadrillaDoblada.ts` — `simularCicloConTipos` ahora acepta `turnoInicial`
- `src/lib/algoritmos/rotacion.ts` — `calcularCiclo` ahora acepta `turnoInicial`
- `src/lib/algoritmos/dispatcher.ts` — `intentarSwapParaPines` reemplazado por `intentarReorderParaPines` + `dispatchConPines` simplificado
- `src/lib/algoritmos/dispatcher.test.ts` — 2 tests nuevos (caso A + caso B)
- `package.json` — bump 1.4.6 → 1.4.7
- `src/components/pages/PlanPage.tsx` — comentario inline sobre el mismatch visual (de la sesión anterior)
- `src/lib/algoritmos/cuadrillaDoblada.ts` — JSDoc extendido (de la sesión anterior)

## 🔄 Si continuamos más tarde

1. **Verificar visualmente** en `https://i-relevos.vercel.app` que el caso del capataz se ve bien:
   - Pin C8 D + C9 F en T1 con Trabajadera 6
   - T1+T2 deberían tener los mismos 5 miembros (los de B)
   - Distribución A↔B en Equipo no debería haber cambiado
2. **Si todo OK** → ticket cerrado, listo para próxima feature
3. **Si hay issues** → abrir nuevo branch `fix/v1.4.7-postvalidate` desde main

## 💡 Lo que NO hacer

- ❌ No swap A↔B para satisfacer pines — el capataz lo rechazó explícitamente
- ❌ No permitir mezcla de miembros de distintas cuadrillas en un slot (Regla 1)
- ❌ No cambiar cadencia mini-ciclo 2-2 (funciona bien, probada para 6+)
- ❌ No romper "5 dentro mínimo" (Regla 4 inamovible)
- ❌ No commitear sin verificar `npm test` (903/903) y CI (test+build) pasan

## 🌙 Hasta luego

Saludos,
_pi / MiniMax-M3, sábado 17 oct mañana_