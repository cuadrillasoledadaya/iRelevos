# useEstado-refactor — Specifications

## UI Store

### Requirement: UI State Management

The system MUST manage all non-data UI state (active page, active sheet, theme, selection targets, accordion state) in a dedicated slice.

| Action | Input | Effect |
|--------|-------|--------|
| `setActivePage` | `ActivePage` | Sets page, persists to `cpwa_active_page` |
| `openSheet` / `closeSheet` | `ActiveSheet \| null` | Opens/closes modal sheet |
| `toggleTema` | — | Toggles dark/light, persists to `cpwa_tema`, updates `<html>` class |
| `toggleEq` | `number` (tid) | Toggles accordion open state for equipo |
| `setSwapSel` | `Partial<SwapState> \| null` | Sets capataz swap selection |
| `setCellTarget` | `CellTarget \| null` | Sets plan cell selection |
| `setBancoTarget` | `{ tid, ti } \| null` | Sets banco suggestion target |
| `setCensusTarget` | `CensusTarget \| null` | Sets census selector target |

#### Scenario: Theme toggle persists and applies

- GIVEN theme is `'dark'`
- WHEN `toggleTema()` is called
- THEN theme becomes `'light'`, `localStorage.cpwa_tema` is `'light'`, and `<html>` has class `light`

#### Scenario: Page navigation persists

- GIVEN active page is `'home'`
- WHEN `setActivePage('plan')` is called
- THEN `activePage` is `'plan'` and `localStorage.cpwa_active_page` is `'plan'`

#### Scenario: Accordion toggle

- GIVEN `openEqs` contains `{1}`
- WHEN `toggleEq(1)` is called
- THEN `openEqs` is `new Set()` (1 removed)

---

## Project Store

### Requirement: Project List and Active Selection

The system MUST manage the list of proyectos from Supabase, track the active project ID (`pid`), and expose derived values (`nombrePaso`, `nombreCuadrilla`).

| Action | Input | Effect |
|--------|-------|--------|
| `setPid` | `string` | Sets active project, persists to `cpwa_active_pid` |
| `refetchPasos` | — | Fetches proyectos for `activeTemporadaId` from Supabase |

#### Scenario: Switching paso loads correct data

- GIVEN `pasos` contains projects A and B, `pid` is A's ID
- WHEN `setPid(B.id)` is called
- THEN `pid` becomes B's ID, `localStorage.cpwa_active_pid` is B's ID, and derived `S` reflects B's content

#### Scenario: Refetch updates paso list

- GIVEN `activeTemporadaId` is set
- WHEN `refetchPasos()` resolves successfully
- THEN `pasos` contains all proyectos for that temporada from Supabase

#### Scenario: Refetch with empty temporada

- GIVEN `activeTemporadaId` is set but Supabase returns zero proyectos
- WHEN `refetchPasos()` resolves
- THEN `pasos` is `[]` and `pid` is `''`

---

## Trabajadera Store

### Requirement: Costalero and Tramo Mutations

The system MUST provide all mutations for managing costaleros (names, roles, bajas, puntuaciones) and tramos (names, salidas, tramosClaves) within a `Trabajadera`.

| Action | Input | Effect |
|--------|-------|--------|
| `setNombre` | `tid, i, nombre` | Updates costalero name at index |
| `addCost` | `tid` | Appends new costalero with default role, invalidates plan |
| `delCost` | `tid, i` | Removes costalero, adjusts bajas indices, invalidates plan |
| `toggleBaja` | `tid, i` | Toggles baja; returns `false` if ≤6 activos remain |
| `setRolPri` / `setRolSec` | `tid, i, rol` | Sets role, prevents pri=sec, invalidates `dentroFisico` and analisis |
| `addTrab` | — | Creates new `Trabajadera` with 6 default costaleros and 3 tramos |
| `setPuntuacion` | `tid, nombre, pts` | Sets score in `puntuaciones` map |
| `addCostUltimo` | `tid, nombre, roles` | Adds costalero, appends to all plan slots' `fuera`, triggers recalculation after 50ms |
| `setNombreTramo` | `tid, ti, nombre` | Updates tramo name |
| `addTramo` / `delTramo` | `tid` / `tid, ti` | Adds/removes tramo, invalidates plan |
| `setSalidas` | `tid, salidas` | Sets salidas count, invalidates plan |
| `usarBanco` | `tid, ti, nombre` | Replaces tramo name from banco |
| `sugerirTramos` | `tid, targetSalidas?` | Adjusts tramo count to optimal, invalidates plan |
| `toggleTramoClave` | `tid, ti` | Toggles tramo in `tramosClaves` (sorted ascending) |
| `sugerirYCalcular` | `tid` | Applies suggestions, triggers recalculation after 50ms |

