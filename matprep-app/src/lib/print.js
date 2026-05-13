import { effBonFinal, fmtNum, formatDate } from './calc';
import { PRODUCTS } from '../constants/defaults';

export function printBon(bon) {
  if (!bon) return;

  const lotRows = PRODUCTS
    .filter(p => (bon.lotBesarMap?.[p] ?? 0) > 0)
    .map(p => `<tr><td>${p}</td><td>${bon.lotKecilMap?.[p] ?? 0}</td><td>${bon.lotBesarMap[p]}</td></tr>`)
    .join('');

  const matRows = bon.bonLines.map(l => {
    const eff = effBonFinal(l);
    const sisaStok = eff - l.totalTepat;
    const karung = eff > 0 ? (eff / l.ukuranKarung).toFixed(1) : '—';
    return `<tr>
      <td>${l.material}</td>
      <td style="text-align:right">${fmtNum(l.totalTepat)}</td>
      <td style="text-align:right"><strong>${fmtNum(eff)}</strong></td>
      <td style="text-align:right">${fmtNum(sisaStok)}</td>
      <td style="text-align:right">${karung !== '—' ? karung + ' krgn' : '—'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Bon Material — ${formatDate(bon.tanggal)} Shift ${bon.shift}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; margin: 20mm; }
  h2 { font-size: 14pt; margin: 0 0 4px; color: #1A3C6E; }
  .sub { font-size: 10pt; color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10pt; }
  th { background: #1A3C6E; color: #fff; padding: 6px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
  tr:last-child td { border-bottom: none; }
  .section-title { font-size: 10pt; font-weight: bold; margin: 12px 0 4px; color: #1A3C6E; text-transform: uppercase; letter-spacing: 0.5px; }
  .sig { display: flex; gap: 40px; margin-top: 32px; }
  .sig-box { flex: 1; text-align: center; }
  .sig-line { border-top: 1px solid #333; margin-top: 48px; padding-top: 4px; font-size: 10pt; }
  @media print { @page { size: A4; margin: 15mm; } }
</style>
</head>
<body>
<h2>BON MATERIAL — DIVISI CASTING</h2>
<div class="sub">
  PT Toyota Motor Manufacturing Indonesia &nbsp;|&nbsp;
  ${formatDate(bon.tanggal)} &nbsp;|&nbsp; Shift ${bon.shift}${bon.waktu ? ' · ' + bon.waktu : ''} &nbsp;|&nbsp;
  Status: ${bon.status}
</div>

<div class="section-title">Rincian Lot</div>
<table>
  <thead><tr><th>Produk</th><th>Lot Kecil</th><th>Lot Besar</th></tr></thead>
  <tbody>${lotRows}</tbody>
</table>

<div class="section-title">Kebutuhan Material</div>
<table>
  <thead>
    <tr>
      <th>Material</th>
      <th style="text-align:right">Total Tepat (kg)</th>
      <th style="text-align:right">Bon Final (kg)</th>
      <th style="text-align:right">Sisa Stok (kg)</th>
      <th style="text-align:right">Karung</th>
    </tr>
  </thead>
  <tbody>${matRows}</tbody>
</table>

<div class="sig">
  <div class="sig-box"><div class="sig-line">Dibuat oleh</div></div>
  <div class="sig-box"><div class="sig-line">Diperiksa oleh</div></div>
  <div class="sig-box"><div class="sig-line">Disetujui oleh</div></div>
</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=800,height=600');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
