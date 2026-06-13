// ══════════════════════════════════════════════════════════════════
// ConfirmarAsignacionBanner — inline feedback after bulk apply
// ══════════════════════════════════════════════════════════════════

import type { ResultadoBulkApply } from "@/lib/algoritmos";

interface Props {
	result: ResultadoBulkApply;
	onDismiss: () => void;
}

export default function ConfirmarAsignacionBanner({
	result,
	onDismiss,
}: Props) {
	const parts: string[] = [];
	parts.push(`✓ ${result.aplicadas} aplicadas`);
	if (result.saltadas > 0) {
		parts.push(`${result.saltadas} saltada${result.saltadas > 1 ? "s" : ""}`);
	}
	if (result.cap_alcanzado) {
		parts.push("⚠ cap alcanzado");
	}

	return (
		<div
			className="mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm"
			style={{
				backgroundColor: "var(--oro)",
				color: "#000",
			}}
			role="status"
			aria-live="polite"
		>
			<span>{parts.join(" · ")}</span>
			<button
				onClick={onDismiss}
				className="ml-2 text-lg leading-none opacity-60 hover:opacity-100"
				aria-label="Dismiss"
				title="Cerrar"
			>
				×
			</button>
		</div>
	);
}
