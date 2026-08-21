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
      | "suma_incorrecta",
    detail?: string,
  ) {
    const mensajes: Record<typeof motivo, string> = {
      duplicado: `el índice ${indice} aparece más de una vez en la cuadrilla ${cuadrilla}`,
      fuera_de_rango: `el índice ${indice} está fuera de rango (nombres tiene ${detail ?? "N"} elementos)`,
      sub_ancho: `la cuadrilla ${cuadrilla} tiene menos de ${detail ?? "ancho"} miembros`,
      overlap: `el índice ${indice} aparece en la cuadrilla ${cuadrilla} y también en la otra`,
      suma_incorrecta: `la suma de A+B no coincide con el total de costaleros (suma=${detail ?? "?"})`,
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
export type TipoRelevo = "intra"

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
}

export interface EstadoCuadrilla {
	cargando: string[]
	disponibles: string[]
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
 * Crea el estado inicial. Empieza con A marcada como activa pero NINGUNA
 * cuadrilla está aún cargando — todas tienen `cargando = []` y la totalidad
 * de sus miembros en `disponibles`. El primer relevo principal rearma la
 * primera cuadrilla activa desde sus disponibles.
 */
export function crearEstadoInicial(distribucion: Distribucion, ancho = ANCHO_TRABAJADERA): EstadoPlan {
	void ancho
	function init(miembros: string[]): EstadoCuadrilla {
		return {
			cargando: [],
			disponibles: [...miembros],
		}
	}
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
	return {
		cuadrillaActiva: nueva,
		estados: {
			...estado.estados,
			[activa]: {
				cargando: [],
				// just-unloaded van al final del disp (esperan más).
				disponibles: [...eActiva.disponibles, ...eActiva.cargando],
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
): { estado: EstadoPlan; relevo: Relevo } {
	const activa = estado.cuadrillaActiva
	const eActiva = estado.estados[activa]

	// v1.2.90 B2: si la cuadrilla activa está vacía (cargando=[]), no
	// hay nadie a quien SALE. Si hay disponibles, "cargamos" la cuadrilla
	// desde disp (los primeros ANCHO pasan a cargando, el resto queda en
	// disp). Esto es un no-swap (sale=[], entra=los que entraron) que
	// ocurre naturalmente justo después de una `transicionActiva`.
	if (eActiva.cargando.length === 0) {
		if (eActiva.disponibles.length < ancho) {
			if (eActiva.disponibles.length === 0) {
				throw new Error(
					`Cuadrilla ${activa} está completamente vacía (sin cargando ni disponibles) para relevo intermedio`,
				)
			}
			throw new CuadrillaDobladaSinDisponibleError(-1, activa)
		}

		// Pick entra: Rule 2 override (correr la ventana para incluir al
		// primero en disp con streak >= 3) o FIFO (los primeros `ancho`).
		//
		// Lógica: buscamos el primer costalero en disp con streak >= 3.
		//   - Si está dentro de los primeros `ancho`, no hay que mover
		//     nada — el FIFO natural ya lo trae adentro.
		//   - Si está más allá, desplazamos la ventana de carga para que
		//     quede al FINAL del entra (su streak resetea a 0).
		//   - Si no hay streak-3 o no se puede correr la ventana lo
		//     suficiente (streak-3 al final + disp muy corta), fallback
		//     al FIFO natural.
		let entraIdx = 0
		if (regla2) {
			const disp = eActiva.disponibles
			let bestIdx = -1
			for (let i = 0; i < disp.length; i++) {
				if ((streaks.get(disp[i]) ?? 0) >= 3) {
					bestIdx = i
					break
				}
			}
			if (bestIdx >= 0) {
				// Posición del streak-3 en el entra: al final (índice
				// `ancho-1`). Por lo tanto, entraIdx = bestIdx - (ancho - 1).
				const candidate = bestIdx - (ancho - 1)
				if (candidate >= 0 && candidate + ancho <= disp.length) {
					entraIdx = candidate
				}
				// Si candidate < 0, ya está dentro de la ventana natural
				// (bestIdx < ancho) — no hay que mover nada.
				// Si candidate + ancho > disp.length, no entran todos —
				// fallback al FIFO natural.
			}
		}
		const nuevosCargando = eActiva.disponibles
			.slice(entraIdx, entraIdx + ancho)
		const restantes = [
			...eActiva.disponibles.slice(0, entraIdx),
			...eActiva.disponibles.slice(entraIdx + ancho),
		]
		const nuevoEstado: EstadoPlan = {
			cuadrillaActiva: activa,
			estados: {
				...estado.estados,
				[activa]: {
					cargando: nuevosCargando,
					disponibles: restantes,
				},
			},
		}

		// Streak updates: los que entran vuelven a inside (streak = 0);
		// los que quedan en disp acumulan (streak += 1).
		for (const p of nuevosCargando) streaks.set(p, 0)
		for (const p of restantes) {
			streaks.set(p, (streaks.get(p) ?? 0) + 1)
		}

		const relevo: Relevo = {
			tipo: "intra",
			numero: 0,
			cuadrilla: activa,
			sale: [],
			entra: nuevosCargando,
		}
		return { estado: nuevoEstado, relevo }
	}

	// Camino normal: sale uno de cargando (FIFO), entra uno de disp (FIFO
	// — o Rule 2 override).
	if (eActiva.disponibles.length === 0) {
		// v1.2.90 B3: error estructurado con índice de tramo y cuadrilla,
		// capturado por calcularCiclo y surfaceado al usuario.
		// (tramoIdx = -1 indica que se llamó directo sin contexto de simulación)
		throw new CuadrillaDobladaSinDisponibleError(-1, activa)
	}
	const sale = eActiva.cargando[0]
	const restoCargando = eActiva.cargando.slice(1)

	let entraIdx = 0
	if (regla2) {
		for (let i = 0; i < eActiva.disponibles.length; i++) {
			if ((streaks.get(eActiva.disponibles[i]) ?? 0) >= 3) {
				entraIdx = i
				break
			}
		}
	}
	const entra = eActiva.disponibles[entraIdx]
	const restoDisponibles = [
		...eActiva.disponibles.slice(0, entraIdx),
		...eActiva.disponibles.slice(entraIdx + 1),
	]

	const nuevoEstado: EstadoPlan = {
		cuadrillaActiva: activa,
		estados: {
			...estado.estados,
			[activa]: {
				cargando: [...restoCargando, entra],
				disponibles: [...restoDisponibles, sale],
			},
		},
	}

	// Streak updates
	streaks.set(sale, 1) // acaba de salir al disp
	streaks.set(entra, 0) // acaba de entrar al cargando
	for (const p of restoDisponibles) {
		streaks.set(p, (streaks.get(p) ?? 0) + 1)
	}
	for (const p of restoCargando) {
		streaks.set(p, 0)
	}

	const relevo: Relevo = {
		tipo: "intra",
		numero: 0,
		cuadrilla: activa,
		sale: [sale],
		entra: [entra],
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

	// Reusamos el core de simularCicloConTipos vía una mini-réplica: el
	// legacy path no valida `distribucionCuadrillas` por índices, así
	// que sintetizar un Trabajadera entero sería overhead. Solo
	// necesitamos el estado + el orquestador.
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
	let estado = crearEstadoInicial(distCompleta)
	const relevos: Relevo[] = []
	let n = 1
	const streaks = new Map<string, number>()

	// v1.3.2 Regla 1 + Regla 2: cada tramo es un relevo intra-cuadrilla.
	// Si el tipo cambia entre tramos consecutivos, primero
	// `transicionActiva` cambia el flag (sin generar relevo) — el
	// siguiente `aplicarRelevoIntermedio` carga la nueva cuadrilla
	// desde disp (sale=[], entra=primeros 5) o rota si ya estaba
	// cargada. Esto garantiza que ningún relevo cruza A�B.
	for (let ciclo = 0; ciclo < salidas; ciclo++) {
		for (let ti = 0; ti < tramosTipo.length; ti++) {
			const tipo = tramosTipo[ti]
			const required: CuadrillaId = tipo === "primario" ? "A" : "B"
			try {
				if (estado.cuadrillaActiva !== required) {
					estado = transicionActiva(estado, required)
				}
				const r = aplicarRelevoIntermedio(estado, ANCHO_TRABAJADERA, true, streaks)
				estado = r.estado
				relevos.push({ ...r.relevo, numero: n++ })
			} catch (err) {
				// v1.2.90 B3: si el error es "no disponibles",
				// re-throw con el índice de tramo real para que
				// el dispatcher surface un mensaje útil al usuario.
				if (err instanceof CuadrillaDobladaSinDisponibleError) {
					throw new CuadrillaDobladaSinDisponibleError(
						ciclo * tramosTipo.length + ti,
						err.cuadrilla,
					)
				}
				throw err
			}
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
			// arrancamos con los que entran.
			cargando = [...relevo.entra]
		} else {
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