#### Scenario: Adding a costalero triggers plan recalculation

- GIVEN a `Trabajadera` with a computed `plan`
- WHEN `addCostUltimo(tid, "Juan", ["COR", "FIJ"])` is called
- THEN the costalero is added, appended to all `plan` slots' `fuera`, and `completarPlan(tid)` fires after 50ms

#### Scenario: toggleBaja prevents under minimum

- GIVEN a `Trabajadera` with 7 costaleros, 1 already baja
- WHEN `toggleBaja(tid, i)` is called on an active costalero
- THEN the function returns `false` and no baja is added (6 activos minimum)

#### Scenario: delCost adjusts bajas indices

- GIVEN costaleros at indices [0,1,2,3] with bajas at [2,3]
- WHEN `delCost(tid, 1)` is called
- THEN bajas become [1,2] (indices shifted down for those > removed index)

---

## Plan Store

### Requirement: Plan Calculation and Pinning

The system MUST provide plan computation (`calcularCiclo`, `completarAuto`), analysis (`analizar`), and pin management (`getPinned`, `validarPinned`).

| Action | Input | Effect |
|--------|-------|--------|
| `calcularTodo` | — | Computes plan for all trabajaderas, invalidates pinned |
| `calcularTrab` | `tid` | Computes plan for one trabajadera, invalidates pinned |
| `completarPlan` | `tid` | Auto-completes plan, orders physically, sets analisis |
| `limpiarPlan` | `tid` | Clears plan, obj, analisis |
| `quitarBloqueos` | `tid` | Clears pinned state |
| `setPinned` | `tid, ti, ci, v` | Sets pin state for a cell |
| `getErroresPinned` | `tid` | Returns validation error strings for pinned config |

#### Scenario: calcularTrab produces valid plan

- GIVEN a `Trabajadera` with 6+ active costaleros and valid tramos
- WHEN `calcularTrab(tid)` is called
- THEN `t.plan`, `t.obj`, and `t.analisis` are all non-null, `t.pinned` is null

#### Scenario: completarPlan with insufficient costaleros

- GIVEN a `Trabajadera` with fewer than required active costaleros
- WHEN `completarPlan(tid)` is called
- THEN no mutation occurs (result contains `'error'`)

---

## Banco Store

### Requirement: Banco (Suggestion Pool) Management

The system MUST manage a list of banco entries (tramo name suggestions) as part of `DatosPerfil`.

| Action | Input | Effect |
|--------|-------|--------|
| `addBanco` | `nombre` | Appends name to `d.banco` |
| `delBanco` | `i` | Removes entry at index from `d.banco` |

#### Scenario: Add and delete banco entry

- GIVEN `banco` is `["Tramo A"]`
- WHEN `addBanco("Tramo B")` then `delBanco(0)` are called
- THEN `banco` is `["Tramo B"]`

---

## Temporada Store

### Requirement: Season (Temporada) Management

The system MUST manage the list of temporadas and the active temporada ID, fetching proyectos when the active temporada changes.

| Action | Input | Effect |
|--------|-------|--------|
| `setActiveTemporadaId` | `string` | Sets active temporada, persists to `cpwa_active_temp_id`, triggers refetch |

#### Scenario: Active temporada change triggers refetch

- GIVEN `activeTemporadaId` is `'temp-1'`
- WHEN `setActiveTemporadaId('temp-2')` is called
- THEN `activeTemporadaId` becomes `'temp-2'`, `localStorage.cpwa_active_temp_id` is updated, and `refetchPasos()` is triggered

