"use client"

// ══════════════════════════════════════════════════════════════════
// DEMO PAGE — Cuadrilla Doblada
//
// Ruta: /demo/cuadrilla-doblada
// Solo para visualizar la lógica pura. Sin auth, sin DB.
// ══════════════════════════════════════════════════════════════════

import { useState } from "react"
import {
	puedeDoblarse,
	requiereDecisionDoblado,
	sugerirDistribucion,
	agruparEnCuadrillas,
	simularCicloCompleto,
} from "@/lib/algoritmos/cuadrillaDoblada"

const CASOS_PREDEFINIDOS = [
	{ label: "10 (A=5, B=5)", n: 10 },
	{ label: "11 (A=6, B=5)", n: 11 },
	{ label: "13 (A=7, B=6)", n: 13 },
	{ label: "20 (A=10, B=10)", n: 20 },
] as const

function nombres(n: number): string[] {
	return Array.from({ length: n }, (_, i) => `c${i + 1}`)
}

interface Resultado {
	distribucion: { a: string[]; b: string[] }
	relevos: ReturnType<typeof simularCicloCompleto>
	puede: boolean
	requiere: boolean
	intermediosEsperados: number
	n: number
}

function calcular(n: number): Resultado | { error: string } {
	if (n < 5) return { error: "Mínimo 5 costaleros (el ancho de la trabajadera)." }
	const costaleros = nombres(n)
	const dist = sugerirDistribucion(costaleros)
	const { a, b } = agruparEnCuadrillas(costaleros, dist)
	const relevos = simularCicloCompleto(costaleros, dist)
	const intermediosEsperados =
		Math.max(0, a.miembros.length - 5) + Math.max(0, b.miembros.length - 5)
	return {
		n,
		distribucion: { a: a.miembros, b: b.miembros },
		relevos,
		puede: puedeDoblarse(costaleros),
		requiere: requiereDecisionDoblado(costaleros),
		intermediosEsperados,
	}
}

