// UI-Helfer: Escaping, Formatierung, Icons und SVG-Diagramme (ohne externe Bibliotheken).
import { parse, add, diff } from './core.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (s, o) => parse(s).toLocaleDateString('de-DE', o || { day: 'numeric', month: 'short' });
export const fmtLong = s => parse(s).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtMonth = s => parse(s.length === 7 ? s + '-01' : s).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
export const fmtShortMonth = s => parse(s.length === 7 ? s + '-01' : s).toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');
export const tage = n => n + (Math.abs(n) === 1 ? ' Tag' : ' Tage');
export const dec = (v, d = 1) => v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(d).replace('.', ',');

const P = {
  drop: '<path d="M12 3.2s6.2 6.6 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 9.8 12 3.2 12 3.2z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chart: '<path d="M5 20V12M10 20V5M15 20v-9M20 20v-5"/>',
  book: '<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16z"/><path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19M9 8h6"/>',
  more: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.2 8.2l5.6 7.6"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  down: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  up: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  share: '<path d="M12 15V4M8 7.5l4-4 4 4"/><path d="M7 10.5H5.5v10h13v-10H17"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  note: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12.5h6M9 16h6"/>',
  edit: '<path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5z"/><path d="M13.5 7.5l3 3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  doc: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 16v-3M12 16v-5M15 16v-2"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  cycle: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4.5v4h-4"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.5"/><path d="M15.5 14.4a4.5 4.5 0 0 1 5 5.1"/>',
  shield: '<path d="M12 3.5l7 3v5.5c0 4.4-3 7.7-7 8.5-4-.8-7-4.1-7-8.5V6.5z"/><path d="M9 12l2 2 4-4"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.2-2.2H17a3.5 3.5 0 0 0 3.5-3.5c0-5.3-3.8-9.5-8.5-9.5z"/><circle cx="8" cy="11" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  thermo: '<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
};
export const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
export const logo = () => `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="hw-f" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#ff86b6"/><stop offset="1" stop-color="#d2408c"/></linearGradient><linearGradient id="hw-w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9a4f0"/><stop offset="1" stop-color="#8fc7f2"/></linearGradient></defs><path d="M15 45C19 29 29 14 46 8c-5 11-5 25 4 37z" fill="url(#hw-f)"/><path d="M20 38c3-10 9-19 18-25" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".45"/><path d="M4 46c5-5 9-5 14 0s9 5 14 0 9-5 14 0 9 5 14 0v14H4z" fill="url(#hw-w)"/><path d="M8 53c4-3 7-3 11 0s7 3 11 0 7-3 11 0 7 3 11 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".6"/></svg>`;

/* ---------- Zyklusring ---------- */
export function ring(m) {
  const C = 130, R = 108, W = 18;
  if (!m.cur) {
    return `<svg viewBox="0 0 260 260" role="img" aria-label="Noch keine Zyklusdaten"><circle cx="${C}" cy="${C}" r="${R}" stroke="var(--surface-2)" stroke-width="${W}" fill="none"/></svg>`;
  }
  const N = Math.max(m.avgCycle, m.cycleDay);
  const pDays = diff(m.cur.start, m.cur.end) + 1;
  const ovDay = diff(m.cur.start, m.cur.ov) + 1;
  const gap = N > 45 ? 0.35 : 0.9;
  const pt = a => { const r = (a - 90) * Math.PI / 180; return [C + R * Math.cos(r), C + R * Math.sin(r)]; };
  let out = '';
  for (let i = 1; i <= N; i++) {
    const a0 = (i - 1) / N * 360 + gap, a1 = i / N * 360 - gap;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    let col = 'var(--surface-2)';
    if (i <= pDays) col = 'var(--mens)';
    else if (i === ovDay) col = 'var(--fert)';
    else if (i >= ovDay - 5 && i <= ovDay + 1) col = 'color-mix(in srgb, var(--fert) 45%, var(--surface))';
    else if (i < ovDay) col = 'var(--foll-soft)';
    else if (i > m.avgCycle) col = 'color-mix(in srgb, var(--mens) 25%, var(--surface))';
    else col = 'var(--lut-soft)';
    const past = i < m.cycleDay;
    out += `<path class="ring-seg" d="M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" stroke="${col}" stroke-width="${W}" fill="none" ${past ? '' : 'opacity=".92"'}/>`;
  }
  const day = Math.min(m.cycleDay, N);
  const [x, y] = pt((day - 0.5) / N * 360);
  out += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="14" fill="var(--surface)" stroke="var(--accent)" stroke-width="3.5"/><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" fill="var(--accent)"/>`;
  return `<svg viewBox="0 0 260 260" role="img" aria-label="Zyklustag ${m.cycleDay} von etwa ${m.avgCycle}"><g class="ring-anim" style="transform-origin:130px 130px">${out}</g></svg>`;
}

