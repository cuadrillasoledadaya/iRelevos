// ══════════════════════════════════════════════════════════════════
// CUADRILLA DOBLADA — lógica para trabajaderas con 10+ costaleros
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, TramoSlot, TramoTipo } from "../types";

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

export type CuadrillaId = "A" | "B"
export type TipoRelevo = "principal" | "intermedio"

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
 * Sugiere una distribución equitativa. A lleva el excedente si impar.
 * Ej: 13 costaleros → a=7, b=6.
 */
export function sugerirDistribucion(costaleros: string[]): Distribucion {
	const total = costaleros.length
	const mitad = Math.floor(total / 2)
	const a = costaleros.slice(0, mitad + (total % 2))
	const b = costaleros.slice(mitad + (total % 2))
	return { a, b }
}

/**
 * Agrupa costaleros en cuadrillas. Si no se pasa distribución, usa la sugerida.
 */
export function agruparEnCuadrillas(
	costaleros: string[],
	distribucion?: Distribucion,
	ancho = ANCHO_TRABAJADERA,
): { a: Cuadrilla; b: Cuadrilla } {
	const dist = distribucion ?? sugerirDistribucion(costaleros)
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
 * Aplica un relevo principal. La cuadrilla activa SALE (sus cargando van al
 * final de disponibles) y la otra cuadrilla ENTRA (los primeros `ancho` de
 * sus disponibles pasan a cargando; el resto queda en disponibles).
 */
export function aplicarRelevoPrincipal(
	estado: EstadoPlan,
	ancho = ANCHO_TRABAJADERA,
): { estado: EstadoPlan; relevo: Relevo } {
	const activa: CuadrillaId = estado.cuadrillaActiva
	const otra: CuadrillaId = activa === "A" ? "B" : "A"
	const eActiva = estado.estados[activa]
	const eOtra = estado.estados[otra]

	const sale = [...eActiva.cargando]
	const nuevosCargando = eOtra.disponibles.slice(0, ancho)
	const restantes = eOtra.disponibles.slice(ancho)

	const nuevoEstado: EstadoPlan = {
		cuadrillaActiva: otra,
		estados: {
			...estado.estados,
			[activa]: {
				cargando: [],
				// sale (los que acaban de SALE) van al FRENTE del disp para
				// que la próxima vez que esta cuadrilla se active, su primer
				// cargando sea el siguiente de la rotación FIFO — no se
				// resetea al orden original. Sin esto, en patrones
				// alternados P/S el mismo costalero SALE en cada S de B.
				disponibles: [...sale, ...eActiva.disponibles],
			},
			[otra]: {
				cargando: nuevosCargando,
				disponibles: restantes,
			},
		},
	}

	const relevo: Relevo = {
		tipo: "principal",
		numero: 0,
		cuadrilla: otra,
		sale,
		entra: nuevosCargando,
	}
	return { estado: nuevoEstado, relevo }
}

/**
 * Aplica un relevo intermedio dentro de la cuadrilla activa.
 * SALE el más antiguo de cargando (FIFO), ENTRA el primero de disponibles.
 * El que sale va al final de disponibles.
 */
export function aplicarRelevoIntermedio(
	estado: EstadoPlan,
	ancho = ANCHO_TRABAJADERA,
): { estado: EstadoPlan; relevo: Relevo } {
	const activa = estado.cuadrillaActiva
	const eActiva = estado.estados[activa]

	// v1.2.90 B2: si la cuadrilla activa está vacía (cargando=[]), no
	// hay nadie a quien SALE. Comportamiento anterior: destructuraba
	// `sale` como undefined y lo metía en disp, corrompiendo el state.
	// Ahora: si hay disponibles, "cargamos" la cuadrilla desde disp
	// (los primeros ANCHO pasan a cargando, el resto queda en disp).
	// Esto es un no-swap (sale=[], entra=los que entraron) que prepara
	// la cuadrilla para futuros S swaps o para un P swap saliente.
	if (eActiva.cargando.length === 0) {
		if (eActiva.disponibles.length === 0) {
			// Cuadrilla completamente vacía — no hay nada que cargar.
			// Error genérico (no tenemos índice de tramo acá, lo
			// captura el dispatcher con un mensaje más útil).
			throw new Error(
				`Cuadrilla ${activa} está completamente vacía (sin cargando ni disponibles) para relevo intermedio`,
			)
		}
		const nuevosCargando = eActiva.disponibles.slice(0, ancho)
		const restantes = eActiva.disponibles.slice(ancho)
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
		const relevo: Relevo = {
			tipo: "intermedio",
			numero: 0,
			cuadrilla: activa,
			sale: [],
			entra: nuevosCargando,
		}
		return { estado: nuevoEstado, relevo }
	}

	// Camino normal: sale uno de cargando (FIFO), entra uno de disp (FIFO).
	if (eActiva.disponibles.length === 0) {
		// v1.2.90 B3: error estructurado con índice de tramo y cuadrilla,
		// capturado por calcularCiclo y surfaceado al usuario.
		// (tramoIdx = -1 indica que se llamó directo sin contexto de simulación)
		throw new CuadrillaDobladaSinDisponibleError(-1, activa)
	}
	const [sale, ...restoCargando] = eActiva.cargando
	const [entra, ...restoDisponibles] = eActiva.disponibles
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
	const relevo: Relevo = {
		tipo: "intermedio",
		numero: 0,
		cuadrilla: activa,
		sale: [sale],
		entra: [entra],
	}
	return { estado: nuevoEstado, relevo }
}

/**
 * Simula un ciclo A+B completo: 1 relevo principal A→B, los intermedios
 * que correspondan a B, 1 relevo principal B→A, y los intermedios que
 * correspondan a A.
 *
 * Nota: el estado al final del ciclo NO necesariamente coincide con el
 * estado inicial — la rotación de disponibles es FIFO y solo se cierra
 * perfectamente tras varios ciclos (depende del tamaño relativo de A y B).
 */
export function simularCicloCompleto(
	costaleros: string[],
	distribucion?: Distribucion,
	ancho = ANCHO_TRABAJADERA,
): Relevo[] {
	const dist = distribucion ?? sugerirDistribucion(costaleros)
	const cuadrillas = agruparEnCuadrillas(costaleros, dist, ancho)
	if (cuadrillas.a.miembros.length < ancho || cuadrillas.b.miembros.length < ancho) {
		throw new Error(
			`Para simular ciclo doblado, ambas cuadrillas deben tener al menos ${ancho} miembros. A=${cuadrillas.a.miembros.length}, B=${cuadrillas.b.miembros.length}`,
		)
	}
	const distCompleta: Distribucion = {
		a: cuadrillas.a.miembros,
		b: cuadrillas.b.miembros,
	}
	let estado = crearEstadoInicial(distCompleta, ancho)
	const relevos: Relevo[] = []
	let n = 1

	// Rele 1: principal A → B
	{
		const r = aplicarRelevoPrincipal(estado, ancho)
		estado = r.estado
		relevos.push({ ...r.relevo, numero: n++ })
	}

	// Intermedios de B (mientras B sea activa)
	for (let i = 0; i < distCompleta.b.length - ancho; i++) {
		const r = aplicarRelevoIntermedio(estado, ancho)
		estado = r.estado
		relevos.push({ ...r.relevo, numero: n++ })
	}

	// Rele: principal B → A
	{
		const r = aplicarRelevoPrincipal(estado, ancho)
		estado = r.estado
		relevos.push({ ...r.relevo, numero: n++ })
	}

	// Intermedios de A (mientras A sea activa)
	for (let i = 0; i < distCompleta.a.length - ancho; i++) {
		const r = aplicarRelevoIntermedio(estado, ancho)
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

	// Track cumulative cargando state across relevos
	let cargando: string[] = [];

	for (const relevo of relevos) {
		// Build new cargando: remove sale, add entra
		const saleSet = new Set(relevo.sale);

		// Remove those who sale
		cargando = cargando.filter((name) => !saleSet.has(name));
		// Add those who entra
		for (const name of relevo.entra) {
			if (!cargando.includes(name)) {
				cargando.push(name);
			}
		}

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
 * Simulates `salidas` cycles of cuadrilla doblada with per-tramo P/S
 * designation. Each cycle iterates over `tramosTipo` in order:
 *   - 'primario' → aplicarRelevoPrincipal (full swap between cuadrillas)
 *   - 'secundario' → aplicarRelevoIntermedio (FIFO rotation within active cuadrilla)
 *
 * The EstadoPlan PERSISTS between cycles, so the FIFO rotation actually
 * advances across salidas and the S swaps in salida 2 differ from salida 1.
 * Without this, the capataz would repeat the same single-cycle plan and
 * the costaleros "at pico" (most D count) would always be the same.
 *
 * Throws Error("tramosTipo length must equal tramos length") if lengths differ.
 * Throws CuadrillaDobladaSinPrimarioError if no tramo is marked primario.
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
	const dist = distribucion ?? sugerirDistribucion(nombresActivos)
	const cuadrillas = agruparEnCuadrillas(nombresActivos, dist)
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

	for (let ciclo = 0; ciclo < salidas; ciclo++) {
		for (let ti = 0; ti < tramosTipo.length; ti++) {
			const tipo = tramosTipo[ti]
			if (tipo === "primario") {
				const r = aplicarRelevoPrincipal(estado)
				estado = r.estado
				relevos.push({ ...r.relevo, numero: n++ })
			} else {
				// secundario → intermedio
				try {
					const r = aplicarRelevoIntermedio(estado)
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
	}

	return relevos
}

/**
 * Adapter: maps Relevo[] output from simularCicloConTipos to TramoSlot[] shape.
 * Each TramoSlot represents the state AFTER a relevo.
 */
export function relevosATramoSlots(
	t: Trabajadera,
	relevos: Relevo[],
): TramoSlot[] {
	const slots: TramoSlot[] = []
	let cargando: string[] = []

	for (const relevo of relevos) {
		const saleSet = new Set(relevo.sale)
		cargando = cargando.filter((name) => !saleSet.has(name))
		for (const name of relevo.entra) {
			if (!cargando.includes(name)) {
				cargando.push(name)
			}
		}

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
