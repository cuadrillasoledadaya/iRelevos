// ══════════════════════════════════════════════════════════════════
// CUADRILLA DOBLADA — lógica para trabajaderas con 10+ costaleros
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, TramoSlot, TramoTipo, RolCode } from "../types";
import { estructuraPaso } from "../roles";

export const ANCHO_TRABAJADERA = 5
/**
 * v1.2.93 #1: número mínimo de costaleros para que tenga sentido simular
 * una cuadrilla doblada. Equivale a 2 * ANCHO_TRABAJADERA — 2 costaleros
 * por puesto (uno cargando + uno en reserva en la otra cuadrilla),
 * ANCHO_TRABAJADERA costaleros por cuadrilla. Antes este valor (10)
 * vivía como literal en 3 call-sites (cuadrillaDobladaATramoSlots,
 * dispatchSimulacion, calcularCiclo), con riesgo de drift si alguna vez
 * se cambiaba ANCHO. Ahora se calcula y se exporta como constante.
 */
export const UMBRAL_DOBLADO = 2 * ANCHO_TRABAJADERA

/** Thrown when cuadrilla doblada is active but no tramo is marked as primario. */
export class CuadrillaDobladaSinPrimarioError extends Error {
  constructor() {
    super('Al menos un tramo debe ser primario')
    this.name = 'CuadrillaDobladaSinPrimarioError'
  }
}

/**
 * v1.2.90: Thrown when an S swap is requested on a cuadrilla that has
 * costaleros cargando but no disponibles (i.e., the cuadrilla is full
 * with exactly ANCHO_TRABAJADERA members, and a S swap has nothing to
 * bring in). The dispatcher in calcularCiclo catches this and surfaces
 * it as a user-visible error instead of letting it crash the app.
 */
export class CuadrillaDobladaSinDisponibleError extends Error {
  constructor(public readonly tramoIdx: number, public readonly cuadrilla: CuadrillaId) {
    super(
      `Tramo ${tramoIdx + 1} (secundario): la cuadrilla ${cuadrilla} no tiene disponibles para hacer el relevo intermedio. ` +
      `Una cuadrilla con exactamente ${ANCHO_TRABAJADERA} miembros no admite tramos secundarios después de un principal. ` +
      `Agregá más costaleros a la cuadrilla o cambiá el tramo a primario.`,
    )
    this.name = 'CuadrillaDobladaSinDisponibleError'
  }
}

/**
 * v1.2.91 B4: Thrown when `distribucionCuadrillas` (indices into
 * `t.nombres`) is invalid: duplicate indices, out-of-range, fewer than
 * `ancho` members in either cuadrilla, or overlap between A and B.
 * Carries the offending cuadrilla + index for actionable UI messages.
 * The dispatcher in calcularCiclo catches this and surfaces it as a
 * user-visible error instead of letting it crash the app.
 */
export class CuadrillaDobladaDistribucionInvalidaError extends Error {
  constructor(
    public readonly cuadrilla: CuadrillaId,
    public readonly indice: number,
    public readonly motivo:
      | "duplicado"
      | "fuera_de_rango"
      | "sub_ancho"
      | "overlap"
      | "suma_incorrecta"
      | "ancla_fuera_de_cuadrilla"
      | "ancla_duplicada"
      | "ancla_fuera_de_rango",
    detail?: string,
  ) {
    const mensajes: Record<typeof motivo, string> = {
      duplicado: `el índice ${indice} aparece más de una vez en la cuadrilla ${cuadrilla}`,
      fuera_de_rango: `el índice ${indice} está fuera de rango (nombres tiene ${detail ?? "N"} elementos)`,
      sub_ancho: `la cuadrilla ${cuadrilla} tiene menos de ${detail ?? "ancho"} miembros`,
      overlap: `el índice ${indice} aparece en la cuadrilla ${cuadrilla} y también en la otra`,
      suma_incorrecta: `la suma de A+B no coincide con el total de costaleros (suma=${detail ?? "?"})`,
      ancla_fuera_de_cuadrilla: `el ancla con índice ${indice} no pertenece a la cuadrilla ${cuadrilla}`,
      ancla_duplicada: `el índice ${indice} aparece más de una vez como ancla de la cuadrilla ${cuadrilla}`,
      ancla_fuera_de_rango: `el ancla con índice ${indice} está fuera de rango (nombres tiene ${detail ?? "N"} elementos)`,
    }
    super(
      `Distribución de cuadrilla inválida (cuadrilla ${cuadrilla}): ${mensajes[motivo]}. ` +
      `Corregí la distribución antes de calcular el plan.`,
    )
    this.name = 'CuadrillaDobladaDistribucionInvalidaError'
  }
}

/**
 * v1.2.93 #2: Thrown when the `bajas` filter reduces one of the
 * cuadrillas below `anchoRequerido` (ANCHO_TRABAJADERA). The
 * distribution itself was valid pre-bajas, so the old
 * `CuadrillaDobladaDistribucionInvalidaError` doesn't fire — but
 * filtering by `t.bajas` (B1) can leave a cuadrilla with fewer
 * members than its slot requires. This error is distinct from
 * "distribucionCuadrillas is invalid" because the problem is the
 * COMBINATION of distribution + bajas, not the distribution alone.
 *
 * Carries context for actionable UI messages: which cuadrilla
 * quedó corta, how many active members it has, the required
 * minimum, and the names of the costaleros that were filtered out
 * (so the capataz can see exactly which baja caused the issue).
 *
 * The dispatcher's catch-all converts it to the same
 * `{ error: msg }` shape as the rest.
 */
export class CuadrillaDobladaSubAnchoPostBajasError extends Error {
  constructor(
    public readonly cuadrilla: CuadrillaId,
    public readonly miembrosActivos: number,
    public readonly anchoRequerido: number,
    public readonly bajasAplicadas: string[],
  ) {
    const nombresBajas = bajasAplicadas.length > 0
      ? bajasAplicadas.join(", ")
      : "(ninguna)"
    super(
      `Distribución inválida post-bajas: la cuadrilla ${cuadrilla} quedó con ` +
      `${miembrosActivos} miembros activos (mínimo ${anchoRequerido}). ` +
      `Baja(s) aplicada(s): ${nombresBajas}. ` +
      `Corregí la distribución o agregá más costaleros antes de calcular el plan.`,
    )
    this.name = 'CuadrillaDobladaSubAnchoPostBajasError'
  }
}

/**
 * Thrown when `sugerirDistribucion(t)` receives malformed input:
 * `t.roles` is undefined or `t.roles.length !== t.nombres.length`.
 * Partial-but-valid role coverage is NOT an error — it produces a warning.
 */
export class CuadrillaDobladaRolesInsuficientesError extends Error {
  constructor(public readonly motivo: string) {
    super(`sugerirDistribucion: ${motivo}`)
    this.name = 'CuadrillaDobladaRolesInsuficientesError'
  }
}

export type CuadrillaId = "A" | "B"
/**
 * v1.3.2: All relevos are now intra-cuadrilla. Regla 1 forbids crossing
 * costaleros between A and B in a single relevo, so the prior
 * `"principal" | "intermedio"` distinction collapsed into a single value.
 */
export type TipoRelevo = "intra" | "inter"

export interface Cuadrilla {
	id: CuadrillaId
	miembros: string[]
}

export interface Distribucion {
	a: string[]
	b: string[]
	/** Ephemeral warning for partial role coverage. Never persisted. */
	warning?: string
}

export interface Relevo {
	tipo: TipoRelevo
	numero: number
	cuadrilla: CuadrillaId
	sale: string[]
	entra: string[]
	/**
	 * v1.5.0: Personas que se mantienen en `cargando` durante este
	 * relevo sin pasar por disp (porque son anclas que sobrevivieron
	 * la transición). Incluye anclas propias y externas. El adapter
	 * `relevosATramoSlots` las suma al `dentro` para que el capataz
	 * vea el total correcto de personas cargando.
	 */
	mantiene?: string[]
}

