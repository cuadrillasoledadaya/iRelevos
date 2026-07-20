// ══════════════════════════════════════════════════════════════════
// DEMO — Cuadrilla Doblada
//
// Corre con:  npx tsx scripts/demo-cuadrilla-doblada.ts
//
// Muestra varios casos típicos de la lógica de cuadrilla doblada.
// ══════════════════════════════════════════════════════════════════

import {
	puedeDoblarse,
	requiereDecisionDoblado,
	sugerirDistribucion,
	agruparEnCuadrillas,
	simularCicloCompleto,
	type CuadrillaId,
} from "../src/lib/algoritmos/cuadrillaDoblada"

const SEP = "═".repeat(60)
const DASH = "─".repeat(60)

function nombres(n: number, prefijo = "c"): string[] {
	return Array.from({ length: n }, (_, i) => `${prefijo}${i + 1}`)
}

function imprimirRelevo(n: number, r: { tipo: string; cuadrilla: CuadrillaId; sale: string[]; entra: string[] }) {
	const tipoTxt = r.tipo === "principal" ? "PRINCIPAL  " : "intermedio "
	const cuadTxt = r.cuadrilla === "A" ? "A → cargando" : "B → cargando"
	const saleTxt = r.sale.length > 0 ? r.sale.join(", ") : "(ninguno)"
	const entraTxt = r.entra.length > 0 ? r.entra.join(", ") : "(ninguno)"
	console.log(
		`  Relevo ${String(n).padStart(2)} [${tipoTxt}] ${cuadTxt.padEnd(15)} | SALE: ${saleTxt.padEnd(40)} | ENTRA: ${entraTxt}`,
	)
}

function caso(
	titulo: string,
	costaleros: string[],
	distribucionManual?: { a: string[]; b: string[] },
) {
	console.log(`\n${SEP}`)
	console.log(`CASO: ${titulo}`)
	console.log(SEP)
	console.log(`Costaleros totales: ${costaleros.length}`)
	console.log(
		`¿Puede doblarse? ${puedeDoblarse(costaleros)}  |  ¿Requiere decisión? ${requiereDecisionDoblado(costaleros)}`,
	)

	const dist = distribucionManual ?? sugerirDistribucion(costaleros)
	const { a, b } = agruparEnCuadrillas(costaleros, dist)
	console.log(`\nDistribución:`)
	console.log(`  A (${a.miembros.length}): ${a.miembros.join(", ")}`)
	console.log(`  B (${b.miembros.length}): ${b.miembros.join(", ")}`)

	const intermediosEsperados = Math.max(0, a.miembros.length - 5) + Math.max(0, b.miembros.length - 5)
	console.log(
		`\nIntermedios esperados en un ciclo: ${intermediosEsperados} (${Math.max(0, a.miembros.length - 5)} de A + ${Math.max(0, b.miembros.length - 5)} de B)`,
	)

	console.log(`\nCiclo de relevos:`)
	console.log(DASH)
	const relevos = simularCicloCompleto(costaleros, distribucionManual)
	relevos.forEach((r, i) => imprimirRelevo(i + 1, r))
	console.log(DASH)
	console.log(`Total: ${relevos.length} relevos (${relevos.filter((r) => r.tipo === "principal").length} principales + ${relevos.filter((r) => r.tipo === "intermedio").length} intermedios)`)
}

// ══════════════════════════════════════════════════════════════════
// CASOS DE EJEMPLO
// ══════════════════════════════════════════════════════════════════

caso("Umbral exacto: 10 costaleros (A=5, B=5, sin intermedios)", nombres(10))

caso("11 costaleros (A=6, B=5, 1 intermedio)", nombres(11))

caso("13 costaleros (A=7, B=6, 3 intermedios)", nombres(13))

caso(
	"20 costaleros (A=10, B=10, sin intermedios — caso degenerado)",
	nombres(20),
)

caso(
	"Distribución MANUAL: 13 costaleros, capataz define A y B",
	nombres(13),
	{ a: ["juan", "pedro", "luis", "maria", "ana", "carlos", "sofia"], b: ["diego", "elena", "rafa", "luisa", "ines", "tomas"] },
)

console.log(`\n${SEP}\n`)