export default function DemoCuadrillaDobladaPage() {
	const [customN, setCustomN] = useState<number>(13)
	const [resultado, setResultado] = useState<Resultado | { error: string }>(
		calcular(13),
	)

	const ejecutar = (n: number) => {
		setCustomN(n)
		setResultado(calcular(n))
	}

	const ejecutarCustom = () => {
		setResultado(calcular(customN))
	}

	return (
		<div className="min-h-screen bg-neg text-cre font-lato p-6 md:p-10">
			<div className="max-w-5xl mx-auto">
				<header className="mb-8 border-b border-oro-o/40 pb-4">
					<h1 className="text-3xl md:text-4xl font-cinzel text-oro mb-2">
						Cuadrilla Doblada — Demo
					</h1>
					<p className="text-cre-o text-sm">
						Visualización de la lógica pura. Trabajaderas con 10+ costaleros
						pueden dividirse en cuadrilla A y B, con relevos intermedios cuando
						alguna tiene más de 5.
					</p>
				</header>

				{/* Controles */}
				<section className="mb-8 bg-neg-m border border-oro-o/30 rounded-lg p-5">
					<h2 className="text-oro text-lg font-cinzel mb-3">Probar un caso</h2>
					<div className="flex flex-wrap gap-2 mb-4">
						{CASOS_PREDEFINIDOS.map((c) => (
							<button
								key={c.n}
								onClick={() => ejecutar(c.n)}
								className="px-4 py-2 rounded bg-neg-s border border-oro-o/40 text-cre hover:bg-oro-o/20 hover:border-oro transition-colors text-sm"
							>
								{c.label}
							</button>
						))}
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<label className="text-cre-o text-sm">
							O probá con un número custom:
						</label>
						<input
							type="number"
							min={5}
							max={50}
							value={customN}
							onChange={(e) => setCustomN(Number(e.target.value))}
							className="w-20 px-3 py-2 rounded bg-neg-s border border-oro-o/40 text-cre focus:outline-none focus:border-oro"
						/>
						<button
							onClick={ejecutarCustom}
							className="px-4 py-2 rounded bg-oro text-neg font-semibold hover:bg-oro-c transition-colors text-sm"
						>
							Simular
						</button>
					</div>
				</section>

				{/* Resultado */}
				{"error" in resultado ? (
					<div className="bg-err-bg border border-err-bd text-ok-tx rounded-lg p-5">
						<strong>Error:</strong> {resultado.error}
					</div>
				) : (
					<>
						{/* Reglas */}
						<section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
							<div className="bg-neg-m border border-oro-o/30 rounded p-4">
								<div className="text-cre-o text-xs uppercase tracking-wider mb-1">
									Costaleros
								</div>
								<div className="text-2xl text-oro font-cinzel">
									{resultado.n}
								</div>
							</div>
							<div className="bg-neg-m border border-oro-o/30 rounded p-4">
								<div className="text-cre-o text-xs uppercase tracking-wider mb-1">
									¿Puede doblarse?
								</div>
								<div
									className={`text-2xl font-cinzel ${resultado.puede ? "text-ok-tx" : "text-err-tx"}`}
								>
									{resultado.puede ? "Sí" : "No"}
								</div>
							</div>
							<div className="bg-neg-m border border-oro-o/30 rounded p-4">
								<div className="text-cre-o text-xs uppercase tracking-wider mb-1">
									Intermedios esperados
								</div>
								<div className="text-2xl text-oro font-cinzel">
									{resultado.intermediosEsperados}
								</div>
							</div>
						</section>

						{resultado.requiere && (
							<div className="mb-6 bg-oro/10 border border-oro/40 rounded p-4 text-cre">
								<strong className="text-oro">⚠️ Decisión del capataz:</strong>{" "}
								con exactamente {2 * 5} costaleros, doblar da una estructura
								degenerada (A=5, B=5, sin intermedios). El capataz puede elegir
								quedarse en modo tradicional o doblar.
							</div>
						)}

						{/* Distribución */}
						<section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="bg-neg-m border border-oro-o/30 rounded p-4">
								<div className="text-oro text-sm font-cinzel mb-2">
									Cuadrilla A ({resultado.distribucion.a.length})
								</div>
								<div className="text-cre text-sm font-mono break-words">
									{resultado.distribucion.a.join(", ")}
								</div>
							</div>
							<div className="bg-neg-m border border-oro-o/30 rounded p-4">
								<div className="text-oro text-sm font-cinzel mb-2">
									Cuadrilla B ({resultado.distribucion.b.length})
								</div>
								<div className="text-cre text-sm font-mono break-words">
									{resultado.distribucion.b.join(", ")}
								</div>
							</div>
						</section>

						{/* Ciclo de relevos */}
						<section className="bg-neg-m border border-oro-o/30 rounded-lg p-5">
							<h2 className="text-oro text-lg font-cinzel mb-4">
								Ciclo de relevos ({resultado.relevos.length} totales)
							</h2>
							<div className="space-y-2">
								{resultado.relevos.map((r) => {
									const esPrincipal = r.tipo === "principal"
									return (
										<div
											key={r.numero}
											className={`flex flex-wrap items-center gap-3 px-3 py-2 rounded border ${
												esPrincipal
													? "bg-oro/10 border-oro/40"
													: "bg-neg-s border-oro-o/20"
											}`}
										>
											<div className="font-mono text-oro w-8 text-right">
												#{r.numero}
											</div>
											<div
												className={`text-xs uppercase tracking-wider w-20 ${
													esPrincipal ? "text-oro" : "text-cre-o"
												}`}
											>
												{r.tipo}
											</div>
											<div className="text-cre-o text-sm">
												<span className="text-cre">Entra</span>{" "}
												<span className="text-oro-c font-semibold">
													{r.cuadrilla}
												</span>
											</div>
											<div className="flex-1 min-w-0 font-mono text-xs text-cre">
												{r.sale.length > 0 && (
													<span>
														<span className="text-err-tx">
															−{r.sale.join(", ")}
														</span>
														{" / "}
													</span>
												)}
												<span className="text-ok-tx">
													+{r.entra.join(", ")}
												</span>
											</div>
										</div>
									)
								})}
							</div>
						</section>
					</>
				)}

				<footer className="mt-10 pt-4 border-t border-oro-o/30 text-cre-o text-xs text-center">
					Lógica en <code className="text-oro">src/lib/algoritmos/cuadrillaDoblada.ts</code>{" "}
					— 35 tests pasando
				</footer>
			</div>
		</div>
	)
}