export interface EstadoCuadrilla {
	cargando: string[]
	disponibles: string[]
	/**
	 * v1.5.0: Anclas (por nombre) que están actualmente en `cargando`.
	 * Las anclas no salen en SWAP; se mantienen incluso durante
	 * `transicionActiva`. Si un ancla no está en `cargando` (porque
	 * está esperando turno), aparece en `disponibles` como un
	 * costalero normal — se reincorpora al primer LOAD.
	 *
	 * Si el set está vacío, no hay lógica de ancla activa (legacy).
	 * Default `[]` para mantener compatibilidad con código/tests
	 * que construyen `EstadoCuadrilla` directamente.
	 */
	anclasCargando?: string[]
}

export interface EstadoPlan {
	cuadrillaActiva: CuadrillaId
	estados: Record<CuadrillaId, EstadoCuadrilla>
}

/**
 * Determina si una trabajadera PUEDE doblarse (>= 2*ancho costaleros).
 */
export function puedeDoblarse(costaleros: string[], ancho = ANCHO_TRABAJADERA): boolean {
	return costaleros.length >= 2 * ancho
}

/**
 * Determina si el capataz debe DECIDIR si dobla o no.
 * Solo true cuando está en el umbral exacto (2*ancho), donde doblar da
 * una estructura degenerada (A=5, B=5, sin intermedios).
 */
export function requiereDecisionDoblado(costaleros: string[], ancho = ANCHO_TRABAJADERA): boolean {
	return costaleros.length === 2 * ancho
}

/**
 * Returns true when `t.roles` is present and has the same length as `t.nombres`.
 * Used as a guard before calling the role-aware `sugerirDistribucion(t)`.
 */
export function tieneRolesAsignados(t: Trabajadera): boolean {
	return !!t.roles && t.roles.length === t.nombres.length
}

/**
 * Role-aware distribution: greedy coverage pass over estructuraPaso targets,
 * COR-only fallback for COR slot, sobrante to smaller squad, reorder by
 * estructuraPaso (deterministic).
 *
 * Throws CuadrillaDobladaRolesInsuficientesError when t.roles is missing or
 * length-mismatched. Partial-but-valid coverage returns a warning, not an error.
 */
export function sugerirDistribucion(t: Trabajadera): Distribucion {
	// 1. GUARD: malformed input throws. Partial-but-valid does NOT.
	if (!t.roles || t.roles.length !== t.nombres.length) {
		throw new CuadrillaDobladaRolesInsuficientesError(
			`roles.length=${t.roles?.length ?? 0}, nombres.length=${t.nombres.length}`,
		)
	}

	// 2. Build pool as (name, pri) tuples.
	const pool = t.nombres.map((name, i) => ({ name, pri: t.roles![i].pri }))

	// 3. Coverage pass: for each target role (in estructuraPaso order),
	//    consume the first eligible non-COR-only costalero with matching pri.
	const targets = estructuraPaso(t.id)
	const a: { name: string; pri: RolCode }[] = []
	const b: { name: string; pri: RolCode }[] = []
	const taken = new Set<string>()
	const missing: RolCode[] = []

	for (const target of targets) {
		for (const squad of [a, b] as const) {
			const idx = pool.findIndex(
				(m) => !taken.has(m.name) && m.pri === target,
			)
			if (idx >= 0) {
				squad.push(pool[idx])
				taken.add(pool[idx].name)
			} else if (target === "COR") {
				// COR fallback: consume any available costalero
				const corIdx = pool.findIndex((m) => !taken.has(m.name))
				if (corIdx >= 0) {
					squad.push(pool[corIdx])
					taken.add(pool[corIdx].name)
				}
			}
		}
		// Track missing roles
		const aHas = a.some((m) => m.pri === target)
		const bHas = b.some((m) => m.pri === target)
		if (!aHas || !bHas) {
			if (!missing.includes(target)) missing.push(target)
		}
	}

	// 4. Sobrante: fill smaller squad first (deterministic).
	for (const m of pool) {
		if (taken.has(m.name)) continue
		if (a.length <= b.length) a.push(m)
		else b.push(m)
	}

	// 5. Reorder by estructuraPaso — DETERMINISTIC.
	const orderIdx = (pri: RolCode) => targets.indexOf(pri)
	const sortByRol = (sq: typeof a) =>
		[...sq].sort((x, y) => orderIdx(x.pri) - orderIdx(y.pri))
	const aSorted = sortByRol(a)
	const bSorted = sortByRol(b)

	// 6. Optional warning. NEVER throw on partial coverage.
	const result: Distribucion = {
		a: aSorted.map((m) => m.name),
		b: bSorted.map((m) => m.name),
	}
	if (missing.length > 0) {
		result.warning = `Falta cobertura: ${missing.join(", ")}`
	}
	return result
}

/**
 * Internal index-based fallback when `t.roles` is missing.
 * Exported for caller-guard pattern at external call sites (trabajaderaStore).
 */
export function sugerirDistribucionIndex(costaleros: string[]): Distribucion {
	const total = costaleros.length
	const mitad = Math.floor(total / 2)
	const a = costaleros.slice(0, mitad + (total % 2))
	const b = costaleros.slice(mitad + (total % 2))
	return { a, b }
}

/**
 * Agrupa costaleros en cuadrillas. Si no se pasa distribución, usa la sugerida.
 * When `t` is provided with valid roles, uses role-aware distribution.
 */
export function agruparEnCuadrillas(
	costaleros: string[],
	distribucion?: Distribucion,
	ancho = ANCHO_TRABAJADERA,
	t?: Trabajadera,
): { a: Cuadrilla; b: Cuadrilla } {
	const dist = distribucion ?? (t && tieneRolesAsignados(t) ? sugerirDistribucion(t) : sugerirDistribucionIndex(costaleros))
	const suma = dist.a.length + dist.b.length
	if (suma !== costaleros.length) {
		throw new Error(
			`Distribución inválida: suma=${suma}, costaleros=${costaleros.length}`,
		)
	}
	if (dist.a.length < ancho && dist.b.length < ancho) {
		// ok, al menos una puede doblarse
	}
	void ancho
	return {
		a: { id: "A", miembros: [...dist.a] },
		b: { id: "B", miembros: [...dist.b] },
	}
}

/**
 * v1.2.91 B4: Validates `t.distribucionCuadrillas` (indices into
 * `t.nombres`) before any state mutation. Throws a typed
 * `CuadrillaDobladaDistribucionInvalidaError` on the first violation
 * found, carrying enough context (cuadrilla, indice, motivo) for the
 * UI to surface a useful message.
 *
 * Checks (in order, short-circuit on first failure):
 *   1. Each cuadrilla has at least `ancho` members.
 *   2. No duplicate indices within a single cuadrilla.
 *   3. All indices are in `[0, totalNombres)`.
 *   4. A and B don't share any index (overlap).
 */
