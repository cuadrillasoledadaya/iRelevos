# 📌 Contexto de sesión — 2 bugs de UI/import de cuadrillas

**Fecha:** 2026-10-25 (sábado)
**Estado:** Pausa · Los 2 fixes están pusheados y en producción · **Falta validación del capataz**

---

## 🗂️ Proyecto

- **Ruta:** `/home/chiqui/Proyectos ai/relevos antigra`
- **Stack:** Next.js 14.2.35 + React 18 + TypeScript 5 + Zustand + Supabase + Vitest
- **Nombre:** `relevos-app` **v1.4.9** ← bump hoy
- **Deploy prod:** `https://i-relevos.vercel.app` (alias) — deploy `dpl_EXLnP98TD1iUn4UvejSZNe96J6Ad` ● Ready (Production)
- **Git:** `main` · CI ✅ (run `40180957877` · test+build verdes) · working tree limpio
- **Tests:** **920/920 verdes** (52 archivos) — 903 antes de hoy, +17 nuevos

---

## 🐛 Bug 1 — v1.4.8 — Cuadrilla Doblada ON sin forma de apagarla

**Síntoma (capataz):** en Plan aparece el pill "Doblada ON"; al clicarlo va a
Configuración, pero **el selector no aparece** → no puede ponerlo en OFF.
"Callejón sin salida": Plan → Config → sin selector → Plan → …

### Causas (2)

1. **Gate de renderizado** (`ConfigPage.tsx`): el bloque "Cuadrilla Doblada" se
   mostraba solo con `esMando && totalActivos >= 10` → usaba el umbral de
   **activación** como gate de **visibilidad**. Con el flag ON y <10 costaleros
   activos (por bajas/borrados) el bloque desaparecía.
2. **Tarjetas colapsadas** (CSS): `.card .trab-body { display: none !important }`
   → al navegar Plan → Config, la working crew llegaba cerrada aunque el gate
   ya permitiera renderizar el selector.

### Fix (commits `0afef79` + `a0915c2`)

| Archivo | Cambio |
|---|---|
| `ConfigPage.tsx` | gate → `esMando && (totalActivos >= 10 \|\| t.cuadrillaDoblada)` (activar exige mínimo, **apagar nunca**) |
| `ConfigPage.tsx` | aviso: `⚠ Solo N costaleros activos (mín. 10) — desactiva para volver al plan estándar` |
| `PlanPage.tsx` | chip `⚠ N activos · mín. 10` en el header cuando el flag está ON bajo el mínimo |
| `PlanPage.tsx` + `ConfigPage.tsx` + `uiStore.ts` | `uiStore.configFocusTid` (transitorio, no persistido) → Plan marca foco al navegar y Config **expande** la tarjeta de esa working crew |
| `openspec/changes/2026-10-25-fix-cuadrilla-doblada-toggle-off-oculto/` | proposal + tasks + deltas de spec (ui/config-page, ui/plan-page) |

**Tests nuevos (6):** toggle visible/accionable con flag ON bajo el mínimo ·
ausente con flag OFF bajo el mínimo · aviso de mínimo · tarjeta expandida con
foco / colapsada sin foco · chip de Plan.

---

## 🐛 Bug 2 — v1.4.9 — Working crews con 6 costaleros por defecto + nº de cuadrillas del paso

**Síntoma (capataz):** "cuando se resetea toda la aplicación, al elegir el paso
anterior no aplica bien los datos del número de trabalhadoras, siempre pone 6;
además no puedo importar bien los costaleros porque esas working crews solo
aparecen con 3 costaleros y tengo que crear costaleros nuevos para que el
censo se pase correctamente. **Por defecto las working crews deberían contar
con 6 costaleros ya definidos en su creación.**"

### Causas (4)

