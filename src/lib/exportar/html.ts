// ══════════════════════════════════════════════════════════════════
// HTML HELPERS — Utilidades compartidas para generación de HTML
// ══════════════════════════════════════════════════════════════════

export function hoyFormateado(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase())
}

export function abrirVentanaImpresion(html: string, titulo: string, nombre: string): void {
  const ventana = window.open('', nombre, 'width=900,height=1000')
  if (!ventana) { alert('⚠ Permite ventanas emergentes.'); return }
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;}
.btn-grupo{text-align:center;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
button{padding:10px 16px;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px}
.btn-print{background:#d4a574}.btn-close{background:#888}
tr, td, th { page-break-inside: avoid; break-inside: avoid; }
@media print{.btn-grupo{display:none}}</style></head>
<body><div class="btn-grupo"><button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button><button class="btn-close" onclick="window.close()">✕ Cerrar</button></div>
${html}</body></html>`)
  ventana.document.close()
}