export function validarDistribucionCuadrillas(
	distribucion: { a: number[]; b: number[] },
	totalNombres: number,
	ancho: number = ANCHO_TRABAJADERA,
): void {
	// v1.2.92 #6: suma === totalNombres must hold. Without this, a 9/12
	// split (with 12 totales) passes B4 and dies in `agruparEnCuadrillas`
	// (line 138) with a generic `Error` that escapes the typed-error net.
	// Check this first so over/under-assignment is caught before
	// duplicates/overlap/range checks (which become meaningless if sizes
	// don't add up).
	const suma = distribucion.a.length + distribucion.b.length
	if (suma !== totalNombres) {
		throw new CuadrillaDobladaDistribucionInvalidaError(
			"A",
			-1,
			"suma_incorrecta",
			`${suma}, total=${totalNombres}`,
		)
	}
	if (distribucion.a.length < ancho) {
		throw new CuadrillaDobladaDistribucionInvalidaError(
			"A",
			-1,
			"sub_ancho",
			String(ancho),
		)
	}
	if (distribucion.b.length < ancho) {
		throw new CuadrillaDobladaDistribucionInvalidaError(
			"B",
			-1,
			"sub_ancho",
			String(ancho),
		)
	}
	const seenA = new Set<number>()
	for (const idx of distribucion.a) {
		if (seenA.has(idx)) {
			throw new CuadrillaDobladaDistribucionInvalidaError("A", idx, "duplicado")
		}
		seenA.add(idx)
	}
	const seenB = new Set<number>()
	for (const idx of distribucion.b) {
		if (seenB.has(idx)) {
			throw new CuadrillaDobladaDistribucionInvalidaError("B", idx, "duplicado")
		}
		seenB.add(idx)
	}
	for (const idx of distribucion.a) {
		if (idx < 0 || idx >= totalNombres) {
			throw new CuadrillaDobladaDistribucionInvalidaError(
				"A",
				idx,
				"fuera_de_rango",
				String(totalNombres),
			)
		}
	}
	for (const idx of distribucion.b) {
		if (idx < 0 || idx >= totalNombres) {
			throw new CuadrillaDobladaDistribucionInvalidaError(
				"B",
				idx,
				"fuera_de_rango",
				String(totalNombres),
			)
		}
	}
	for (const idx of distribucion.a) {
		if (seenB.has(idx)) {
			throw new CuadrillaDobladaDistribucionInvalidaError("A", idx, "overlap")
		}
	}
}

/**
 * v1.5.0: Valida que las anclas estén bien formadas.
 *
 * Reglas:
 *  - Cada ancla debe ser un índice válido en [0, totalNombres).
 *  - Sin duplicados dentro de A ni dentro de B.
 *  - Anclas de A ⊆ distribución.A; anclas de B ⊆ distribución.B.
 *    (Una ancla de A que apunta a un índice que está en B es un error,
 *    porque el ancla "pertenece" a su cuadrilla para efectos de carga.)
 *
 * No valida: que las anclas sobrevivan a las bajas (eso lo hace
 * `simularCicloConTipos` después del filter, y lanza el error genérico
 * de sub-ancho si el resultado es inviable).
 */
export function validarAnclas(
	anclas: { a: number[]; b: number[] },
	distribucion: { a: number[]; b: number[] },
	totalNombres: number,
): void {
	const distASet = new Set(distribucion.a)
	const distBSet = new Set(distribucion.b)
	const seenA = new Set<number>()
	for (const idx of anclas.a) {
		if (idx < 0 || idx >= totalNombres) {
			throw new CuadrillaDobladaDistribucionInvalidaError(
				"A",
				idx,
				"ancla_fuera_de_rango",
				String(totalNombres),
			)
		}
		if (seenA.has(idx)) {
			throw new CuadrillaDobladaDistribucionInvalidaError("A", idx, "ancla_duplicada")
		}
		seenA.add(idx)
		if (!distASet.has(idx)) {
			throw new CuadrillaDobladaDistribucionInvalidaError(
				"A",
				idx,
				"ancla_fuera_de_cuadrilla",
			)
		}
	}
	const seenB = new Set<number>()
	for (const idx of anclas.b) {
		if (idx < 0 || idx >= totalNombres) {
			throw new CuadrillaDobladaDistribucionInvalidaError(
				"B",
				idx,
				"ancla_fuera_de_rango",
				String(totalNombres),
			)
		}
		if (seenB.has(idx)) {
			throw new CuadrillaDobladaDistribucionInvalidaError("B", idx, "ancla_duplicada")
		}
		seenB.add(idx)
		if (!distBSet.has(idx)) {
			throw new CuadrillaDobladaDistribucionInvalidaError(
				"B",
				idx,
				"ancla_fuera_de_cuadrilla",
			)
		}
	}
}

/**
 * Crea el estado inicial. Empieza con A marcada como activa pero NINGUNA
 * cuadrilla está aún cargando — todas tienen `cargando = []` y la totalidad
 * de sus miembros en `disponibles`. El primer relevo principal rearma la
 * primera cuadrilla activa desde sus disponibles.
 */
export function crearEstadoInicial(
	distribucion: Distribucion,
	ancho = ANCHO_TRABAJADERA,
	anclas?: { a: string[]; b: string[] },
): EstadoPlan {
	void ancho
	function init(miembros: string[]): EstadoCuadrilla {
		// v1.5.0: las anclas se inicializan en `disponibles` (no en
		// `cargando`) — al primer LOAD de la cuadrilla, se meten
		// automáticamente. A partir de ahí se quedan en `cargando`
		// hasta que la cuadrilla termina su turno completo.
		return {
			cargando: [],
			disponibles: [...miembros],
			anclasCargando: [],
		}
	}
	void anclas
	void ancho
	return {
		cuadrillaActiva: "A",
		estados: {
			A: init(distribucion.a),
			B: init(distribucion.b),
		},
	}
}

/**
 * v1.3.2 Regla 1: Transición de cuadrilla activa SIN cruce de personas.
 *
 * Saca la cuadrilla activa (sus cargando van al final de su disp) y
 * marca la otra como activa. NO carga la nueva cuadrilla todavía —
 * eso lo hace el siguiente `aplicarRelevoIntraCuadrilla` cuando su
 * `cargando` esté vacío (load desde disp).
 *
 * Por qué existe esta función: cuando el tipo de tramo cambia de P a S
 * (o viceversa), la cuadrilla activa tiene que cambiar. Antes, el
 * algoritmo mezclaba personas (sale de una, entra de otra) en un solo
 * relevo — eso violaba Regla 1. Ahora la transición es un cambio de
 * estado puro: la saliente "termina su turno" y la entrante "empieza
 * el suyo" en el siguiente relevo.
 *
 * El just-unloaded va al FINAL del disp (igual que un swap normal),
 * no al frente — así, cuando la cuadrilla vuelva a activarse, los
 * más antiguos del disp serán los primeros en cargar (no los recién
 * descargados). Sin esto, en patrones alternados P/S la rotación se
 * resetea cada vez que la cuadrilla vuelve a estar activa (los
 * mismos 5 vuelven a cargar siempre).
 *
 * Idempotente: si la activa ya es la pedida, devuelve el mismo estado.
 */
export function transicionActiva(
	estado: EstadoPlan,
	nueva: CuadrillaId,
): EstadoPlan {
	if (estado.cuadrillaActiva === nueva) return estado
	const activa = estado.cuadrillaActiva
	const eActiva = estado.estados[activa]
	// v1.5.0: las anclas que están actualmente en `cargando` se
	// MANTIENEN ahí (no van al disp). Esto es lo que produce los
	// relevos mixtos A↔B del patrón ideal: las anclas de la
	// cuadrilla saliente siguen cargando mientras la nueva cuadrilla
	// aporta el resto. Los no-anclas sí transicionan al disp (legacy).
	const anclasCargando = eActiva.anclasCargando ?? []
	const cargandoNoAnclas = eActiva.cargando.filter(
		(name) => !anclasCargando.includes(name),
	)
	const cargandoAnclas = eActiva.cargando.filter((name) =>
		anclasCargando.includes(name),
	)
	return {
		cuadrillaActiva: nueva,
		estados: {
			...estado.estados,
			[activa]: {
				// Mantenemos las anclas en cargando (no se van al disp).
				// Si la nueva activa es la misma cuadrilla, las anclas
				// siguen sin relevo explícito. Si es la otra, las
				// anclas se quedan "ancladas" mientras B entra.
				cargando: cargandoAnclas,
				// v1.4.1: just-unloaded (los no-anclas que estaban en
				// cargando) van al FRENTE del disp, y el "sale"
				// anterior (que ya estaba en disp) va al FINAL. Esto
				// es la inversión del invariante de v1.3.2 — pero la
				// intención es la misma: que el costalero que acaba
				// de salir espere más antes de volver a cargar. Antes
				// el "sale anterior" iba al frente y trapaba la
				// rotación (siempre salía y entraba el mismo). Ahora
				// va al final y deja que otros miembros de la
				// cuadrilla roten primero.
				disponibles: [...cargandoNoAnclas, ...eActiva.disponibles],
				anclasCargando: eActiva.anclasCargando,
			},
		},
	}
}

