# 📌 Contexto de sesión — v1.5.0 "Anclas" (cuadrilla doblada)

**Fecha:** 2026-10-25 (sábado)
**Estado:** Pausa · Los 2 bugs de la sesión anterior + la feature **Anclas**
están pusheados · **Falta validación del capataz**

---

## 🗂️ Proyecto

- **Ruta:** `/home/chiqui/Proyectos ai/relevos antigra`
- **Stack:** Next.js 14.2.35 + React 18 + TypeScript 5 + Zustand + Supabase + Vitest
- **Nombre:** `relevos-app` **v1.5.0** ← bump de esta sesión
- **Deploy prod:** `https://i-relevos.vercel.app` (alias)
- **Git:** `main` · working tree limpio
- **Tests:** **953/953 verdes** (53 archivos) — 920 al empezar la sesión, **+33**

---

## ✅ Lo que ya estaba en producción (sesión anterior)

| Versión | Fix | Estado |
|---|---|---|
| v1.4.8 | Toggle "Cuadrilla Doblada" siempre accesible en Config (se podía quedar ON sin forma de apagarlo) | en prod · **sin validar por el capataz** |
| v1.4.9 | Working crews con 6 costaleros por defecto + nº de cuadrillas del paso (`num_trabajadoras`) + import del censo que crea la cuadrilla que falta | en prod · **sin validar por el capataz** |

Guiones de validación: ver `openspec/changes/2026-10-25-fix-*-oculto/` y
`.../2026-10-25-fix-trabajaderas-6-costaleros-por-defecto/`.

---

## 🆕 v1.5.0 — Anclas (lo hecho en esta sesión)

**Qué es:** el capataz marca **anclas** = costaleros que quedan **siempre
dentro** del puesto de carga de su cuadrilla (no rotan fuera). Con una ancla
en A, el LOAD de A deja **6 dentro** (5 rotantes + el ancla) → el patrón que
pedia el capataz: `T1=6D, T2=5D, T3=5D…`

Decisiones ya aclaradas por el capataz (2026-10-16):
**D1** marcadas a mano por el capataz · **D2** jerarquía
`5-dentro > anclas > no-mezclar > max-3-consec`.

### Commits (work-units, TDD estricto)

| Commit | Contenido |
|---|---|
| `328028b` | **T1** — `Trabajadora.anclas?: {a: number[]; b: number[]}` + `validarAnclas(t)` (motivos `ancla_*` en `CuadrillaDobladaDistribucionInvalidaError`) |
| `e2d7cea` | **T2** — el motor: `EstadoCuadrilla.anclas`, anclas reservadas fuera del `disp`, LOAD 6 dentro, SWAP nunca saca un ancla, `transicionActiva` no las manda al `disp`, el plan las refleja |
| `eee2062` | **T3** — análisis *anchor-aware*: `dentro5` cuenta rotantes, `okObj` por cuadrilla (±1), `objPorCuadrilla()` |
| `3b50e0e` | **T4** — store: `setAnclas` / `toggleAncla`, saneado al cambiar la distribución, reindexado al borrar costaleros |
| `7f730e6` | **T5/T6** — UI: bloque "Anclas" en Configuración (chip ⚓ por costalero) + marca ⚓ y contador en el Plan |

### Decisiones técnicas (importantes para continuar)

1. **Las anclas se reservan fuera del `disp`** al crear el estado → el LOAD
   existente (`min(disponibles, ANCHO)`) ya carga los rotantes correctos y
   las anclas se suman aparte. La fórmula del TODO
   (`min(total, ANCHO + anclas)`) se simplifica a `min(rotantes, ANCHO)`.
2. **El ancla suma dentro, nunca resta** → `dentro5` se recalcula sobre los
   rotantes (6 dentro con 1 ancla = 5 rotantes dentro → cumple el mínimo).
3. **El desequilibrio entre cuadrillas con anclas es intencionado** (la
   cuadrilla anclada rota menos: 8 salidas de 12 tramos frente a 5-6 de la
   otra) → el objetivo se reparte **por cuadrilla** (`objPorCuadrilla`) y
   `okObj` admite ±1. Sin anclas, el análisis no cambia (mismo golden).
4. **Golden test**: sin anclas el plan es **idéntico** al de antes
   (`PLAN_SIN_ANCLAS` en `src/lib/algoritmos/anclas.test.ts`).
5. **Bug de índices corregido**: `delCost` reindexaba las bajas pero **no**
   la distribución A/B (índices desfasados). Ahora reindexa bajas,
   distribución **y** anclas.
