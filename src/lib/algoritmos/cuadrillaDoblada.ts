// ══════════════════════════════════════════════════════════════════
// CUADRILLA DOBLADA — lógica para trabajaderas con 10+ costaleros
// ══════════════════════════════════════════════════════════════════

import type { Trabajadera, TramoSlot } from "../types";

export const ANCHO_TRABAJADERA = 5
export const UMBRAL_DOBLADO = 2 * ANCHO_TRABAJADERA

export type CuadrillaId = "A" | "B"
export type TipoRelevo = "principal" | "intermedio"

export interface Cuadrilla {
	id: CuadrillaId
	miembros: string[]
}

export interface Distribucion {
	a: string[]
	b: string[]
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
				disponibles: [...eActiva.disponibles, ...sale],
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
	void ancho
	const activa = estado.cuadrillaActiva
	const eActiva = estado.estados[activa]
	if (eActiva.disponibles.length === 0) {
		throw new Error(`No hay disponibles en cuadrilla ${activa} para relevo intermedio`)
	}
	const [sale, ...restoCargando] = eActiva.cargando
	const [entra, ...restoDisponibles] = eActiva.disponibles
	const nuevoEstado: EstadoPlan = {
		cuadrillaActiva: activa,
		estados: {
			...estado.estados,
			[activa]: {
				cargando: [...restoCargando, entra],
				disponibles: [...restoDisponibles, sale!],
			},
		},
	}
	const relevo: Relevo = {
		tipo: "intermedio",
		numero: 0,
		cuadrilla: activa,
		sale: [sale!],
		entra: [entra!],
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
	if (t.nombres.length < 10) return [];

	// If no distribution provided, try to build one from t.distribucionCuadrillas (indices)
	let dist = distribucion;
	if (!dist && t.distribucionCuadrillas) {
		dist = {
			a: t.distribucionCuadrillas.a.map((i) => t.nombres[i]),
			b: t.distribucionCuadrillas.b.map((i) => t.nombres[i]),
		};
	}

	const relevos = simularCicloCompleto(t.nombres, dist);
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