/**
 * v1.3.2: Aplica un relevo intra-cuadrilla sobre la cuadrilla activa.
 * SALE el más antiguo de cargando (FIFO), ENTRA el primero de disponibles
 * (FIFO). El que sale va al final de disponibles.
 *
 * Casos:
 *  - cargando vacío + disp con >= ancho miembros → load: sale=[],
 *    entra=primeros `ancho` de disp (la cuadrilla arranca su turno).
 *  - cargando lleno + disp vacío → throw CuadrillaDobladaSinDisponibleError.
 *  - camino normal: swap 1-a-1.
 *
 * Regla 2 (max 3 tramos consecutivos fuera): si `regla2` está activo y
 * algún miembro de disp tiene streak >= 3, se Override del FIFO: ese
 * costalero entra en lugar del FIFO natural. Esto evita que su streak
 * llegue a 4 en el siguiente slot. Si todos los candidatos en disp están
 * a streak 3, sólo uno se rescata por swap (el primero en orden FIFO) —
 * el resto sufrirá el fallback.
 *
 * El mapa `streaks` se actualiza in-place y representa el streak "fuera"
 * de cada costalero al terminar este relevo:
 *  - sale (dejó el cargando) → streak = 1
 *  - entra (vino del disp) → streak = 0
 *  - los que siguen en disp (no son entra) → streak += 1
 *  - los que siguen en cargando (no son sale) → streak = 0
 */