/* ---------- Balkendiagramm ---------- */
export function bars(items, { avg = null, band = null, id = 'c', unit = '', height = 170 } = {}) {
  if (!items.length) return '';
  const W = 330, H = height, top = 22, bottom = 24;
  const vals = items.map(d => d.value);
  const maxV = Math.max(...vals, avg || 0, band ? band[1] : 0) * 1.08;
  const minV = 0;
  const n = items.length, step = (W - 8) / n, bw = Math.max(6, Math.min(30, step - 8));
  const y = v => top + (H - top - bottom) * (1 - (v - minV) / (maxV - minV));
  let s = '';
  if (band) s += `<rect x="0" y="${y(band[1])}" width="${W}" height="${y(band[0]) - y(band[1])}" fill="var(--foll-soft)" opacity=".55" rx="6"/>`;
  items.forEach((d, i) => {
    const x = 4 + i * step + (step - bw) / 2, yy = y(d.value);
    s += `<rect x="${x}" y="${yy}" width="${bw}" height="${Math.max(2, H - bottom - yy)}" rx="${Math.min(7, bw / 2)}" fill="${d.color || 'var(--accent)'}"/>`;
    if (n <= 14) s += `<text x="${x + bw / 2}" y="${yy - 6}" text-anchor="middle" font-size="11" font-weight="650" fill="var(--text)">${d.value}</text>`;
    if (n <= 14 || i % Math.ceil(n / 12) === 0) s += `<text x="${x + bw / 2}" y="${H - 7}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(d.label)}</text>`;
    s += `<rect class="hit" x="${4 + i * step}" y="0" width="${step}" height="${H}" fill="transparent" data-a="tip" data-t="${id}" data-tip="${esc(d.tip || d.value + unit)}"/>`;
  });
  if (avg != null) { const ay = y(avg); s += `<line x1="0" x2="${W}" y1="${ay}" y2="${ay}" stroke="var(--text)" stroke-opacity=".4" stroke-dasharray="4 4"/>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagramm">${s}</svg><div class="tip" id="tip-${id}" aria-live="polite">Tippe auf einen Balken für Details.</div>`;
}

/* ---------- Linie nach Zyklustag mit Phasen-Hintergrund ---------- */
export function curve(points, { xMax, yMin, yMax, m, id = 'l', fmtY = v => dec(v), color = 'var(--accent)', label = '' }) {
  if (points.length < 2) return '';
  const W = 330, H = 150, L = 28, Rr = 6, T = 10, B = 22;
  const x = d => L + (W - L - Rr) * (d - 1) / Math.max(1, xMax - 1);
  const y = v => T + (H - T - B) * (1 - (v - yMin) / (yMax - yMin || 1));
  let s = '';
  if (m && m.avgCycle) {
    const ov = m.avgCycle - m.luteal + 1;
    const band = (a, b, col) => { a = Math.max(1, a); b = Math.min(xMax, b); if (b >= a) s += `<rect x="${x(a) - 3}" y="${T}" width="${x(b) - x(a) + 6}" height="${H - T - B}" fill="${col}" opacity=".6"/>`; };
    band(1, m.avgPeriod, 'var(--mens-soft)');
    band(ov - 5, ov + 1, 'var(--fert-soft)');
    band(ov + 2, m.avgCycle, 'var(--lut-soft)');
  }
  for (const v of [yMin, (yMin + yMax) / 2, yMax]) s += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${fmtY(v)}</text><line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>`;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(' ');
  s += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  for (const p of points) s += `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="3.2" fill="${color}"/><circle class="hit" cx="${x(p[0])}" cy="${y(p[1])}" r="11" fill="transparent" data-a="tip" data-t="${id}" data-tip="Zyklustag ${p[0]}: ${fmtY(p[1])}${p[2] ? ` (${p[2]} ${p[2] === 1 ? 'Eintrag' : 'Einträge'})` : ''}"/>`;
  for (const d of [1, Math.round(xMax / 2), xMax]) s += `<text x="${x(d)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--muted)">Tag ${d}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${s}</svg><div class="tip" id="tip-${id}" aria-live="polite">Tippe auf einen Punkt für Details.</div>`;
}

/* ---------- Zyklen im Vergleich ---------- */
export function cycleRows(cycles, luteal, maxLen) {
  if (!cycles.length) return '';
  const M = Math.max(maxLen, ...cycles.map(c => c.len));
  return cycles.map(c => {
    const pc = c.plen / M * 100;
    const ov = c.ovTemp ? diff(c.start, c.ovTemp) : c.len - luteal;
    const fs = Math.max(0, ov - 5) / M * 100, fw = 7 / M * 100;
    return `<div class="cmp-row"><span class="muted">${fmt(c.start, { day: 'numeric', month: 'short' })}</span>
      <div class="cmp-bar" style="--w:${c.len / M * 100}%"><i style="left:0;width:${c.len / M * 100}%;background:var(--surface-2);border-radius:8px;box-shadow:inset 0 0 0 1px var(--line)"></i>
      <i style="left:${fs}%;width:${fw}%;background:var(--fert-soft)"></i><i style="left:${ov / M * 100}%;width:${100 / M}%;background:var(--fert)"></i>
      <i style="left:0;width:${pc}%;background:var(--mens);border-radius:8px 0 0 8px"></i></div>
      <b style="text-align:right">${c.len}${c.outlier ? '*' : ''}</b></div>`;
  }).join('');
}

/* ---------- Heatmap Symptom × Phase ---------- */
export function heatmap(list, phaseDays) {
  const ph = [['mens', 'Periode'], ['foll', 'Follikel'], ['fert', 'Fruchtbar'], ['lut', 'Luteal']];
  const cols = `grid-template-columns: minmax(90px, 1.4fr) repeat(4, 1fr)`;
  let s = `<div class="heat" style="${cols}"><span></span>${ph.map(p => `<span class="center muted xs">${p[1]}</span>`).join('')}`;
  for (const it of list) {
    s += `<span class="n">${esc(it.name)}</span>`;
    for (const [p] of ph) {
      const r = it['r_' + p] || 0;
      const a = Math.round(Math.min(1, r * 1.6) * 100);
      s += phaseDays[p] ? `<span class="c" style="background:color-mix(in srgb, var(--accent) ${a}%, var(--surface-2));color:${a > 55 ? 'var(--on-accent)' : 'var(--text)'}" title="${Math.round(r * 100)} %">${Math.round(r * 100)}%</span>` : '<span class="c muted" style="background:var(--surface-2)">–</span>';
    }
  }
  return s + '</div>';
}

export function confBars(level) {
  const n = { high: 3, medium: 2, low: 1 }[level] || 1;
  return `<span class="bars">${[6, 9, 12].map((h, i) => `<i style="height:${h}px" class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
}
export const CONF_LABEL = { high: 'Hohe Sicherheit', medium: 'Mittlere Sicherheit', low: 'Geringe Sicherheit' };
export const TYPE_LABEL = { personal: 'Aus deinen Daten', estimate: 'Schätzung', education: 'Wissen', notice: 'Hinweis' };

/* ---------- Halbrunder Phasenbogen (Startseite) ---------- */
export function gauge(m) {
  const W = 300, H = 170, cx = 150, cy = 150, R = 124, SW = 20, A0 = -104, A1 = 104;
  const pt = a => { const r = a * Math.PI / 180; return [cx + R * Math.sin(r), cy - R * Math.cos(r)]; };
  const arc = (a, b, col, extra = '') => {
    const [x0, y0] = pt(a), [x1, y1] = pt(b);
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${col}" stroke-width="${SW}" stroke-linecap="round" fill="none" ${extra}/>`;
  };
  let s = `<defs><filter id="gsh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#5a3a5e" flood-opacity=".28"/></filter></defs>`;
  if (!m.cur) return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Noch keine Zyklusdaten">${s}${arc(A0, A1, 'var(--surface-2)')}</svg>`;
  const N = Math.max(m.avgCycle, m.cycleDay);
  const P = Math.min(N, diff(m.cur.start, m.cur.end) + 1);
  const ov = diff(m.cur.start, m.cur.ov) + 1;
  const ang = d => A0 + (A1 - A0) * (d - 1) / Math.max(1, N - 1);
  const parts = [[1, P, 'var(--mens)'], [P + 1, ov - 6, 'var(--foll)'], [Math.max(P + 1, ov - 5), ov + 1, 'var(--fert)'], [ov + 2, m.avgCycle, 'var(--lut)']];
  if (N > m.avgCycle) parts.push([m.avgCycle + 1, N, 'color-mix(in srgb, var(--mens) 35%, var(--surface-2))']);
  s += arc(A0, A1, 'var(--surface-2)');
  const gap = 3.2;
  for (const [a, b, col] of parts) {
    if (b < a) continue;
    const s0 = ang(a) + (a > 1 ? gap / 2 : 0), s1 = ang(b) - (b < N ? gap / 2 : 0);
    s += arc(Math.min(s0, s1 - .01), Math.max(s1, s0 + .01), col, 'class="ring-seg"');
  }
  const [mx, my] = pt(ang(Math.min(m.cycleDay, N)));
  s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="16" fill="var(--plum)" filter="url(#gsh)"/><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5.5" fill="var(--on-plum)"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Zyklustag ${m.cycleDay} von etwa ${m.avgCycle}"><g class="ring-anim" style="transform-origin:150px 150px">${s}</g></svg>`;
}

/* ---------- Weiche Linie (Catmull-Rom) ---------- */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Werte je Phase als weiche Kurve mit farbigen Punkten (null = keine Daten). */
export function phaseCurve(vals, { yMin, yMax, id = 'pc', fmtY = v => dec(v), label = '' }) {
  const ph = [['mens', 'Periode', 'var(--mens)'], ['foll', 'Follikel', 'var(--foll)'], ['fert', 'Fruchtbar', 'var(--fert)'], ['lut', 'Luteal', 'var(--lut)']];
  const W = 330, H = 170, L = 30, Rr = 14, T = 12, B = 30;
  const x = i => L + 14 + (W - L - Rr - 28) * i / 3, y = v => T + (H - T - B) * (1 - (v - yMin) / (yMax - yMin || 1));
  let s = `<defs><linearGradient id="g-${id}" x1="0" x2="1"><stop offset="0" stop-color="var(--mens)"/><stop offset=".35" stop-color="var(--foll)"/><stop offset=".7" stop-color="var(--fert)"/><stop offset="1" stop-color="var(--lut)"/></linearGradient></defs>`;
  for (let k = 0; k <= 4; k++) { const v = yMin + (yMax - yMin) * k / 4; s += `<line x1="${L}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="3 5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${fmtY(v)}</text>`; }
  const pts = ph.map((p, i) => vals[p[0]] == null ? null : [x(i), y(vals[p[0]]), p, vals[p[0]]]).filter(Boolean);
  s += `<path d="${smoothPath(pts)}" fill="none" stroke="url(#g-${id})" stroke-width="3" stroke-linecap="round"/>`;
  for (const [px, py, p, v] of pts) s += `<circle cx="${px}" cy="${py}" r="6" fill="var(--surface)" stroke="${p[2]}" stroke-width="3"/><circle class="hit" cx="${px}" cy="${py}" r="18" fill="transparent" data-a="tip" data-t="${id}" data-tip="${p[1]}: Ø ${fmtY(v)}"/>`;
  ph.forEach((p, i) => { s += `<text x="${x(i)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="var(--text)">${p[1]}</text><circle cx="${x(i)}" cy="${H - 2}" r="3" fill="${p[2]}"/>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${s}</svg><div class="tip" id="tip-${id}" aria-live="polite">Tippe auf einen Punkt für Details.</div>`;
}

/** Verlauf als Linie mit Fläche (z. B. Zykluslängen). */
export function areaLine(items, { band = null, avg = null, id = 'al', unit = '', height = 170 } = {}) {
  if (!items.length) return '';
  const W = 330, H = height, L = 28, Rr = 10, T = 14, B = 26;
  const vals = items.map(d => d.value);
  let lo = Math.min(...vals, band ? band[0] : Infinity, avg ?? Infinity), hi = Math.max(...vals, band ? band[1] : -Infinity, avg ?? -Infinity);
  lo = Math.max(0, Math.floor(lo - 2)); hi = Math.ceil(hi + 2);
  const n = items.length;
  const x = i => n === 1 ? (L + W - Rr) / 2 : L + 8 + (W - L - Rr - 16) * i / (n - 1), y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo || 1));
  let s = `<defs><linearGradient id="a-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent-hi)" stop-opacity=".45"/><stop offset="1" stop-color="var(--lut)" stop-opacity=".04"/></linearGradient></defs>`;
  if (band) s += `<rect x="${L}" y="${y(band[1])}" width="${W - L - 4}" height="${y(band[0]) - y(band[1])}" fill="var(--accent-soft)" opacity=".6" rx="8"/>`;
  for (const v of [lo, Math.round((lo + hi) / 2), hi]) s += `<text x="${L - 7}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`;
  const pts = items.map((d, i) => [x(i), y(d.value)]);
  if (n > 1) s += `<path d="${smoothPath(pts)} L${pts[n - 1][0]} ${H - B} L${pts[0][0]} ${H - B} Z" fill="url(#a-${id})"/><path d="${smoothPath(pts)}" fill="none" stroke="var(--sel)" stroke-width="2.8" stroke-linecap="round"/>`;
  if (avg != null) s += `<line x1="${L}" x2="${W - 4}" y1="${y(avg)}" y2="${y(avg)}" stroke="var(--plum)" stroke-opacity=".45" stroke-dasharray="4 4"/>`;
  const every = Math.ceil(n / 7);
  items.forEach((d, i) => {
    const [px, py] = pts[i];
    s += `<circle cx="${px}" cy="${py}" r="${n > 14 ? 3.5 : 5}" fill="${d.color || 'var(--sel)'}" stroke="var(--surface)" stroke-width="2"/>`;
    if (i % every === 0 || i === n - 1) s += `<text x="${px}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(d.label)}</text>`;
    s += `<rect class="hit" x="${px - (W / n) / 2}" y="0" width="${W / n}" height="${H}" fill="transparent" data-a="tip" data-t="${id}" data-tip="${esc(d.tip || d.value + unit)}"/>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf">${s}</svg><div class="tip" id="tip-${id}" aria-live="polite">Tippe auf einen Punkt für Details.</div>`;
}

export function donut(frac, col = 'var(--sel)') {
  const r = 34, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return `<svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${r}" stroke="var(--surface-2)" stroke-width="12" fill="none"/><circle cx="42" cy="42" r="${r}" stroke="${col}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/></svg>`;
}
