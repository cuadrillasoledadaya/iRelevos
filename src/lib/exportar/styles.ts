// ══════════════════════════════════════════════════════════════════
// STYLES — CSS compartido para exports de impresión
// ══════════════════════════════════════════════════════════════════

export const basePrintCSS = `
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
`

export const relevosTableCSS = `
  width:100%;border-collapse:collapse;margin-bottom:10px;
`

export const theadCell = (bg = '#d4a574') =>
  `border:1px solid #000;padding:8px;text-align:center;font-weight:700;background:${bg};color:white;`

export const headerCell = (bg = '#e8d5c4') =>
  `border:1px solid #000;padding:8px;font-weight:700;text-align:center;background:${bg};`

export const bodyCell = (styles = '') =>
  `border:1px solid #000;padding:8px;text-align:center;${styles}`

export const nombreTramoCell =
  `border:1px solid #000;padding:8px;font-weight:600;text-align:left;background:#f5f5f5;`

export const fueraCell =
  `border:1px solid #000;padding:8px;text-align:center;font-size:11px;color:#555;font-weight:600;`

export const pageTitleCSS = (bg = '#d4a574') =>
  `border:1px solid #000;padding:12px;text-align:center;font-weight:700;background:${bg};color:white;font-size:16px;font-family:'Cinzel',serif;letter-spacing:1px;`