export function aplicarRelevoIntermedio(
	estado: EstadoPlan,
	ancho = ANCHO_TRABAJADERA,
	regla2 = true,
	streaks: Map<string, number> = new Map(),
	anclasSet?: Set<string>,
	anclasExternas: number = 0,
): { estado: EstadoPlan; relevo: Relevo } {
	const activa = estado.cuadrillaActiva
	const eActiva = estado.estados[activa]

	// v1.2.90 B2: si la cuadrilla activa está vacía (cargando=[]), no
	// hay nadie a quien SALE. Si hay disponibles, "cargamos" la cuadrilla
	// desde disp (los primeros ANCHO pasan a cargando, el resto queda en
	// disp). Esto es un no-swap (sale=[], entra=los que entraron) que
	// ocurre naturalmente justo después de una `transicionActiva`.
	//
	// v1.5.0: si cargando.length < ancho, también es un LOAD (parcial).
	// Esto ocurre cuando la cuadrilla vuelve a estar activa y solo las
	// anclas se mantuvieron en cargando tras `transicionActiva`. Las
	// anclas pre-cargadas se mantienen; se completa con no-anclas del
	// disp hasta llegar a `ancho`.
	// v1.5.0: el caso LOAD se activa en dos situaciones:
	//   1. cargando === 0 (caso inicial o recién transitado sin
	//      anclas) → LOAD puro desde el disp.
	//   2. cargando < ancho PERO hay anclas propias pre-cargadas
	//      (caso típico: la cuadrilla vuelve a estar activa tras una
	//      transición y solo se mantuvieron las anclas). Aquí
	//      necesitamos rellenar con no-anclas del disp para volver
	//      a `ancho`.
	// Si cargando < ancho pero NO hay anclas propias cargadas, NO
	// es un LOAD (sería un SWAP — entrar al camino SWAP).
	const cargandoAnclas = (eActiva.anclasCargando ?? []).filter((n) =>
		eActiva.cargando.includes(n),
	)
	const esLoadPorAnclasExternas =
		cargandoAnclas.length > 0 && eActiva.cargando.length < ancho
	if (eActiva.cargando.length === 0 || esLoadPorAnclasExternas) {
		// Si ya hay personas en cargando, son las anclas que
		// sobrevivieron la transición. Las tratamos como "ya
		// cargando" y completamos hasta `ancho` con no-anclas del
		// disp. Si la cuadrilla está completamente vacía (caso
		// inicial), se cargan tanto anclas como no-anclas hasta
		// llegar a `ancho` desde el disp.
		// v1.5.0: total de candidatos = disponibles normales +
		// anclas en disponibles + anclas ya en cargando (que se
		// mantienen). Si anclasSet está definido, filtramos las
		// anclas del disp normal y las tratamos como "entran
		// primero" para mantener la regla de "5 dentro mínimo
		// aunque haya más disponibles".
		const dispNoAnclas = anclasSet
			? eActiva.disponibles.filter((n) => !anclasSet.has(n))
			: eActiva.disponibles
		const dispAnclasEnDisp = anclasSet
			? eActiva.disponibles.filter((n) => anclasSet.has(n))
			: []
		// `cargandoAnclas` ya está definido arriba (en el check de
		// entrada al LOAD). Lo reusamos.
		const cargandoNoAnclas = eActiva.cargando.filter(
			(n) => !cargandoAnclas.includes(n),
		)
		// v1.5.0: las anclas externas ya cuentan hacia `ancho` (están
		// en el paso), así que la cuadrilla activa solo necesita
		// candidatos para `ancho - anclasExternas` huecos.
		const huecosRequeridos = ancho - anclasExternas
		const totalCandidatos =
			dispNoAnclas.length +
			dispAnclasEnDisp.length +
			cargandoAnclas.length
		if (totalCandidatos < huecosRequeridos) {
			if (totalCandidatos === 0) {
				throw new Error(
					`Cuadrilla ${activa} está completamente vacía (sin cargando ni disponibles) para relevo intermedio`,
				)
			}
			throw new CuadrillaDobladaSinDisponibleError(-1, activa)
		}

		// v1.5.0: las anclas que ya están en cargando (sobrevivieron
		// a la transición) se MANTIENEN. Si la cuadrilla está
		// completamente vacía (caso inicial), cargamos anclas + no-anclas
		// del disp hasta llegar a `ancho`. Si hay anclas pre-cargadas,
		// las mantenemos y completamos con no-anclas del disp.
		// v1.5.0: `anclasExternas` = cuántas anclas de la OTRA
		// cuadrilla se mantienen en cargando (porque no salieron en
		// la transición). Esas cuentan para el `ancho` total desde
		// el punto de vista del capataz (5 dentro siempre), así que
		// esta cuadrilla solo necesita cargar `ancho - anclasExternas
		// - anclasPropiasCargando` personas del disp.
		const huecosLibres = ancho - cargandoAnclas.length - anclasExternas
		const anclasQueEntran =
			cargandoAnclas.length === 0
				? dispAnclasEnDisp.slice(0, huecosLibres)
				: []
		const huecosParaNoAnclas = huecosLibres - anclasQueEntran.length
		let entraIdx = 0
		if (regla2) {
			const disp = dispNoAnclas
			let bestIdx = -1
			for (let i = 0; i < disp.length; i++) {
				if ((streaks.get(disp[i]) ?? 0) >= 3) {
					bestIdx = i
					break
				}
			}
			if (bestIdx >= 0) {
				const candidate = bestIdx - (huecosParaNoAnclas - 1)
				if (candidate >= 0 && candidate + huecosParaNoAnclas <= disp.length) {
					entraIdx = candidate
				}
			}
		}
		const noAnclasQueEntran = dispNoAnclas.slice(entraIdx, entraIdx + huecosParaNoAnclas)
		const restantesNoAnclas = [
			...dispNoAnclas.slice(0, entraIdx),
			...dispNoAnclas.slice(entraIdx + huecosParaNoAnclas),
		]
		const restantesAnclas = dispAnclasEnDisp.slice(anclasQueEntran.length)
		// El "entra" del Relevo son los que PASAN de disp → cargando
		// en este relevo. NO incluye las anclas que ya estaban en
		// cargando (porque no hay "sale" que las traiga, ya estaban).
		const nuevosCargando = [
			...cargandoAnclas,
			...anclasQueEntran,
			...cargandoNoAnclas,
			...noAnclasQueEntran,
		]
		const restantes = [...restantesAnclas, ...restantesNoAnclas]
		const nuevasAnclasCargando = [
			...cargandoAnclas,
			...anclasQueEntran,
		]
		const nuevoEstado: EstadoPlan = {
			cuadrillaActiva: activa,
			estados: {
				...estado.estados,
				[activa]: {
					cargando: nuevosCargando,
					disponibles: restantes,
					anclasCargando: nuevasAnclasCargando,
				},
			},
		}

		// Streak updates: los que entran vuelven a inside (streak = 0);
		// los que quedan en disp acumulan (streak += 1).
		for (const p of noAnclasQueEntran) streaks.set(p, 0)
		for (const p of anclasQueEntran) streaks.set(p, 0)
		for (const p of restantes) {
			streaks.set(p, (streaks.get(p) ?? 0) + 1)
		}
		// v1.3.3 Regla 2 cross-cuadrilla: la cuadrilla INACTIVA también
		// acumula streaks en su disp durante este slot. Sin esto, los
		// costaleros de la cuadrilla opuesta quedan "congelados" en su
		// streak y pueden llegar a 4+ mientras la activa rota.
		const inactiveLoad: CuadrillaId = activa === "A" ? "B" : "A"
		for (const p of estado.estados[inactiveLoad].disponibles) {
			streaks.set(p, (streaks.get(p) ?? 0) + 1)
		}

		const relevo: Relevo = {
			tipo: "intra",
			numero: 0,
			cuadrilla: activa,
			sale: [],
			// "entra" = lo que pasa de disp a cargando en ESTE relevo.
			// NO incluye las anclas que ya estaban en cargando
			// (propias ni externas) — esos no se "mueven".
			entra: [...anclasQueEntran, ...noAnclasQueEntran],
		}
		// v1.5.0: si hay anclas externas, este relevo es MIXTO
		// (la otra cuadrilla tiene a alguien en cargando). Lo
		// marcamos como tipo "inter" para que la UI lo muestre
		// distintivamente. Mantenemos `cuadrilla` = la activa
		// (la que "hace" el relevo en este turno).
		// `mantiene` = personas que se quedan en cargando sin
		// pasar por disp (anclas propias pre-cargadas + anclas
		// externas). El adapter `relevosATramoSlots` las suma al
		// `dentro` del slot para que el capataz vea el total
		// correcto.
		if (anclasExternas > 0) {
			relevo.tipo = "inter"
		}
		relevo.mantiene = [
			...cargandoAnclas,
			...estado.estados[activa === "A" ? "B" : "A"].anclasCargando ?? [],
		]
		return { estado: nuevoEstado, relevo }
	}

	// Camino normal: sale uno de cargando (FIFO), entra uno de disp (FIFO
	// — o Rule 2 override).
	// v1.5.0: el "sale" debe ser un no-ancla. Buscar el primer
	// no-ancla en cargando; si todos son anclas, error.
	let saleIdx = 0
	if (anclasSet) {
		let foundNoAncla = false
		for (let i = 0; i < eActiva.cargando.length; i++) {
			if (!anclasSet.has(eActiva.cargando[i])) {
				saleIdx = i
				foundNoAncla = true
				break
			}
		}
		if (!foundNoAncla) {
			throw new Error(
				`Cuadrilla ${activa} no puede hacer swap: todos los cargando son anclas`,
			)
		}
	}
	// v1.5.0: el "entra" es un no-ancla del disp. Si no hay
	// no-anclas en disp, se permite un "swap parcial" (solo sale
	// 1, no entra nadie — el que sale va al disp). Esto ocurre
	// cuando la cuadrilla tiene más cargando que ANCHO (caso
	// típico: 6 A con 1 ancla cargando en T1, 1 swap en T2 para
	// mantener 5 dentro).
	const dispNoAnclasSwap = anclasSet
		? eActiva.disponibles.filter((n) => !anclasSet.has(n))
		: eActiva.disponibles
	if (dispNoAnclasSwap.length === 0 && !anclasSet) {
		// Legacy: si no hay disp y no estamos en modo ancla, error.
		throw new CuadrillaDobladaSinDisponibleError(-1, activa)
	}
	if (dispNoAnclasSwap.length === 0 && eActiva.cargando.length <= ANCHO_TRABAJADERA) {
		// Modo ancla pero no estamos "sobrecargados": error.
		throw new CuadrillaDobladaSinDisponibleError(-1, activa)
	}
	const sale = eActiva.cargando[saleIdx]
	const restoCargando = [
		...eActiva.cargando.slice(0, saleIdx),
		...eActiva.cargando.slice(saleIdx + 1),
	]

	let entraIdx = 0
	let entra: string | null = null
	if (dispNoAnclasSwap.length > 0) {
		if (regla2) {
			for (let i = 0; i < dispNoAnclasSwap.length; i++) {
				if ((streaks.get(dispNoAnclasSwap[i]) ?? 0) >= 3) {
					entraIdx = i
					break
				}
			}
		}
		entra = dispNoAnclasSwap[entraIdx]
	}
	const restoDisponibles = entra !== null
		? [
				...eActiva.disponibles.slice(0, eActiva.disponibles.indexOf(entra)),
				...eActiva.disponibles.slice(eActiva.disponibles.indexOf(entra) + 1),
			]
		: [...eActiva.disponibles]
	// Si el sale era ancla, lo sacamos de anclasCargando. Si no,
	// mantenemos el set como está.
	const nuevasAnclasCargando = (anclasSet && eActiva.anclasCargando)
		? eActiva.anclasCargando.filter((n) => n !== sale)
		: eActiva.anclasCargando ?? []

	const nuevoEstado: EstadoPlan = {
		cuadrillaActiva: activa,
		estados: {
			...estado.estados,
			[activa]: {
				cargando: entra !== null
					? [...restoCargando, entra]
					: restoCargando,
				disponibles: [...restoDisponibles, sale],
				anclasCargando: nuevasAnclasCargando,
			},
		},
	}

	// Streak updates
	streaks.set(sale, 1) // acaba de salir al disp
	if (entra !== null) streaks.set(entra, 0) // acaba de entrar al cargando
	for (const p of restoDisponibles) {
		streaks.set(p, (streaks.get(p) ?? 0) + 1)
	}
	for (const p of restoCargando) {
		streaks.set(p, 0)
	}
	// v1.3.3 Regla 2 cross-cuadrilla: la INACTIVA también acumula en
	// su disp (estos costaleros están fuera en este slot, deben
	// acumular su racha).
	const inactiveSwap: CuadrillaId = activa === "A" ? "B" : "A"
	for (const p of estado.estados[inactiveSwap].disponibles) {
		streaks.set(p, (streaks.get(p) ?? 0) + 1)
	}

	const relevo: Relevo = {
		tipo: "intra",
		numero: 0,
		cuadrilla: activa,
		sale: [sale],
		entra: entra !== null ? [entra] : [],
		// v1.5.0: `mantiene` = personas que se quedan en cargando
		// sin pasar por disp (anclas externas de la otra
		// cuadrilla). El adapter `relevosATramoSlots` las suma al
		// `dentro` del slot.
		mantiene: [
			...estado.estados[activa === "A" ? "B" : "A"].anclasCargando ?? [],
		],
	}
	return { estado: nuevoEstado, relevo }
}