| # | Ubicación | Defecto |
|---|---|---|
| 1 | `adminService.createPaso` | working crews con `nombres: []`, `roles: []`, `salidas: 1`, 2 tramos → paso inservible |
| 2 | `migrarDatos` (`lib/algoritmos/datos.ts`) | `if (!t.nombres)` no cubre `[]` (truthy) → los pasos ya creados **no se reparaban** |
| 3 | `planStore.resetTodo` | hardcodeaba **1** working crew, ignorando `num_trabajadoras` del paso |
| 4 | `adminService.syncTodoCenso` | `if (!trab) return` → **descartaba en silencio** las cuadrillas del censo que el paso no tenía |

### Fix (commits `6a72b47` + `e827e49`)

- **Factory canónica** `crearTrabajadoraBase(id)` en `src/lib/algoritmos/datos.ts`:
  6 costaleros (`Costalero 1..6`) + `defaultRoles(6, id)` + `salidas: 2` +
  3 tramos (`Tramo N (T{id})`) + `tramosTipo` 3×primario. Exportada en el barrel.
  La usan `datosVacios()`, `addTrab()`, `createPaso()` y `resetTodo()`.
  *Antes la forma estaba duplicada en 4 sitios y **cada copia difería**.*
- `migrarDatos`: `if (!t.nombres || t.nombres.length === 0)` → 6 costaleros
  (**repara los pasos ya existentes en BD**, sin migración).
- `migrarDatos`: `if (!t.roles || t.roles.length === 0)` → roles por defecto.
- `resetTodo`: reconstruye **N** working crews (`N = num_trabajaderas` del paso
  activo) con 6 costaleros. Nueva dep `setPlanDeps(m, gt, gs, gn?)` cableada en
  `src/stores/index.ts` (fallback: nº actual en `S`).
- `syncTodoCenso`: si el censo referencia una working crew que el paso no
  tiene, **la crea** con 6 costaleros en vez de descartarla.
- `openspec/changes/2026-10-25-fix-trabajaderas-6-costaleros-por-defecto/`:
  proposal + tasks (con nota de la verificación de columnas).

**Tests nuevos (11):** factory (3) + reparación de `nombres: []` (2) ·
`createPaso` con 6 costaleros (1, actualizado) · `syncTodoCenso` crea la
cuadrilla que el censo referencia (1) · `resetTodo` con N cuadrillas (2).

---

## 🔎 Verificación importante: nombres de columna reales (Supabase)

Verificado contra la API REST (`GET /rest/v1/...?select=<col>`):

| Tabla | Columna real | Variante que **NO** existe |
|---|---|---|
| `census` | **`trabajadera`** ✅ | `trabajadora` → `42703 column does not exist` |
| `proyectos` | **`num_trabajaderas`** ✅ | `num_trabajadoras` → `42703` |

⇒ **La grafía del repo es la correcta.** Ojo: `supabase/migrations/2026-05-24-update-rpc-for-rol.sql`
(y el de `rol_sec`) documentan el RPC con `trabajadora`; el RPC aplicado en
producción usa `trabajadera`. Deuda documental (no es código que se ejecuta).

---

## ⚠️ Trampas del entorno (IMPORTANTES para continuar)

### 1. El filesystem de este proyecto es inconsistente (lecturas stale)

- Un mismo archivo puede leerse **vacío**, **truncado** o con **contenido viejo**
  segundos después de escribirlo. `ls` puede no listar un archivo que existe.
- **`os.replace()` (rename) rompe el archivo**: deja el path inaccesible
  (`FileNotFoundError`) hasta hacer `rm` + `cp`.
- **Usar escrituras in-place** (`open(path,"w")` + `fsync`), nunca rename.
- **Verificar siempre** releyendo tras escribir (comparar contenido exacto).
- `npx tsc --noEmit` con `"incremental": true` puede usar cache stale →
  si un error parece absurdo, `rm tsconfig.tsbuildinfo` y re-ejecutar.
- **Helper reusable** en `/tmp/fshelp.py` (read con reintentos + write in-place
  con verificación). Reconstruirlo si no está.

