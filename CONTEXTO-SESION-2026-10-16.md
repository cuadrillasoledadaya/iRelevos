# 📌 Contexto de sesión — Cuadrilla Doblada (Trab. 6 / 12 tramos)

**Fecha:** 2026-10-16 (viernes mañana)
**Estado:** Pausa · Continuaremos más tarde

---

## 🗂️ Proyecto

- **Ruta:** `/home/chiqui/Proyectos ai/relevos antigra`
- **Stack:** Next.js 14.2.35 + React 18 + TypeScript 5 + Zustand + Supabase + Vitest
- **Nombre:** `relevos-app` v1.4.5 ← bump hoy
- **Deploy prod:** `i-relevos.vercel.app`
- **Git:** `main` · CI ✅ (test + build verdes)

## 🎯 Feature en juego

**Cuadrilla Doblada** — caso real de Trabajadera 6, 12 costaleros (A=6, B=6), 12 tramos, 1 salida, Doblada ON. El algoritmo v1.4.0 (mini-ciclo 2-2 estricto, regla 4 estricta) lanzaba `CuadrillaDobladaSinDisponibleError` en la primera oportunidad de SWAP, bloqueando la generación completa del plan.

## 🐛 Bug confirmado por el usuario

**Bug principal:** El algoritmo mini-ciclo 2-2 con Regla 4 estricta no funciona para cuadrillas 6+. Con A=6, B=6:
- R1: LOAD A (5 A) ✅
- R2: SWAP A — A.disp=[] (5 cargando, 1 en disp fue C5 que ya entró) → throws
- Catch-all en dispatcher surfacea el error al usuario

**Contexto conceptual (confirmado por el usuario):**
- Regla 1 ("no mezclar A↔B"): **ESTRICTA — nunca, nunca, nunca** se mezclan cuadrillas
- Regla 2 ("max 3 tramos consecutivos"): best-effort
- Regla 5 ("5 dentro mínimo"): inamovible
- El patrón ideal que el usuario mostró en una foto era solo **didáctico** — no debe seguirse al pie de la letra. Los costaleros DEBEN rotar, no puede haber nadie perpetuamente cargando.

## 🔧 Fix aplicado (commit b2e4278)

**Cambio en `simularCicloConTipos`:** el 1er SWAP después del LOAD ya no es **obligatorio**. Si la cuadrilla activa no tiene disponibles (caso típico: cuadrilla de 5 miembros exactos o 6 con todos cargando), cede el turno sin error. La siguiente iteración hace la transición a la otra cuadrilla.

```ts
// Antes (v1.4.0 — regla 4 estricta):
if (tramoIdx < tramosTipo.length) {
  const rSwap = aplicarRelevoIntermedio(...) // throws si no hay disponibles
  ...
}

// Después (v1.5.0 — regla 4 best-effort):
if (tramoIdx < tramosTipo.length) {
  try {
    const rSwap = aplicarRelevoIntermedio(...)
    ...
  } catch (err) {
    if (err instanceof CuadrillaDobladaSinDisponibleError) {
      // Silencioso: cede turno sin error
    } else {
      throw err
    }
  }
}
```

También en `aplicarRelevoIntermedio` LOAD: `aCargar = Math.min(disponibles, ancho)` (defense in depth — antes lanzaba error si había menos de ANCHO disponibles).

## 🛤️ Camino recorrido (3 commits)

| SHA | Mensaje | Estado |
|---|---|---|
| `9f5535f` | feat anclas (intentamos añadir concepto de "anclas" permanentes) | ❌ Revertido — no era lo que el usuario quería |
| `5618819` | Revert "feat anclas" | ✅ Limpia el intento |
| `b2e4278` | **fix SWAP opcional** | ✅ El fix correcto |
| `b61346c` | chore(release): bump version to 1.4.5 | ✅ Versión bumped |
| `981e947` | fix(tests): update rotacion/dispatcher tests for v1.5.0 | ✅ Tests actualizados (CI antes falló) |
| Tag `v1.4.5` | movido a 981e947 (force-push) | ✅ Release tag |

## ✅ Validación

- **901/901 tests verdes** (52 archivos)
- **CI GitHub Actions**: test ✅ + build ✅
- **type-check**: verde
- **lint**: verde (1 warning preexistente en `HistorySheet.tsx` que no toqué)