6. **Trampa de escritura**: `trabajadora`/`Trabajadora` vs
   `trabajadera`/`Trabajadera` — el modelo escribe la primera por inercia y
   rompe los identificadores. **Siempre `tsc --noEmit` antes de commitear.**

---

## 🧪 Guion de validación (v1.5.0 — Anclas)

Caso real: Trabajadera con 12 costaleros, A=6, B=6, cuadrilla doblada ON.

1. Configuración → working crew → bloque **"Anclas"** debajo de la
   distribución A/B (chips ⚓ con los 6 de A y los 6 de B).
2. Marcar ⚓ en un costalero de A → el plan se recalcula y ese costalero
   aparece **siempre dentro** mientras A está activa (y con marca ⚓ en el
   Plan), y el header muestra "⚓ 1 ancla".
3. El primer tramo de A debe tener **6 dentro** (5 rotantes + el ancla); los
   tramos de B, 5 dentro.
4. Desmarcar el ancla → el plan vuelve al patrón 5 dentro (y el chip
   "⚓ 1 ancla" desaparece).
5. Mover un costalero de A a B en "Editar distribución" → su ancla se
   limpia sola (sanear) y no queda ninguna marca ⚓.

> Si el plan aparece con "⚠ Hay problemas en el plan", es **preexistente**
> del modo cuadrilla doblada (regla `rep`/`cons` del análisis estándar): la
> tarjeta ya salía así antes de las anclas. Lo nuevo es que **no** deben
> salir "Desequilibrio en las salidas" ni "Algún tramo no tiene 5 dentro".

---

## 📌 Pendiente / follow-ups

- [ ] **Validación del capataz** en `https://i-relevos.vercel.app` de:
      - [ ] v1.4.8 (toggle OFF accesible)
      - [ ] v1.4.9 (6 costaleros por defecto + nº de cuadrillas + censo)
      - [ ] v1.5.0 (anclas)
- [ ] **Export** (`src/lib/exportar/`): no marca las anclas.
- [ ] **Hard Reset**: borra las anclas (recrea las working crews) — decisión
      consciente, documentada en el proposal.
- [ ] Pasos antiguos: `migrarDatos` los repara al cargarlos, pero el
      contenido en BD sigue viejo hasta el siguiente guardado a la nube.
- [ ] El **motor** decide con `t.nombres.length >= 10` (padrón completo,
      sin descontar bajas) mientras la UI usa `activos` → follow-up conocido.

---

## ⚠️ Trampas del entorno (IMPORTES para continuar)

### 1. Filesystem inconsistente (lecturas stale)

- Un mismo archivo puede leerse **vacío**, truncado o viejo segundos
  después de escribirlo; `ls` puede no listar un archivo que existe;
  `open(path)` puede lanzar `FileNotFoundError` aunque el archivo exista.
- **Usar escrituras in-place** (`open(path,"w")` + `fsync`), nunca
  `os.replace()`/rename.
- **Verificar siempre** releyendo tras escribir.
- Si un error de `tsc` parece absurdo: `rm tsconfig.tsbuildinfo` y re-ejecutar.
- Para editar JSX con tabs, usar un script **python** que locate la línea
  por contenido y la reescriba: el `edit` tool falla si el `oldText` no
  coincide **exactamente** (tabs vs espacios).

### 2. Trampa de escritura: `trabajadora` vs `trabajadera`

| Grafía | Qué es |
|---|---|
| `Trabajadera` / `trabajaderas` | la working crew (cuadrilla) |
| `trabajadera` | columna DB (`census.trabajadera`) |
| `num_trabajaderas` | columna DB (`proyectos.num_trabajaderas`) |

El modelo escribe `trabajadora`/`Trabajadora` (con 'o') por inercia →
identificadores rotos que `tsc` detecta. **Regla: `npm run type-check` +
suite completa antes de commitear.** Un `grep -rn "trabajadora"` sobre `src/`
antes de commitear salva el susto.

### 3. Verificar contra la BD, no contra la intuición

Antes de "arreglar" un nombre de columna, comprobarlo con `curl` a PostgREST.

---

## 💡 Lo que NO hacer

- ❌ No reintroducir el swap A↔B para satisfacer pines (el capataz lo rechazó)
- ❌ No romper la cadencia mini-ciclo 2-2 ni la Regla 1 (no mezclar cuadrillas)
- ❌ No tocar el gate `n >= 10` del motor en este ticket
- ❌ No commitear sin `npm test` (953) + `type-check` + `lint` + CI verdes
- ❌ No usar `os.replace()` / rename en este filesystem

---

## 🌙 Hasta luego

Saludos,
_pi / MiniMax-M3, sábado 25 oct_