/**
 * v1.3.2 Regla 1: simula UN ciclo completo intra-cuadrilla.
 *
 * Para legacy compat: cuando no hay `tramosTipo` explícito, sintetizamos
 * un patrón que cubre una rotación entera por cada cuadrilla:
 *   - `(|A| - ancho + 1)` tramos tipo P (uno para cargar + rotación)
 *   - `(|B| - ancho + 1)` tramos tipo S (uno para cargar + rotación)
 *
 * Total = |A| + |B| - 2·ancho + 2 = sum - 8 (con ancho=5).
 *   - 10 (5/5) → 2 relevos
 *   - 11 (6/5) → 3 relevos
 *   - 13 (7/6) → 5 relevos
 *
 * NOTA: el primer relevo del bloque de cada cuadrilla es un "load"
 * (sale=[], entra=primeros 5), no un swap. Eso refleja que la cuadrilla
 * entra "fría" (recién transicionada o recién creada).
 *
 * El estado al final NO coincide necesariamente con el inicial — la
 * rotación de disponibles es FIFO y solo se cierra tras varios ciclos.
 */
export function simularCicloCompleto(
	costaleros: string[],
	distribucion?: Distribucion,
	ancho = ANCHO_TRABAJADERA,
	t?: Trabajadera,
): Relevo[] {
	const dist = distribucion ?? (t && tieneRolesAsignados(t) ? sugerirDistribucion(t) : sugerirDistribucionIndex(costaleros))
	const cuadrillas = agruparEnCuadrillas(costaleros, dist, ancho, t)
	if (cuadrillas.a.miembros.length < ancho || cuadrillas.b.miembros.length < ancho) {
		throw new Error(
			`Para simular ciclo doblado, ambas cuadrillas deben tener al menos ${ancho} miembros. A=${cuadrillas.a.miembros.length}, B=${cuadrillas.b.miembros.length}`,
		)
	}

	// Sintetizar tramosTipo legacy: P x (|A|-ancho+1) + S x (|B|-ancho+1)
	const tramosTipo: TramoTipo[] = [
		...Array(Math.max(0, cuadrillas.a.miembros.length - ancho + 1)).fill(
			"primario" as TramoTipo,
		),
		...Array(Math.max(0, cuadrillas.b.miembros.length - ancho + 1)).fill(
			"secundario" as TramoTipo,
		),
	]

	// v1.4.0: el legacy path replica el comportamiento agrupado que
	// existía antes del fix de cadencia mini-ciclo. Como
	// `simularCicloConTipos` ya no agrupa por tipo, este loop
	// itera directo sobre el array sintetizado (que de por sí ya
	// está agrupado: todos los P primero, luego todos los S). El
	// resultado es el mismo que la v1.3.3: una rotación por
	// cuadrilla, sin alternancia. NO usamos el orquestador nuevo
	// porque la cadencia legacy es exactamente lo que el capataz
	// cambió en v1.4.0 — preservarla acá es deliberado.
	const distCompleta: Distribucion = {
		a: cuadrillas.a.miembros,
		b: cuadrillas.b.miembros,
	}
	let estado = crearEstadoInicial(distCompleta, ancho)
	const relevos: Relevo[] = []
	let n = 1
	const streaks = new Map<string, number>()

	for (const tipo of tramosTipo) {
		const required: CuadrillaId = tipo === "primario" ? "A" : "B"
		if (estado.cuadrillaActiva !== required) {
			estado = transicionActiva(estado, required)
		}
		const r = aplicarRelevoIntermedio(estado, ancho, true, streaks)
		estado = r.estado
		relevos.push({ ...r.relevo, numero: n++ })
	}
	return relevos
}

/**
 * Adapter: maps cuadrilla doblada simulation output to TramoSlot[] shape.
 * Returns [] when n < 10 (defensive guard).
 * Throws if any name in the simulation is missing from t.nombres.
 *
 * Each TramoSlot represents the state AFTER a relevo: `dentro` = who is
 * currently cargando (inside), `fuera` = everyone else.
 */
export function cuadrillaDobladaATramoSlots(
	t: Trabajadera,
	distribucion?: Distribucion,
): TramoSlot[] {
	if (t.nombres.length < UMBRAL_DOBLADO) return [];

	// v1.2.92 #3 (defense at the leaf): validate distribucionCuadrillas
	// indices early. Without this, an out-of-range index (e.g. 99)
	// becomes t.nombres[99] === undefined, passes the `bajas` filter
	// (indexOf(undefined) === -1), and dies at line 483 below with the
	// generic "No se pudo mapear nombre a índice" Error — which is NOT
	// a CuadrillaDoblada* error and escapes the typed-error net.
	// The dispatcher also validates (defense in depth) so direct callers
	// and the legacy branch in `calcularCiclo` both get a typed error.
	if (t.distribucionCuadrillas) {
		validarDistribucionCuadrillas(t.distribucionCuadrillas, t.nombres.length)
	}

	// If no distribution provided, try to build one from t.distribucionCuadrillas (indices)
	let dist = distribucion;
	// v1.2.93 #2 + #7: nombresActivos se usa para alinear `dist` (filtrado)
	// con la lista de costaleros que pasamos a `simularCicloCompleto` (que
	// exige `suma(dist) === length(costaleros)`). También es el set del
	// que `simularCicloCompleto` deriva los relevos. Filtra `undefined`
	// (defense in depth — ver #7 en simularCicloConTipos).
	const bajas = t.bajas ?? [];
	const nombresActivos = (bajas.length > 0
		? t.nombres.filter((_, i) => !bajas.includes(i))
		: t.nombres
	).filter((name): name is string => name !== undefined);
	if (!dist && t.distribucionCuadrillas) {
		// v1.2.93 #2 + #7: legacy path antes NO filtraba bajas (era
		// inconsistente con simularCicloConTipos). Ahora filtra y, si el
		// filter deja una cuadrilla sub-ancho, lanza el mismo error
		// tipado que el per-tramo path. También excluye `undefined` por
		// nombre (defense in depth — ver #7 en simularCicloConTipos).
		const filterBajas = (name: string | undefined): name is string =>
			name !== undefined && !bajas.includes(t.nombres.indexOf(name));
		const nombresBajas = bajas
			.map((i) => t.nombres[i])
			.filter((n): n is string => n !== undefined);
		const nombresA = t.distribucionCuadrillas.a.map((i) => t.nombres[i]).filter(filterBajas);
		const nombresB = t.distribucionCuadrillas.b.map((i) => t.nombres[i]).filter(filterBajas);
		if (nombresA.length < ANCHO_TRABAJADERA) {
			throw new CuadrillaDobladaSubAnchoPostBajasError(
				"A",
				nombresA.length,
				ANCHO_TRABAJADERA,
				nombresBajas,
			);
		}
		if (nombresB.length < ANCHO_TRABAJADERA) {
			throw new CuadrillaDobladaSubAnchoPostBajasError(
				"B",
				nombresB.length,
				ANCHO_TRABAJADERA,
				nombresBajas,
			);
		}
		dist = { a: nombresA, b: nombresB };
	}

	const relevos = simularCicloCompleto(nombresActivos, dist);
	const slots: TramoSlot[] = [];

	// Track cumulative cargando state across relevos.
	// v1.3.2 Regla 1: cuando la cuadrilla activa cambia entre relevos
	// consecutivos, el nuevo `cargando` se REEMPLAZA por los que entran
	// (los de la cuadrilla anterior se quedaron en su `disp` vía
	// `transicionActiva`, sin relevo explícito). Si no detectamos el
	// cambio de cuadrilla, el filtro "sale/entra" acumularía personas
	// de dos cuadrillas distintas en `cargando` (10 personas en lugar
	// de 5). Por eso acá se mira `relevo.cuadrilla` entre iteraciones.
	let cargando: string[] = [];
	let lastCuadrilla: CuadrillaId | null = null;

	for (const relevo of relevos) {
		if (lastCuadrilla !== null && lastCuadrilla !== relevo.cuadrilla) {
			// Cuadrilla activa cambió: descartamos cargando previo y
			// arrancamos con los que entran (sale=[] en load case).
			cargando = [...relevo.entra]
		} else {
			// Misma cuadrilla: swap o load (sale=[] si cargando estaba
			// vacío). Filtramos los que salen y agregamos los que entran.
			const saleSet = new Set(relevo.sale)
			cargando = cargando.filter((name) => !saleSet.has(name))
			for (const name of relevo.entra) {
				if (!cargando.includes(name)) {
					cargando.push(name)
				}
			}
		}
		lastCuadrilla = relevo.cuadrilla

		const dentroIndices = cargando.map((name) => {
			const idx = t.nombres.indexOf(name);
			if (idx === -1) {
				throw new Error(`No se pudo mapear nombre a índice: ${name}`);
			}
			return idx;
		});

		const allIndices = Array.from({ length: t.nombres.length }, (_, i) => i);
		const fueraIndices = allIndices
			.filter((i) => !dentroIndices.includes(i))
			.sort((a, b) => a - b);

		slots.push({
			dentro: [...dentroIndices].sort((a, b) => a - b),
			fuera: fueraIndices,
		});
	}

	return slots;
}