### 2. Trampa de escritura: `trabajadora` vs `Trabajadera`

El dominio usa **dos grafías distintas** y es fácil colarse:

| Grafía | Qué es | Dónde |
|---|---|---|
| `Trabajadera` / `trabajaderas` | la working crew (cuadrilla) | tipo, `content.trabajaderas` |
| `trabajadera` | **columna DB** (censo, perfiles) | `census.trabajadera` |
| `num_trabajaderas` | columna DB (proyectos) | nº de cuadrillas del paso |

Mi modelo tiende a escribir `trabajadora`/`Trabajadora` (con 'o') por inercia →
identificadores rotos que `tsc` detecta… **a veces tarde**. **Regla: pasar
siempre `tsc --noEmit` + suite completa antes de commitear.**

### 3. Verificar contra la BD, no contra la intuición

Antes de "arreglar" un nombre de columna, comprobarlo con `curl` a PostgREST.

---

## 🔄 Estado actual / qué falta

- [x] Bug 1 (v1.4.8) arreglado, pusheado y en producción
- [x] Bug 2 (v1.4.9) arreglado, pusheado y en producción
- [ ] **Validación del capataz en `https://i-relevos.vercel.app`** ← pendiente
- [ ] Decidir qué hacer con los **pasos antiguos**: `migrarDatos` los repara al
      cargarlos (6 costaleros), pero el contenido en BD sigue viejo hasta el
      siguiente guardado a la nube. ¿Forzar un guardado? ¿Script de migración?

### Guion de validación (Bug 2)

1. Admin → crear un Paso nuevo → las working crews deben aparecer con **6
   costaleros**, 2 salidas, 3 tramos.
2. Cargar el paso anterior → sus working crews deben aparecer con 6 costaleros.
3. Admin → CensTab → sincronizar el censo → los costaleros deben caer en su
   cuadrilla correcta; si el paso no tiene esa cuadrilla, se crea sola.
4. Configuración → **Hard Reset** → el paso debe quedar con **el nº de
   cuadrillas declarado** (no 1), cada una con 6 costaleros.

### Guion de validación (Bug 1)

1. Plan → working crew con cuadrilla doblada ON y <10 activos → chip
   `⚠ N activos · mín. 10`.
2. Click en el pill "Doblada" → Config, **tarjeta expandida**, bloque visible
   con el aviso → click en el toggle → **OFF** (esto antes era imposible).

---

## 📌 Pendiente de la sesión anterior: v1.5.0 — "Anclas"

`.pi/TODO-fix-anclas.md` (T1–T9, sin marcar). Resumen:

- Marcar **anclas** (costaleros que no salen en el relevo) manualmente por el
  capataz → `Trabajadora.anclas`.
- Jerarquía de reglas: **5-dentro > anclas > no-mezclar > max-3-consec**.
- Tocar `aplicarRelevoIntermedio` y `transicionActiva` **rompe la suite** →
  commits por tarea + suite completa en cada paso.
- ⚠️ La branch `fix/cuadrilla-doblada-cadencia-y-regla2` está **8 commits
  atrás** de main (v1.4.5): rebasar o arrancar desde main.

---

## 💡 Lo que NO hacer

- ❌ No reintroducir el swap A↔B para satisfacer pines (el capataz lo rechazó)
- ❌ No romper la cadencia mini-ciclo 2-2 ni la Regla 1 (no mezclar cuadrillas)
- ❌ No tocar el gate `n >= 10` del motor en este ticket (queda como follow-up:
  el motor usa `nombres.length` (padrón completo) y la UI `activos` → conviven)
- ❌ No commitear sin `npm test` (920) + `type-check` + `lint` + CI verdes
- ❌ No usar `os.replace()` / rename en este filesystem

---

## 🌙 Hasta luego

Saludos,
_pi / MiniMax-M3, sábado 25 oct_
