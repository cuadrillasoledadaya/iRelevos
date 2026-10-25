# 📌 Contexto de sesión — v1.5.0 (anclas) + cierre de v1.4.8/v1.4.9

**Fecha:** 2026-10-25 (sábado)
**Estado:** Pausa · **v1.4.8 y v1.4.9 validados por el capataz ✅** ·
v1.5.0 (anclas) **aparcado** (el capataz ha pedido dejar el tema)

---

## 🗂️ Proyecto

- **Ruta:** `/home/chiqui/Proyectos ai/relevos antigra`
- **Stack:** Next.js 14.2.35 + React 18 + TypeScript 5 + Zustand + Supabase + Vitest
- **Nombre:** `relevos-app` **v1.5.0**
- **Deploy prod:** `https://i-relevos.vercel.app` (alias)
- **Git:** `main` · working tree limpio · CI verde
- **Tests:** **955/955 verdes** (53 archivos) — 920 al empezar la sesión

---

## ✅ Validado por el capataz (cerrado)

| Versión | Fix | Estado |
|---|---|---|
| v1.4.8 | Toggle "Cuadrilla Doblada" siempre accesible en Config (se quedaba ON sin forma de apagarlo) | **✅ validado** |
| v1.4.9 | Working crews con 6 costaleros por defecto + nº de cuadrillas del paso (`num_trabajadoras`) + import del censo que crea la cuadrilla que falta | **✅ validado** |

Los changes de openspec correspondientes están **archivados** en
`openspec/changes/archive/2026-10-25-fix-*` (con su `archive-report.md`).

---

## ⏸️ v1.5.0 — Anclas (APARCADO, no seguir)

**Estado:** el código está en el repo y en producción, pero **el capataz ha
pedido dejar el tema de las anclas**. No se sigue con esta feature.

**Qué es (por si hay que retomarlo):** el capataz marca **anclas** =
costaleros que quedan **siempre dentro** del puesto de carga de su
cuadrilla (no rotan fuera). Con una ancla en A, el LOAD de A deja **6
dentro** (5 rotantes + el ancla).

Commits (work-units, TDD estricto):

| Commit | Contenido |
|---|---|
| `328028b` | `Trabajadora.anclas?: {a,b}` + `validarAnclas()` (motivos `ancla_*`) |
| `e2d7cea` | Motor: anclas reservadas fuera del `disp`, LOAD 6 dentro, el ancla nunca sale |
| `eee2062` | Análisis *anchor-aware*: `dentro5` sobre rotantes, `okObj` por cuadrilla |
| `3b50e0e` | Store: `setAnclas` / `toggleAncla` + saneado + reindexado al borrar |
| `7f730e6` | UI: bloque "Anclas" en Config (chip ⚓) + marca ⚓ en el Plan |
| `be30055` | Bump v1.5.0 + este documento |
| `670ea3d` | Robustez: bajas no son anclas + error a `alert` |

**Es inerte por defecto:** el bloque "Anclas" solo aparece si
`cuadrillaDoblada` está ON **y** hay distribución A/B; sin marcar nada, el
plan es idéntico al de antes (lo fija un golden test en
`src/lib/algoritmos/anclas.test.ts`).

Decisiones técnicas (por si hay que retomarlo):

1. Las anclas se **reservan** fuera del `disp` → el LOAD carga
   `min(rotantes, ANCHO)` y las anclas se suman aparte.
2. El ancla **suma** dentro, nunca resta → `dentro5` se recalcula sobre los
   rotantes (6 dentro con 1 ancla = 5 rotantes dentro → cumple el mínimo).
3. El desequilibrio entre cuadrillas con anclas es **intencionado** → el
   objetivo se reparte por cuadrilla (`objPorCuadrilla`) y `okObj` admite ±1.
4. Sin anclas, el plan es **idéntico** al de antes (golden test).
5. **Bug corregido de paso**: `delCost` reindexaba las bajas pero no la
   distribución A/B (índices desfasados al borrar costaleros) → ahora
   reindexa bajas + distribución + anclas.

---

## 📌 Pendiente / follow-ups

- [ ] Decidir el **siguiente trabajo**: no hay ningún ticket abierto.
- [ ] **Export** (`src/lib/exportar/`): no marca las anclas ( irrelevante si
      la feature sigue aparcada).
- [ ] Pasos antiguos: `migrarDatos` los repara al cargarlos, pero el
      contenido en BD sigue viejo hasta el siguiente guardado a la nube.
- [ ] El **motor** decide con `t.nombres.length >= 10` (padrón completo,
      sin descontar bajas) mientras la UI usa `activos` → follow-up conocido.

---

## ⚠️ Trampas del entorno (IMPORTANTES para continuar)

### 1. Filesystem inconsistente (lecturas stale)

- Un mismo archivo puede leerse **vacío**, truncado o viejo segundos
  después de escribirlo; `ls` puede no listar un archivo que existe;
  `open(path)` puede lanzar `FileNotFoundError` aunque el archivo exista.
- **Usar escrituras in-place** (`open(path,"w")` + `fsync`), nunca
  `os.replace()`/rename (para mover ficheros: copiar + verificar + borrar).
- **Verificar siempre** releyendo tras escribir.
- Si un error de `tsc` parece absurdo: `rm tsconfig.tsbuildinfo` y re-ejecutar.
- Para editar JSX con tabs, usar un script **python** que localice la línea
  por contenido: el `edit` tool falla si el `oldText` no coincide
  **exactamente** (tabs vs espacios).

### 2. Trampa de escritura: `trabajadora` vs `trabajadera`

| Grafía | Qué es |
|---|---|
| `Trabajadera` / `trabajaderas` | la working crew (cuadrilla) |
| `trabajadora` | columna DB (`census.trabajadera`) |
| `num_trabajaderas` | columna DB (`proyectos.num_trabajaderas`) |

El modelo escribe `trabajadora`/`Trabajadora` (con 'o') por inercia →
identificadores rotos que `tsc` detecta. **Regla: `npm run type-check` +
suite completa antes de commitear.** Un `grep -rn "trabajadora" src/` antes de
commitear salva el susto (ojo: `grep` distingue mayúsculas; busca la
variante con 'o').

### 3. Verificar contra la BD, no contra la intuición

Antes de "arreglar" un nombre de columna, comprobarlo con `curl` a PostgREST.

---

## 💡 Lo que NO hacer

- ❌ No reintroducir el swap A↔B para satisfacer pines (el capataz lo rechazó)
- ❌ No romper la cadencia mini-ciclo 2-2 ni la Regla 1 (no mezclar cuadrillas)
- ❌ No tocar el gate `n >= 10` del motor en este ticket
- ❌ No seguir con la feature de anclas (el capataz la ha aparcado)
- ❌ No commitear sin `npm test` (955) + `type-check` + `lint` + CI verdes
- ❌ No usar `os.replace()` / rename en este filesystem

---

## 🌙 Hasta luego

Saludos,
_pi / MiniMax-M3, sábado 25 oct_