/**
 * v1.3.2: Simula `salidas` ciclos de cuadrilla doblada con designación
 * per-tramo P/S. Cada tramo produce UN relevo intra-cuadrilla:
 *
 *   - Si el tipo coincide con la cuadrilla activa actual → swap FIFO
 *     (sale uno de cargando, entra el primero de disponibles).
 *   - Si el tipo NO coincide → `transicionActiva` cambia el flag (sin
 *     generar relevo), y el relevo siguiente carga la nueva cuadrilla
 *     desde disp (sale=[], entra=primeros 5) o la rota si ya estaba
 *     cargada de un ciclo previo.
 *
 * Esto satisface la Regla 1: ningún relevo cruza personas entre A y B.
 *
 * Regla 2 (max 3 tramos consecutivos fuera): durante la selección FIFO
 * del entra, si algún miembro de `disponibles` tiene streak >= 3, se
 * Override del orden natural y se lo trae adentro. Si la estructura no
 * lo permite (todos los disponibles están a 3), el siguiente sufrirá
 * el fallback y quedará fuera por 4to tramo consecutivo.
 *
 * El `EstadoPlan` PERSISTE entre ciclos, así la rotación FIFO avanza
 * realmente de salida en salida. Sin esto, el capataz repetiría el
 * mismo plan y los costaleros "at pico" (mayor D count) serían siempre
 * los mismos.
 *
 * Throws Error("tramosTipo length must equal tramos length") si no
 * coinciden longitudes. Throws CuadrillaDobladaSinPrimarioError si no
 * hay ningún tramo primario.
 *
 * @param t           Trabajadera (provides nombres, distribucionCuadrillas, etc.)
 * @param tramosTipo  Per-tramo type designation, length must equal t.tramos.length
 * @param salidas     Number of cycles to simulate (default 1, backward compat).
 *                    Each cycle produces t.tramos.length relevos. Must be >= 1.
 */
