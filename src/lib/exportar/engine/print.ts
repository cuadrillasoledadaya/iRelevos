// ══════════════════════════════════════════════════════════════════
// PRINT ENGINE — Utilidades de impresión (side-effect: window.open)
// ══════════════════════════════════════════════════════════════════

import { esc } from '@/lib/nombres'

/**
 * Construye un documento HTML completo listo para imprimir.
 * Incluye <html>, <head> con estilos de impresión y botones de acción.
 *
 * @param bodyHtml Contenido HTML a insertar dentro del <body>
 * @param title    Título del documento (<title> y posible uso en templates)
 * @returns        String HTML completo con DOCTYPE, head, styles, y body
 */
export function buildPrintDoc(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;}
.btn-grupo{text-align:center;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
button{padding:10px 16px;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px}
.btn-print{background:#d4a574}.btn-close{background:#888}
tr, td, th { page-break-inside: avoid; break-inside: avoid; }
@media print{.btn-grupo{display:none}}</style></head>
<body><div class="btn-grupo"><button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button><button class="btn-close" onclick="window.close()">✕ Cerrar</button></div>
${bodyHtml}</body></html>`
}

/**
 * Abre una ventana de impresión con el contenido HTML dado.
 * Efecto secundario: llama a window.open y escribe en el documento de la ventana.
 *
 * @param html    Contenido HTML del body (sin wrapper de documento)
 * @param titulo  Título del documento
 * @param nombre  Nombre de la ventana (para window.open)
 */
export function abrirVentanaImpresion(html: string, titulo: string, nombre: string): void {
  const ventana = window.open('', nombre, 'width=900,height=1000')
  if (!ventana) {
    alert('⚠ Permite ventanas emergentes.')
    return
  }
  ventana.document.write(buildPrintDoc(html, titulo))
  ventana.document.close()
}