## 📊 Plan generado para Trabajadera 6 (12 tramos, A=6, B=6, 1 salida)

```
R 1  A  LOAD   entra=[V,J,M,Jv,C5]              ← 5 A dentro
R 2  A  SWAP   sale=[Victor]  entra=[C6]        ← rotación intra-A
R 3  B  LOAD   entra=[C7,C8,C9,C10,C11]         ← 5 B dentro
R 4  B  SWAP   sale=[C7]  entra=[C12]            ← rotación intra-B
R 5  A  LOAD   entra=[M,Jv,C5,C6,Victor]         ← 5 A
R 6  A  SWAP   sale=[Manu]  entra=[Joaki]
R 7  B  LOAD   entra=[C9,C10,C11,C12,C7]         ← 5 B
R 8  B  SWAP   sale=[C9]  entra=[C8]
R 9  A  LOAD   entra=[C5,C6,Victor,Joaki,Manu]   ← 5 A
R10  A  SWAP   sale=[C5]  entra=[Javier]
R11  B  LOAD   entra=[C11,C12,C7,C8,C9]          ← 5 B
R12  B  SWAP   sale=[C11]  entra=[C10]
```

**Cumple TODAS las reglas del proyecto:**
- ✅ 5 dentro en cada tramo
- ✅ Streaks max = 2 por persona (todos respetan Regla 2)
- ✅ Cada persona carga 5 de 12 tramos (rotación equitativa)
- ✅ Cadencia mini-ciclo 2-2 (A,A,B,B,A,A,B,B,A,A,B,B)
- ✅ No mezcla A/B (Regla 1 estricta)
- ✅ Sin errores

## 🚀 Deploy

- **Push a main**: ✅ `b61346c..981e947` publicado
- **Tag v1.4.5**: ✅ publicado (force-push a 981e947)
- **CI**: ✅ test + build verdes
- **Vercel deploy**: ⚠️ **El usuario no vio el deploy en Vercel dashboard**. La integración GitHub-Vercel parece no haber auto-disparado el deploy. El usuario pegó la URL `https://i-relevos.vercel.app/` (la URL de producción existente) como confirmación, pero no confirmó explícitamente que el fix está deployado.

## ❓ Pendiente de validar

1. **Confirmar que el fix v1.4.5 está en producción** en `https://i-relevos.vercel.app/`. El usuario reportó "no se subió la versión a vercel", lo cual sugiere que el auto-deploy no se disparó.
   - Solución si no se deployó: ejecutar `npx vercel login` + `npx vercel deploy --prod --yes` desde la terminal del usuario, o configurar la Vercel GitHub App en el repo.
2. **Validar manualmente el caso Trabajadera 6** en producción.

## 📁 Archivos del proyecto tocados hoy

- `src/lib/algoritmos/cuadrillaDoblada.ts` — fix principal (SWAP opcional)
- `src/lib/algoritmos/cuadrillaDoblada.test.ts` — 5 tests nuevos + 3 legacy actualizados
- `src/lib/algoritmos/rotacion.test.ts` — 1 test legacy actualizado
- `src/lib/algoritmos/dispatcher.test.ts` — 1 test legacy actualizado
- `package.json` — bump 1.4.4 → 1.4.5

## 🔄 Si continuamos más tarde

1. Verificar primero si el deploy se hizo (https://vercel.com/dashboard o https://i-relevos.vercel.app/)
2. Si NO se hizo, ejecutar `npx vercel deploy --prod --yes` desde la terminal del usuario
3. Validar manualmente el caso Trabajadera 6 en producción
4. Si todo OK, cerrar el ticket y volver a `main`
5. Si hay issues, abrir nuevos commits en el branch `fix/cuadrilla-doblada-cadencia-y-regla2` (ya merged) o nuevo branch

## 💡 Lo que NO hacer

- ❌ No reintroducir el concepto de "anclas permanentes" (el usuario lo rechazó explícitamente)
- ❌ No permitir mezcla A↔B (Regla 1 ESTRICTA)
- ❌ No cambiar la cadencia mini-ciclo 2-2 (funciona bien para 6+)
- ❌ No romper la lógica de "5 dentro mínimo" (regla inamovible)
- ❌ No commitear sin verificar que `npm test` (901/901) y CI (test+build) pasan

## 🌙 Hasta luego

Saludos,
_pi / MiniMax-M3, viernes 16 oct mañana_