export function simularCicloConTipos(
	t: Trabajadera,
	tramosTipo: TramoTipo[],
	salidas: number = 1,
): Relevo[] {
	if (tramosTipo.length !== t.tramos.length) {
		throw new Error("tramosTipo length must equal tramos length");
	}
	if (tramosTipo.length === 0) return [];
	if (salidas <= 0) return [];

	// Validate: at least one primario
	if (!tramosTipo.includes("primario")) {
		throw new CuadrillaDobladaSinPrimarioError();
	}

	// v1.2.91 B4: validate distribucionCuadrillas indices BEFORE any
	// state mutation. Without this, an invalid distribution (duplicate
	// index, out-of-range, sub-ancho, or A∩B overlap) silently corrupts
	// the FIFO queue or causes confusing "name/index drift" errors deep
	// in the simulation.
	if (t.distribucionCuadrillas) {
		validarDistribucionCuadrillas(t.distribucionCuadrillas, t.nombres.length)
	}
	// v1.5.0: validate anclas (si están marcadas). Mismo criterio
	// fail-fast que `validarDistribucionCuadrillas` — antes de mutar
	// estado, antes de cualquier relevo.
	if (t.anclas && t.distribucionCuadrillas) {
		validarAnclas(t.anclas, t.distribucionCuadrillas, t.nombres.length)
	}

	const costaleros = t.nombres;
	// v1.2.90 B1: filtrar costaleros de baja para que NO aparezcan en la
	// rotación. La distribución y la simulación solo usan los activos.
	// Los nombres siguen siendo los mismos (subset de t.nombres), así que
	// t.nombres.indexOf(name) en relevosATramoSlots sigue funcionando.
	// v1.2.93 #7: el filter también descarta `undefined` (defense in depth
	// — si la validación se bypasea y t.nombres[i] === undefined, no debe
	// participar de la simulación). `agruparEnCuadrillas` exige
	// suma(dist) === length(costaleros), así que ambos lados deben coincidir.
	const bajas = t.bajas ?? [];
	const nombresActivos = (bajas.length > 0
		? costaleros.filter((_, i) => !bajas.includes(i))
		: costaleros
	).filter((name): name is string => name !== undefined);
	// v1.2.93 #7: defense in depth — el filter descarta `undefined` por
	// nombre (t.nombres.indexOf(undefined) === -1, bajas.includes(-1) ===
	// false, así que el predicate clásico deja pasar undefined). El type
	// guard explícito lo excluye. Validación previa (#3) bloquea
	// out-of-range, pero defense in depth si esa validación se bypasea.
	const filterBajas = (name: string | undefined): name is string =>
		name !== undefined && !bajas.includes(t.nombres.indexOf(name));
	const nombresBajas = bajas
		.map((i) => t.nombres[i])
		.filter((n): n is string => n !== undefined);
	const distribucion = t.distribucionCuadrillas
		? {
				a: t.distribucionCuadrillas.a.map((i) => t.nombres[i]).filter(filterBajas),
				b: t.distribucionCuadrillas.b.map((i) => t.nombres[i]).filter(filterBajas),
			}
		: undefined;
	const dist = distribucion ?? (tieneRolesAsignados(t) ? sugerirDistribucion(t) : sugerirDistribucionIndex(nombresActivos))
	const cuadrillas = agruparEnCuadrillas(nombresActivos, dist, ANCHO_TRABAJADERA, t)
	// v1.2.93 #2: error tipado con contexto (cuadrilla, count, ANCHO,
	// nombres de las bajas). El capataz puede ver exactamente cuál
	// cuadrilla quedó corta y qué baja lo causó. El dispatcher's
	// catch-all lo convierte al shape { error: msg } estándar.
	if (cuadrillas.a.miembros.length < ANCHO_TRABAJADERA) {
		throw new CuadrillaDobladaSubAnchoPostBajasError(
			"A",
			cuadrillas.a.miembros.length,
			ANCHO_TRABAJADERA,
			nombresBajas,
		)
	}
	if (cuadrillas.b.miembros.length < ANCHO_TRABAJADERA) {
		throw new CuadrillaDobladaSubAnchoPostBajasError(
			"B",
			cuadrillas.b.miembros.length,
			ANCHO_TRABAJADERA,
			nombresBajas,
		)
	}
	const distCompleta: Distribucion = {
		a: cuadrillas.a.miembros,
		b: cuadrillas.b.miembros,
	}
	// v1.5.0: anclas por nombre (post-filter de bajas). Se resuelven
	// aquí una vez y se pasan a las funciones internas como Set<string>
	// (lookup O(1) en `aplicarRelevoIntermedio`). Si no hay anclas
	// marcadas, el set es undefined y el comportamiento es legacy
	// (mini-ciclo 2-2 puro sin mezcla A↔B).
	const anclasNombres: { a: string[]; b: string[] } | undefined =
		t.anclas
			? {
					a: t.anclas.a
						.map((i) => t.nombres[i])
						.filter((n): n is string => n !== undefined && !bajas.includes(t.nombres.indexOf(n))),
					b: t.anclas.b
						.map((i) => t.nombres[i])
						.filter((n): n is string => n !== undefined && !bajas.includes(t.nombres.indexOf(n))),
				}
			: undefined
	const anclasSetA = anclasNombres ? new Set(anclasNombres.a) : undefined
	const anclasSetB = anclasNombres ? new Set(anclasNombres.b) : undefined
	const anclasSetActiva = (cuad: CuadrillaId): Set<string> | undefined =>
		cuad === "A" ? anclasSetA : anclasSetB

	let estado = crearEstadoInicial(distCompleta, ANCHO_TRABAJADERA, anclasNombres)
	const relevos: Relevo[] = []
	let n = 1
	const streaks = new Map<string, number>()

	// v1.4.0: cadencia mini-ciclo alternada (capataz, feedback
	// 2026-08-21). Reemplaza el reagrupamiento por tipo de v1.3.3.
	//
	// Reglas de negocio (versión ESTRICTA, decisión del capataz):
	//   1. 1er SWAP obligatorio después del LOAD (mínimo 2 relevos
	//      por turno, sin importar el tipo del slot).
	//   2. Regla laxa: cualquier cuadrilla puede hacer relevo en
	//      cualquier slot — el tipo P/S del slot es metadata, no
	//      restricción de quién hace el relevo. La cuadrilla que
	//      "toma" cada slot se decide por cadencia (turn-based).
	//   3. Estricta 2-2: cada cuadrilla hace EXACTAMENTE 2 relevos
	//      por turno (1 LOAD + 1 SWAP) y cede. NO hay SWAP
	//      elástico. Si la cuadrilla puede hacer más swaps, no los
	//      hace — cede el turno.
	//   4. Si la cuadrilla activa se queda sin disponibles para el
	//      1er SWAP obligatorio, se lanza
	//      `CuadrillaDobladaSinDisponibleError` con el `tramoIdx`
	//      correspondiente. El catch-all en `dispatcher.ts` lo
	//      surfacea al usuario como mensaje claro. NO cede
	//      silenciosamente.
	// Contador de turno: 0=A, 1=B, 2=A, 3=B, ... (alternancia
	// estricta 2-2). NO depende del tipo de slot — la cadencia es
	// forzada por la posición del turno, no por P/S.
	let turno = 0
	for (let ciclo = 0; ciclo < salidas; ciclo++) {
		let tramoIdx = 0
		while (tramoIdx < tramosTipo.length) {
			const cuadrillaTurno: CuadrillaId = turno % 2 === 0 ? "A" : "B"

			// 1. Transición si hace falta (NO genera relevo). Es
			//    esperable que SIEMPRE se transicione acá, porque
			//    cada turno cambia de cuadrilla.
			if (estado.cuadrillaActiva !== cuadrillaTurno) {
				estado = transicionActiva(estado, cuadrillaTurno)
			}

			// v1.5.0: contar cuántas anclas de la OTRA cuadrilla
			// siguen en cargando (sobrevivieron la transición).
			// Esas cuentan hacia el `ancho` total, así que la
			// cuadrilla activa solo necesita cargar `ancho -
			// anclasExternas` personas en su primer LOAD.
			const inactiva: CuadrillaId = estado.cuadrillaActiva === "A" ? "B" : "A"
			const anclasExternas = (estado.estados[inactiva].anclasCargando ?? []).length

			// 2. Primer relevo del turno: LOAD si la cuadrilla
			//    está vacía, SWAP si ya estaba cargada de un relevo
			//    anterior (caso de salidas > 1 con la misma
			//    cuadrilla volviendo a entrar).
			const rLoad = aplicarRelevoIntermedio(estado, ANCHO_TRABAJADERA, true, streaks, anclasSetActiva(estado.cuadrillaActiva), anclasExternas)
			estado = rLoad.estado
			relevos.push({ ...rLoad.relevo, numero: n++ })
			tramoIdx += 1

			// 3. 1er SWAP obligatorio si hay slot siguiente. Si
			//    falla por `CuadrillaDobladaSinDisponibleError`, el
			//    error se PROPAGA (regla 4 estricta) — el catch-all
			//    en `dispatcher.ts` lo surfacea al usuario como
			//    mensaje claro. NO cede silenciosamente.
			if (tramoIdx < tramosTipo.length) {
				const rSwap = aplicarRelevoIntermedio(estado, ANCHO_TRABAJADERA, true, streaks, anclasSetActiva(estado.cuadrillaActiva))
				estado = rSwap.estado
				relevos.push({ ...rSwap.relevo, numero: n++ })
				tramoIdx += 1
			}

			// 4. Cede el turno. La siguiente iteración usará la
			//    otra cuadrilla. SIN elástico: cada cuadrilla hace
			//    EXACTAMENTE 2 relevos (LOAD + 1er SWAP) por turno.
			turno += 1
		}
	}

	return relevos
}

/**
 * v1.3.2: Adapter que mapea Relevo[] de simularCicloConTipos a TramoSlot[].
 *
 * Cada TramoSlot representa el estado DESPUÉS de un relevo. La regla
 * crítica acá es la Regla 1: cuando la cuadrilla activa cambia entre
 * relevos consecutivos, el nuevo `cargando` se REEMPLAZA por los que
 * entran (los de la cuadrilla anterior se fueron a su `disp` vía
 * `transicionActiva`, sin relevo explícito que los saque del array
 * acumulado). Sin este check, el filtro "sale/entra" acumularía 10
 * personas en `cargando` (5 de A + 5 de B) en lugar de 5.
 */
export function relevosATramoSlots(
	t: Trabajadera,
	relevos: Relevo[],
): TramoSlot[] {
	const slots: TramoSlot[] = []
	let cargando: string[] = []
	let lastCuadrilla: CuadrillaId | null = null

	for (const relevo of relevos) {
		if (lastCuadrilla !== null && lastCuadrilla !== relevo.cuadrilla) {
			// Cuadrilla activa cambió: descartamos cargando previo y
			// arrancamos con los que entran + los que se mantienen
			// (anclas propias pre-cargadas + externas).
			cargando = [...relevo.entra, ...(relevo.mantiene ?? [])]
		} else {
			const saleSet = new Set(relevo.sale)
			cargando = cargando.filter((name) => !saleSet.has(name))
			for (const name of relevo.entra) {
				if (!cargando.includes(name)) {
					cargando.push(name)
				}
			}
			// v1.5.0: si el relevo actual tiene `mantiene` (anclas
			// externas que se mantienen), asegurarse de que estén en
			// `cargando`. Esto pasa durante un LOAD de la
			// cuadrilla activa mientras la otra cuadrilla tiene
			// anclas propias que se mantienen.
			for (const name of relevo.mantiene ?? []) {
				if (!cargando.includes(name)) {
					cargando.push(name)
				}
			}
		}
		lastCuadrilla = relevo.cuadrilla

		const dentroSet = new Set(cargando)

		const dentroIndices = [...dentroSet].map((name) => {
			const idx = t.nombres.indexOf(name)
			if (idx === -1) {
				throw new Error(`No se pudo mapear nombre a índice: ${name}`)
			}
			return idx
		})

		const allIndices = Array.from({ length: t.nombres.length }, (_, i) => i)
		const fueraIndices = allIndices
			.filter((i) => !dentroIndices.includes(i))
			.sort((a, b) => a - b)

		slots.push({
			dentro: [...dentroIndices].sort((a, b) => a - b),
			fuera: fueraIndices,
		})
	}

	return slots
}