---

## Mutation & Persistence Layer

### Requirement: Centralized Mutation with Supabase Sync

The system MUST wrap every state mutation through a `mutar()` function that: (1) applies the draft mutation to `DatosPerfil`, (2) updates the `pasos` array, and (3) calls `saveCloud()` to persist to Supabase asynchronously.

| Function | Input | Effect |
|----------|-------|--------|
| `mutar(fn)` | `(draft: DatosPerfil) => void` | Applies `fn` to draft, updates `pasos[idx].content`, fires `saveCloud` |
| `saveCloud(content, pid)` | `DatosPerfil, string` | Updates `proyectos.content` in Supabase for the given `pid` |

#### Scenario: mutar() persists to Supabase after state update

- GIVEN `pid` is set and user is authenticated
- WHEN `mutar(d => { d.banco.push("X") })` is called
- THEN `pasos[idx].content.banco` includes `"X"` AND `supabase.from('proyectos').update()` is called with the updated content

#### Scenario: mutar() with no pid is a no-op

- GIVEN `pid` is `''` (empty)
- WHEN `mutar(d => { d.banco.push("X") })` is called
- THEN no mutation occurs and no Supabase call is made

#### Scenario: Supabase sync failure does not block UI

- GIVEN `mutar()` is called with a valid mutation
- WHEN `saveCloud()` fails (network error, auth expired)
- THEN the UI state is still updated (mutation applied to `pasos`), and the error is logged to console

---

## LocalStorage Hydration

### Requirement: App Startup Hydration

The system MUST restore four localStorage keys on app startup: `cpwa_active_page`, `cpwa_tema`, `cpwa_active_pid`, `cpwa_active_temp_id`.

| Key | Default | Validation |
|-----|---------|------------|
| `cpwa_active_page` | `'home'` | Must be one of: home, config, equipo, plan, capataz, carga, admin |
| `cpwa_tema` | `'light'` | Must be `'dark'` or `'light'` |
| `cpwa_active_pid` | First available paso | Must exist in current `pasos` list |
| `cpwa_active_temp_id` | First temporada or `activa` | Must exist in current `temporadas` list |

#### Scenario: localStorage hydration on app startup

- GIVEN `localStorage.cpwa_active_page` is `'plan'` and `cpwa_tema` is `'dark'`
- WHEN the app initializes
- THEN `activePage` is `'plan'` and `tema` is `'dark'` with `<html>` class `dark` applied

#### Scenario: Invalid saved page falls back to default

- GIVEN `localStorage.cpwa_active_page` is `'invalid'`
- WHEN the app initializes
- THEN `activePage` defaults to `'home'`

#### Scenario: Saved pid not in current pasos list

- GIVEN `localStorage.cpwa_active_pid` is `'old-id'` but `pasos` contains only `['new-id']`
- WHEN pasos are loaded
- THEN `pid` is set to `'new-id'` (first available)

---

## Error Handling

### Requirement: Graceful Degradation on Sync Failure

The system MUST handle Supabase failures without blocking the user's workflow.

| Failure Mode | Behavior |
|-------------|----------|
| `saveCloud()` network error | UI updates proceed; error logged to console |
| `saveCloud()` auth expired | UI updates proceed; error logged; user redirected to login on next auth check |
| `refetchPasos()` fails | `pasos` retains previous value; error logged |
| `vaciarCenso()` fails | Alert shown to user with error message |
| `sugerirYCalcular()` throws | Alert shown with error message; mutation still applied |

#### Scenario: Network error during mutation

- GIVEN user is editing a costalero name
- WHEN `setNombre(tid, 0, "NewName")` triggers `mutar()` and Supabase is unreachable
- THEN the name is updated in the UI, error is logged, and user can continue working

#### Scenario: Census clear failure shows alert

- GIVEN user triggers `vaciarCenso()`
- WHEN Supabase returns an error
- THEN an alert displays `'Error al vaciar el censo: {error.message}'`
