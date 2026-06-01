// ══════════════════════════════════════════════════════════════════
// UTILS — pequeñas utilidades compartidas
// ══════════════════════════════════════════════════════════════════

/** Detecta si un nombre de tramo es genérico ("Tramo N (TN)") */
export function isGenericTramo(n: string): boolean {
	return /^Tramo \d+ \(T\d+\)$/.test(n);
}
