// ══════════════════════════════════════════════════════════════════
// ViolationsBanner — inline feedback for post-bulk violations
// (REQ-PLANPREC-7+8)
// ══════════════════════════════════════════════════════════════════

import type { Violation } from "@/lib/algoritmos";

interface Props {
	violations: Violation[];
}

function violationLabel(v: Violation): string {
	switch (v.kind) {
		case "dentro5":
			return "Dentro ≠ 5";
		case "pin":
			return "Fijación inviable";
		case "consecutivos":
			return "Salidas consecutivas";
		case "repeticion":
			return "Repetición 1º/último";
		case "fueramax":
			return "F máxima excedida";
	}
}

function violationMessage(v: Violation): string {
	switch (v.kind) {
		case "dentro5":
			return `T${v.ti + 1}: ${v.actual} dentro (esperado 5)`;
		case "pin":
			return v.message;
		case "consecutivos":
			return `T${v.ti + 1}: ${v.count} salidas consecutivas`;
		case "repeticion":
			return `T${v.ti1 + 1}/T${v.ti2 + 1}: costalero ${v.idx + 1} repite`;
		case "fueramax":
			return `T${v.ti + 1}: ${v.pinned} fijados fuera (máx. ${v.max})`;
	}
}

export default function ViolationsBanner({ violations }: Props) {
	return (
		<div
			className="mt-2 flex flex-col gap-2"
			role="alert"
			aria-live="assertive"
			data-testid="violations-banner"
		>
			<div className="text-sm font-semibold" style={{ color: "var(--warn-tx)" }}>
				⚠ Correcciones aplicadas con observaciones:
			</div>
			{violations.map((v, i) => (
				<div
					key={i}
					className="preview-row"
					data-testid="violation-row"
				>
					<span className="preview-bar" data-testid="violation-bar" />
					<div className="flex flex-col">
						<span className="font-bold text-sm">{violationLabel(v)}</span>
						<span className="text-[0.7rem] tcre-o">{violationMessage(v)}</span>
					</div>
				</div>
			))}
		</div>
	);
}
