// Rechenkern: reine Funktionen ohne DOM. Einzige Quelle für alle Zyklus-Berechnungen.
// Alle Datumswerte sind lokale Kalendertage im Format YYYY-MM-DD (keine Zeitzonen-Verschiebung).

export const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const add = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const diff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
export const todayISO = (now = new Date()) => iso(now);
export const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(parse(s)) === s;
export const monthKey = s => s.slice(0, 7);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
export function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

export const isFlow = f => f === 'light' || f === 'medium' || f === 'heavy';
export const FLOW_SCORE = { spotting: 0.5, light: 1, medium: 2, heavy: 3 };
export const PHASES = ['mens', 'foll', 'fert', 'lut'];

export const CATEGORY_IDS = ['pain', 'body', 'digestion', 'skin', 'mood', 'energy', 'sleep', 'activity', 'mucus', 'temp', 'weight', 'sex', 'meds', 'notes'];
export const DEFAULT_SETTINGS = {
  name: '', cycleLen: 28, periodLen: 5, luteal: 14,
  pill: false, pillTime: '20:00', lastBackup: null, chance: true,
  categories: Object.fromEntries(CATEGORY_IDS.map(c => [c, true])),
  customSymptoms: [], meds: [],
  reminders: { periodBefore: 2, logTime: '21:00', custom: [] },
};

/* ---------- Daten & Migration ---------- */
const PAIN_LEGACY = ['Keine', 'Leicht', 'Mittel', 'Stark'];

export function cleanEntry(e) {
  const out = {};
  for (const [k, v] of Object.entries(e || {})) {
    if (v == null || v === '' || v === false) continue;
    if (Array.isArray(v) && !v.length) continue;
    if (typeof v === 'number' && !Number.isFinite(v)) continue;
    out[k] = v;
  }
  return out;
}

/** Bringt Daten jeder Version (v1 oder v2) in das aktuelle Format. Verliert keine Einträge. */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw.settings || {};
  const days = {};
  for (const [k, v] of Object.entries(raw.days || {})) {
    if (!isDate(k) || !v || typeof v !== 'object') continue;
    const e = { ...v };
    if (typeof e.pain === 'string') { const i = PAIN_LEGACY.indexOf(e.pain); if (i >= 0) e.pain = i; else delete e.pain; }
    for (const f of ['temp', 'sleep', 'weight']) if (e[f] != null && typeof e[f] !== 'number') { const n = parseFloat(String(e[f]).replace(',', '.')); if (Number.isFinite(n)) e[f] = n; else delete e[f]; }
    const c = cleanEntry(e);
    if (Object.keys(c).length) days[k] = c;
  }
  const settings = {
    ...DEFAULT_SETTINGS, ...s,
    categories: { ...DEFAULT_SETTINGS.categories, ...(s.categories || {}) },
    reminders: { ...DEFAULT_SETTINGS.reminders, ...(s.reminders || {}) },
    customSymptoms: Array.isArray(s.customSymptoms) ? s.customSymptoms : [],
    meds: Array.isArray(s.meds) ? s.meds : [],
  };
  if (!Array.isArray(settings.reminders.custom)) settings.reminders.custom = [];
  if (s.pin) settings.legacyPin = s.pin; // alter v1-Code-Hash: wird beim Entsperren in Verschlüsselung überführt
  delete settings.pin;
  for (const k of ['cycleLen', 'periodLen', 'luteal']) if (!Number.isFinite(settings[k])) settings[k] = DEFAULT_SETTINGS[k];
  return { v: 2, settings, days };
}

export function hasData(e) { return !!e && Object.keys(e).length > 0; }
export function hasLog(e) { return !!e && Object.keys(e).some(k => k !== 'flow'); }

/* ---------- Perioden & Zyklen ---------- */
/** Zusammenhängende Blutungstage (eine Lücke von einem Tag wird überbrückt). Schmierblutung zählt nicht. */
export function periods(days) {
  const ds = Object.keys(days).filter(k => isFlow(days[k].flow)).sort();
  const res = [];
  for (const d of ds) {
    const l = res[res.length - 1];
    if (l && diff(l.end, d) <= 2) l.end = d; else res.push({ start: d, end: d });
  }
  return res;
}

/** Gewichteter Mittelwert/Streuung – neuere Zyklen zählen stärker. */
export function wstats(vals, decay = 0.85) {
  const n = vals.length;
  if (!n) return { n: 0 };
  let sw = 0, sx = 0;
  vals.forEach((v, i) => { const w = Math.pow(decay, n - 1 - i); sw += w; sx += w * v; });
  const m = sx / sw;
  let sv = 0;
  vals.forEach((v, i) => { const w = Math.pow(decay, n - 1 - i); sv += w * (v - m) ** 2; });
  const sd = n > 1 ? Math.sqrt(sv / sw * n / (n - 1)) : 0;
  return { n, mean: m, sd, min: Math.min(...vals), max: Math.max(...vals) };
}

/** Vorhersage der nächsten Zykluslänge aus bisherigen Längen. Bei wenig Daten wird der Startwert einbezogen. */
export function predictCycle(lens, prior) {
  const recent = lens.slice(-12);
  const st = wstats(recent);
  if (st.n === 0) return { mean: prior, sd: 3, n: 0, method: 'default' };
  if (st.n === 1) return { mean: (recent[0] + prior) / 2, sd: 3, n: 1, method: 'blend' };
  const sd = st.n < 3 ? Math.max(st.sd, 2.5) : Math.max(st.sd, 1);
  return { mean: st.mean, sd, n: st.n, min: st.min, max: st.max, method: 'weighted' };
}

/** Temperatur-Messpunkte eines Zeitraums als [Zyklustag, °C]. */
export function tempPoints(days, start, end) {
  const pts = [];
  for (const [d, e] of Object.entries(days)) {
    if (d >= start && d <= end && typeof e.temp === 'number' && e.temp > 34 && e.temp < 39) pts.push([diff(start, d) + 1, e.temp]);
  }
  return pts.sort((a, b) => a[0] - b[0]);
}

/**
 * Temperaturanstieg nach der „3 über 6“-Regel: drei Messungen über allen sechs vorherigen,
 * die dritte mindestens 0,2 °C darüber. Gibt den Zyklustag der ersten höheren Messung zurück.
 */
export function detectShift(points) {
  for (let i = 6; i + 2 < points.length; i++) {
    const prev = points.slice(i - 6, i);
    if (points[i][0] - prev[0][0] > 12) continue; // zu große Lücken
    const base = Math.max(...prev.map(p => p[1]));
    const hi = points.slice(i, i + 3);
    if (hi[2][0] - hi[0][0] > 4) continue;
    if (hi.every(p => p[1] > base) && hi[2][1] >= base + 0.2) return { day: hi[0][0], base };
  }
  return null;
}

export function buildModel(db, t = todayISO()) {
  const S = db.settings, days = db.days;
  const ps = periods(days);
  const cycles = [];
  for (let i = 0; i < ps.length - 1; i++) {
    const len = diff(ps[i].start, ps[i + 1].start);
    const c = { idx: i, start: ps[i].start, periodEnd: ps[i].end, next: ps[i + 1].start, len, plen: diff(ps[i].start, ps[i].end) + 1, valid: len >= 15 && len <= 90 };
    const sh = detectShift(tempPoints(days, c.start, add(c.next, -1)));
    if (sh) { c.shiftDay = add(c.start, sh.day - 1); c.ovTemp = add(c.shiftDay, -1); c.lutealObserved = diff(c.ovTemp, c.next); }
    cycles.push(c);
  }
  const vl = cycles.filter(c => c.valid).map(c => c.len);
  const med = median(vl);
  for (const c of cycles) {
    c.outlier = c.valid && vl.length >= 4 && Math.abs(c.len - med) > Math.max(10, med * 0.4);
    c.used = c.valid && !c.outlier;
  }
  const usedCycles = cycles.filter(c => c.used);
  const lens = usedCycles.map(c => c.len);
  const pred = predictCycle(lens, S.cycleLen);

  const lobs = cycles.map(c => c.lutealObserved).filter(x => x >= 9 && x <= 18);
  const luteal = lobs.length >= 2 ? Math.round(mean(lobs.slice(-6))) : S.luteal;
  const lutealSource = lobs.length >= 2 ? 'temp' : 'default';

  const done = ps.filter((p, i) => i < ps.length - 1 || diff(p.end, t) >= 2);
  const plens = done.map(p => diff(p.start, p.end) + 1).filter(x => x <= 15);
  const pst = wstats(plens.slice(-12));
  const avgPeriod = pst.n ? Math.max(1, Math.round(pst.mean)) : S.periodLen;
  const avgCycle = Math.round(pred.mean);
  const recentLens = lens.slice(-6);
  const range = recentLens.length ? Math.max(...recentLens) - Math.min(...recentLens) : null;

  // Wie gut wäre die Vorhersage in der Vergangenheit gewesen? (rückblickend berechnet)
  const accuracy = [];
  for (let j = 2; j < usedCycles.length; j++) {
    const p = predictCycle(usedCycles.slice(0, j).map(c => c.len), S.cycleLen);
    const predicted = Math.round(p.mean);
    accuracy.push({ start: usedCycles[j].start, predicted, actual: usedCycles[j].len, error: usedCycles[j].len - predicted });
  }
  const mae = accuracy.length ? mean(accuracy.slice(-6).map(a => Math.abs(a.error))) : null;

  const m = {
    t, ps, cycles, lens, pred, avgCycle, avgPeriod, periodStats: pst, luteal, lutealSource,
    sd: pred.sd, range, nUsed: lens.length, accuracy, mae,
    regularity: lens.length >= 3 ? (range <= 7 ? 'regular' : 'irregular') : 'unknown',
    confidence: lens.length >= 6 && pred.sd <= 2 ? 'high' : lens.length >= 3 && pred.sd <= 4 ? 'medium' : 'low',
    segs: [], late: 0, cur: null, cycleDay: null,
  };
  const last = ps[ps.length - 1];
  if (!last) return m;

  for (const c of cycles) m.segs.push({ start: c.start, end: c.periodEnd, next: c.next, ov: c.ovTemp || add(c.next, -luteal), ovSource: c.ovTemp ? 'temp' : 'calc' });

  const nominal = add(last.start, avgCycle);
  const late = Math.max(0, diff(nominal, t));
  const next = late > 0 ? add(t, 1) : nominal;
  const u = clamp(Math.round(pred.sd), 1, 10);
  let end = last.end;
  const tf = days[t] && days[t].flow;
  const ended = Object.entries(days).some(([d, e]) => d > last.start && d <= t && e.flow === 'none');
  if (diff(last.end, t) <= 1 && !ended && tf !== 'none') { const exp = add(last.start, avgPeriod - 1); if (exp > end) end = exp; }
  const curShift = detectShift(tempPoints(days, last.start, t));
  const ov = curShift ? add(last.start, curShift.day - 2) : add(nominal, -luteal);
  m.cur = { start: last.start, end, loggedEnd: last.end, next, ov, ovSource: curShift ? 'temp' : 'calc', current: true };
  m.segs.push(m.cur);
  m.late = late; m.nominal = nominal; m.next = next; m.uncertainty = u;
  m.nextRange = [add(nominal, -u), add(nominal, u)];
  m.lateBeyondRange = diff(m.nextRange[1], t) > 0;
  m.inPeriod = t >= last.start && t <= end && tf !== 'none' && !(ended && t > last.end);
  m.periodDay = m.inPeriod ? diff(last.start, t) + 1 : null;
  m.cycleDay = diff(last.start, t) + 1;
  m.future = [];
  let st = next;
  for (let k = 0; k < 14; k++) {
    const nx = add(st, avgCycle);
    const unc = clamp(Math.round(pred.sd * Math.sqrt(k + 1)), 1, 14);
    const seg = { start: st, end: add(st, avgPeriod - 1), next: nx, ov: add(nx, -luteal), ovSource: 'calc', predicted: true, unc };
    m.segs.push(seg); m.future.push(seg);
    st = nx;
  }
  return m;
}

export function segOf(m, d) { let r = null; for (const s of m.segs) { if (s.start <= d) r = s; else break; } return r; }
export function cycleDayOf(m, d) { const s = segOf(m, d); return s ? diff(s.start, d) + 1 : null; }

/** Alles, was für einen einzelnen Tag angezeigt wird – Kalender, Heute, Analyse nutzen dieselbe Funktion. */
export function dayInfo(m, days, d) {
  const e = days[d], s = segOf(m, d);
  const r = { logged: false, spot: false, pred: false, fert: false, ov: false, phase: null, seg: s, cycleDay: s ? diff(s.start, d) + 1 : null, has: hasLog(e), entry: e };
  if (e && isFlow(e.flow)) r.logged = true;
  if (e && e.flow === 'spotting') r.spot = true;
  if (!s) return r;
  const inP = d <= s.end && !(s.current && d > s.loggedEnd && d < m.t && !r.logged);
  if (!r.logged && d <= s.end && (s.predicted || (s.current && d > m.t))) r.pred = true;
  if (!(d <= s.end && (r.logged || r.pred || inP))) {
    if (d === s.ov) r.ov = true;
    else if (d >= add(s.ov, -5) && d <= add(s.ov, 1)) r.fert = true;
  }
  r.predictedDay = d > m.t;
  r.phase = (r.logged || r.pred || inP) ? 'mens' : (r.ov || r.fert) ? 'fert' : d < s.ov ? 'foll' : 'lut';
  if (r.ov) r.phaseDetail = 'ov';
  return r;
}

/* ---------- Schwangerschaftschance (Schätzung) ---------- */
// Tagesbezogene Wahrscheinlichkeiten relativ zum Eisprung (Tag 0) nach
// Wilcox, Weinberg & Baird, NEJM 1995;333:1517–21 – ungeschützter Sex an genau diesem Tag.
export const WILCOX = { '-5': 0.10, '-4': 0.16, '-3': 0.14, '-2': 0.27, '-1': 0.31, '0': 0.33 };
const LUTEAL_SD = 1.5; // natürliche Schwankung der Lutealphase in Tagen

/** Unsicherheit (Standardabweichung in Tagen) des geschätzten Eisprungs eines Zyklusabschnitts. */
export function ovulationSd(m, s) {
  if (s.ovSource === 'temp') return 0.7;
  if (s.predicted) { const k = m.future.indexOf(s) + 1; return Math.min(8, Math.sqrt(LUTEAL_SD ** 2 + (m.sd * Math.sqrt(Math.max(1, k))) ** 2)); }
  if (s.current) return Math.min(8, Math.sqrt(LUTEAL_SD ** 2 + m.sd ** 2));
  return LUTEAL_SD; // abgeschlossener Zyklus: nächste Periode bekannt
}

/**
 * Geschätzte Chance, an Tag d schwanger zu werden (bei ungeschütztem Sex).
 * Mittelt die Wilcox-Werte über die Unsicherheit des Eisprung-Termins.
 * level: 'low' | 'medium' | 'high'. Keine Verhütungsmethode!
 */
export function chanceOf(m, days, d) {
  const s = segOf(m, d);
  if (!s) return null;
  const e = days[d];
  const rel = diff(s.ov, d);
  const reason = rel < -5 ? 'Vor dem fruchtbaren Fenster' : rel < 0 ? `${-rel === 1 ? '1 Tag' : -rel + ' Tage'} vor dem geschätzten Eisprung` : rel === 0 ? 'Tag des geschätzten Eisprungs' : 'Nach dem geschätzten Eisprung';
  if (e && isFlow(e.flow)) return { level: 'low', p: 0, reason: 'Periode' };
  const sd = ovulationSd(m, s), R = Math.ceil(3 * sd);
  let p = 0, norm = 0;
  for (let o = -R; o <= R; o++) {
    const w = Math.exp(-(o * o) / (2 * sd * sd));
    norm += w;
    p += w * (WILCOX[diff(add(s.ov, o), d)] || 0);
  }
  p /= norm;
  if (s.ovSource === 'temp' && rel > 1) p = Math.min(p, 0.01); // Anstieg gemessen: Eisprung vorbei
  return { level: p >= 0.15 ? 'high' : p >= 0.04 ? 'medium' : 'low', p, reason, sd, ovSource: s.ovSource };
}

/* ---------- Analyse ---------- */
const NUM_METRICS = ['energy', 'stress', 'pain', 'sleep', 'sleepQ', 'temp'];

export function analyze(db, m, from, to) {
  const days = db.days;
  const dates = Object.keys(days).filter(d => d >= from && d <= to).sort();
  const phaseDays = { mens: 0, foll: 0, fert: 0, lut: 0 };
  const sym = {}, mood = {};
  const byDay = {}, byPhase = {};
  for (const k of NUM_METRICS) { byDay[k] = {}; byPhase[k] = { mens: [], foll: [], fert: [], lut: [] }; }
  const months = {};
  let logged = 0;
  for (const d of dates) {
    const e = days[d];
    const mk = monthKey(d);
    const mo = months[mk] = months[mk] || { key: mk, periodDays: 0, spotDays: 0, entries: 0, symptomDays: 0, pain: [], energy: [], sleep: [], stress: [] };
    if (isFlow(e.flow)) mo.periodDays++;
    if (e.flow === 'spotting') mo.spotDays++;
    if (!hasLog(e)) continue;
    logged++; mo.entries++;
    if ((e.symptoms || []).length) mo.symptomDays++;
    for (const k of ['pain', 'energy', 'sleep', 'stress']) if (typeof e[k] === 'number') mo[k].push(e[k]);
    const inf = dayInfo(m, days, d);
    const ph = inf.phase;
    if (!ph) continue;
    phaseDays[ph]++;
    for (const s of e.symptoms || []) { const o = sym[s] = sym[s] || { name: s, total: 0, mens: 0, foll: 0, fert: 0, lut: 0 }; o.total++; o[ph]++; }
    for (const s of e.moods || []) { const o = mood[s] = mood[s] || { name: s, total: 0, mens: 0, foll: 0, fert: 0, lut: 0 }; o.total++; o[ph]++; }
    for (const k of NUM_METRICS) {
      if (typeof e[k] !== 'number') continue;
      const cd = inf.cycleDay;
      if (cd && cd <= 45) { const b = byDay[k][cd] = byDay[k][cd] || { sum: 0, n: 0 }; b.sum += e[k]; b.n++; }
      byPhase[k][ph].push(e[k]);
    }
  }
  const rate = o => { for (const p of PHASES) o['r_' + p] = phaseDays[p] ? o[p] / phaseDays[p] : 0; return o; };
  const symptoms = Object.values(sym).map(rate).sort((a, b) => b.total - a.total);
  const moods = Object.values(mood).map(rate).sort((a, b) => b.total - a.total);
  const phaseAvg = {};
  for (const k of NUM_METRICS) { phaseAvg[k] = {}; for (const p of PHASES) phaseAvg[k][p] = byPhase[k][p].length ? mean(byPhase[k][p]) : null; }
  const curve = {};
  for (const k of NUM_METRICS) curve[k] = Object.entries(byDay[k]).map(([cd, b]) => [Number(cd), b.sum / b.n, b.n]).sort((a, b) => a[0] - b[0]);
  const monthList = Object.values(months).sort((a, b) => a.key.localeCompare(b.key)).map(mo => ({
    key: mo.key, periodDays: mo.periodDays, spotDays: mo.spotDays, entries: mo.entries, symptomDays: mo.symptomDays,
    pain: mo.pain.length ? mean(mo.pain) : null, energy: mo.energy.length ? mean(mo.energy) : null,
    sleep: mo.sleep.length ? mean(mo.sleep) : null, stress: mo.stress.length ? mean(mo.stress) : null,
  }));
  const cycles = m.cycles.filter(c => c.start >= from && c.start <= to);
  return { from, to, logged, phaseDays, symptoms, moods, phaseAvg, curve, months: monthList, cycles, pms: pmsPattern(db, m, cycles) };
}

/** Wie oft trat ein Symptom in den 5 Tagen vor der Periode auf – im Vergleich zu den übrigen Tagen? */
export function pmsPattern(db, m, cycles) {
  const days = db.days;
  const res = {};
  let cyclesWithData = 0;
  for (const c of cycles) {
    const win = [];
    for (let i = 1; i <= 5; i++) win.push(add(c.next, -i));
    const logs = win.map(d => days[d]).filter(hasLog);
    if (!logs.length) continue;
    cyclesWithData++;
    const set = new Set(logs.flatMap(e => [...(e.symptoms || []), ...(e.moods || [])]));
    for (const s of set) res[s] = (res[s] || 0) + 1;
  }
  // Grundrate: an allen übrigen protokollierten Tagen außerhalb von Periode und Vor-Perioden-Fenster
  const pre = new Set(), base = {};
  for (const c of cycles) for (let i = 1; i <= 5; i++) pre.add(add(c.next, -i));
  let baseDays = 0;
  for (const [d, e] of Object.entries(days)) {
    if (!hasLog(e) || pre.has(d) || isFlow(e.flow)) continue;
    if (!cycles.length || d < cycles[0].start || d > add(cycles[cycles.length - 1].next, -1)) continue;
    baseDays++;
    for (const s of new Set([...(e.symptoms || []), ...(e.moods || [])])) base[s] = (base[s] || 0) + 1;
  }
  const list = Object.entries(res).map(([name, n]) => ({ name, cycles: n, of: cyclesWithData, rate: n / cyclesWithData, baseRate: baseDays ? (base[name] || 0) / baseDays : 0 }))
    .filter(x => x.cycles >= 2 && x.rate >= 0.5 && x.rate > x.baseRate * 1.5)
    .sort((a, b) => b.rate - a.rate || b.cycles - a.cycles);
  return { cyclesWithData, list };
}

/* ---------- Persönliche Erkenntnisse (lokal, regelbasiert) ---------- */
const fmtD = s => parse(s).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
const tg = n => n + (Math.abs(n) === 1 ? ' Tag' : ' Tage');
const pct = x => Math.round(x * 100) + ' %';
const PHASE_NAME = { mens: 'Periode', foll: 'Follikelphase', fert: 'fruchtbaren Phase', lut: 'Lutealphase' };

/**
 * type: 'personal' (aus deinen Einträgen), 'estimate' (statistische Schätzung),
 *       'education' (allgemeines Wissen), 'notice' (Hinweis)
 */
export function insights(db, m, t = m.t) {
  const out = [];
  const push = (o) => out.push(o);
  const from = m.ps.length ? m.ps[0].start : add(t, -365);
  const A = analyze(db, m, from, t);

  if (!m.ps.length) {
    push({ id: 'start', type: 'notice', prio: 10, title: 'Los geht\'s', text: 'Trag den Beginn deiner Periode ein. Danach berechnet die App Vorhersagen und Muster aus deinen eigenen Daten.' });
    return out;
  }

  // Vorhersage & Unsicherheit
  if (m.cur) {
    const basis = m.nUsed === 0 ? 'Bisher basiert sie auf deinem Startwert, weil noch kein vollständiger Zyklus erfasst ist.'
      : m.nUsed < 3 ? `Sie basiert erst auf ${m.nUsed === 1 ? 'einem Zyklus' : m.nUsed + ' Zyklen'} und wird mit jeder Periode genauer.`
      : `Sie basiert auf deinen letzten ${Math.min(m.nUsed, 12)} Zyklen, neuere zählen stärker.`;
    if (m.late > 0) {
      push({ id: 'late', type: 'notice', prio: 9, title: m.lateBeyondRange ? `Periode ${tg(m.late)} später als erwartet` : 'Periode noch im erwarteten Bereich',
        text: m.lateBeyondRange
          ? `Erwartet war sie um den ${fmtD(m.nominal)}. Stress, Krankheit, Reisen oder Gewichtsveränderungen können den Zyklus verschieben.${m.late >= 7 ? ' Wenn eine Schwangerschaft möglich ist, kann ein Test Klarheit geben. Bleibt die Periode länger aus, sprich mit deiner Frauenärztin.' : ''}`
          : `Erwartet war der ${fmtD(m.nominal)}, aber dein üblicher Spielraum reicht bis ${fmtD(m.nextRange[1])}.` });
    } else {
      push({ id: 'pred', type: 'estimate', prio: 6, title: `Nächste Periode: ${fmtD(m.next)}`, text: `Wahrscheinlicher Zeitraum: ${fmtD(m.nextRange[0])} – ${fmtD(m.nextRange[1])}. ${basis}` });
    }
  }

  // Vor-Perioden-Symptome
  const pms = A.pms;
  if (pms.list.length) {
    const top = pms.list.slice(0, 3);
    const soon = !m.late && m.next && diff(t, m.next) <= 6 && diff(t, m.next) >= 0;
    push({ id: 'pms', type: 'personal', prio: soon ? 8 : 5, title: soon ? 'Typisch für dich vor der Periode' : 'Dein Muster vor der Periode',
      text: top.map(x => `${x.name} (in ${x.cycles} von ${x.of} Zyklen)`).join(', ') + ' hast du in den 5 Tagen vor der Periode deutlich häufiger eingetragen als an anderen Tagen.' + (soon ? ' Deine nächste Periode ist bald – vielleicht hilft es, sich darauf einzustellen.' : '') });
  }

  // Veränderung der Zykluslänge
  if (m.lens.length >= 6) {
    const recent = mean(m.lens.slice(-3)), before = mean(m.lens.slice(-9, -3));
    const d = recent - before;
    if (Math.abs(d) >= 3) push({ id: 'trend', type: 'personal', prio: 6, title: d > 0 ? 'Deine Zyklen werden länger' : 'Deine Zyklen werden kürzer',
      text: `Die letzten 3 Zyklen waren im Schnitt ${tg(Math.round(recent))} lang, davor ${tg(Math.round(before))}. Die Vorhersagen passen sich automatisch an.` });
  }
  if (m.regularity === 'irregular') {
    push({ id: 'irr', type: 'estimate', prio: 5, title: 'Schwankende Zykluslänge', text: `Deine letzten Zyklen lagen zwischen ${tg(Math.min(...m.lens.slice(-6)))} und ${tg(Math.max(...m.lens.slice(-6)))}. Deshalb zeigt die App einen breiteren Zeitraum für die nächste Periode (± ${tg(m.uncertainty)}).` });
  }
  const outOfRange = m.lens.slice(-6).filter(l => l < 21 || l > 35).length;
  if (outOfRange >= 2) push({ id: 'range', type: 'education', prio: 4, title: 'Zykluslänge außerhalb des typischen Bereichs', text: `${outOfRange} deiner letzten Zyklen lagen außerhalb von 21–35 Tagen. Gelegentlich ist das normal. Wenn es häufig vorkommt, ist es sinnvoll, das bei der Frauenärztin anzusprechen.` });

  // Periodendauer
  const pl = m.ps.filter((p, i) => i < m.ps.length - 1 || diff(p.end, t) >= 2).map(p => diff(p.start, p.end) + 1);
  if (pl.length >= 2 && pl.slice(-2).every(x => x > 7)) push({ id: 'long', type: 'education', prio: 5, title: 'Längere Blutungen', text: 'Deine letzten Perioden dauerten länger als 7 Tage. Das ist ein Grund, mit deiner Frauenärztin zu sprechen.' });
  if (pl.length >= 6) {
    const r = mean(pl.slice(-3)), b = mean(pl.slice(-6, -3));
    if (Math.abs(r - b) >= 1.5) push({ id: 'plen', type: 'personal', prio: 3, title: r > b ? 'Perioden dauern länger' : 'Perioden sind kürzer geworden', text: `Zuletzt im Schnitt ${tg(Math.round(r))}, davor ${tg(Math.round(b))}.` });
  }

  // Schmerz während der Periode im Vergleich
  const painOf = c => { const v = []; for (let d = c.start; d <= add(c.start, 4); d = add(d, 1)) { const e = db.days[d]; if (e && typeof e.pain === 'number') v.push(e.pain); } return v.length ? mean(v) : null; };
  const pcs = [...m.cycles.map(c => ({ start: c.start })), ...(m.cur && diff(m.cur.start, t) >= 3 ? [{ start: m.cur.start }] : [])].map(painOf).filter(x => x != null);
  if (pcs.length >= 4) {
    const last = pcs[pcs.length - 1], prev = mean(pcs.slice(0, -1).slice(-5));
    if (Math.abs(last - prev) >= 0.7) push({ id: 'pain', type: 'personal', prio: 5, title: last > prev ? 'Mehr Schmerzen als sonst' : 'Weniger Schmerzen als sonst', text: `In deiner letzten Periode lag die eingetragene Schmerzstärke im Schnitt bei ${last.toFixed(1).replace('.', ',')} von 3, sonst bei ${prev.toFixed(1).replace('.', ',')}.${last > prev && last >= 2 ? ' Starke Regelschmerzen, die dich im Alltag einschränken, solltest du ärztlich abklären lassen.' : ''}` });
  }

  // Stimmung nach Phase
  for (const mo of A.moods.slice(0, 8)) {
    if (mo.total < 4) continue;
    const best = PHASES.map(p => [p, mo['r_' + p], mo[p]]).sort((a, b) => b[1] - a[1]);
    const [p, r, n] = best[0];
    const others = best.slice(1).filter(x => A.phaseDays[x[0]] >= 3).map(x => x[1]);
    if (n >= 3 && A.phaseDays[p] >= 5 && others.length && r >= 2 * Math.max(...others, 0.01)) {
      push({ id: 'mood-' + mo.name, type: 'personal', prio: 4, title: `„${mo.name}“ vor allem in der ${PHASE_NAME[p]}`, text: `An ${pct(r)} deiner eingetragenen Tage in der ${PHASE_NAME[p]} hast du „${mo.name}“ gewählt – deutlich öfter als in anderen Phasen.` });
      break;
    }
  }

  // Energie & Schlaf nach Phase
  for (const [k, label, unit, thr] of [['energy', 'Energie', ' von 5', 0.8], ['sleep', 'Schlaf', ' h', 0.6]]) {
    const pa = A.phaseAvg[k];
    const vals = PHASES.map(p => [p, pa[p]]).filter(x => x[1] != null);
    const n = A.curve[k].reduce((s, x) => s + x[2], 0);
    if (vals.length < 2 || n < 10) continue;
    vals.sort((a, b) => b[1] - a[1]);
    const hi = vals[0], lo = vals[vals.length - 1];
    if (hi[1] - lo[1] >= thr) push({ id: 'ph-' + k, type: 'personal', prio: 3, title: `${label} im Zyklusverlauf`, text: `Dein Ø-Wert für ${label} ist in der ${PHASE_NAME[hi[0]]} am höchsten (${hi[1].toFixed(1).replace('.', ',')}${unit}) und in der ${PHASE_NAME[lo[0]]} am niedrigsten (${lo[1].toFixed(1).replace('.', ',')}${unit}).` });
  }

  // Zusammenhang Schlaf ↔ Kopfschmerzen
  const entries = Object.values(db.days).filter(e => typeof e.sleep === 'number');
  const short = entries.filter(e => e.sleep < 6), longer = entries.filter(e => e.sleep >= 7);
  if (short.length >= 5 && longer.length >= 5) {
    for (const s of ['Kopfschmerzen', 'Migräne', 'Müdigkeit']) {
      const a = short.filter(e => (e.symptoms || []).includes(s)).length / short.length;
      const b = longer.filter(e => (e.symptoms || []).includes(s)).length / longer.length;
      if (a >= 0.3 && a >= b * 2) { push({ id: 'corr-' + s, type: 'personal', prio: 3, title: `${s} & Schlaf`, text: `An Tagen mit weniger als 6 Stunden Schlaf hast du in ${pct(a)} der Fälle „${s}“ eingetragen, bei 7 Stunden oder mehr in ${pct(b)}. Das ist ein Zusammenhang in deinen Daten – keine nachgewiesene Ursache.` }); break; }
    }
  }

  // Temperatur
  if (m.cur && m.cur.ovSource === 'temp') push({ id: 'bbt', type: 'estimate', prio: 6, title: 'Temperaturanstieg erkannt', text: `Deine Basaltemperatur ist ab dem ${fmtD(add(m.cur.ov, 1))} gestiegen. Das spricht dafür, dass der Eisprung um den ${fmtD(m.cur.ov)} stattgefunden hat. Eine Bestätigung ist das nicht.` });
  if (m.lutealSource === 'temp') push({ id: 'lut', type: 'estimate', prio: 2, title: `Deine Lutealphase: ca. ${tg(m.luteal)}`, text: 'Aus deinen Temperaturkurven geschätzt. Die App nutzt diesen Wert, um Eisprung und fruchtbares Fenster vorherzusagen.' });

  // Datenbasis
  if (m.nUsed < 3) push({ id: 'more', type: 'notice', prio: 2, title: 'Vorhersagen werden genauer', text: `Noch ${3 - m.nUsed} vollständige${3 - m.nUsed === 1 ? 'r Zyklus' : ' Zyklen'}, dann kann die App deine Regelmäßigkeit und typische Muster zuverlässiger erkennen.` });
  if (m.mae != null) push({ id: 'acc', type: 'estimate', prio: 2, title: `Vorhersagen lagen im Schnitt ${m.mae.toFixed(1).replace('.', ',')} Tage daneben`, text: 'Rückblickend berechnet: So weit lag die Vorhersage zu Beginn jedes deiner letzten Zyklen von der tatsächlichen Periode entfernt.' });

  return out.sort((a, b) => b.prio - a.prio);
}

/* ---------- Erinnerungen ---------- */
export function upcoming(db, m, t = m.t) {
  const S = db.settings, out = [];
  const e = db.days[t] || {};
  if (m.cur && !m.late && !m.inPeriod) {
    const n = diff(t, m.next);
    if (n >= 0 && n <= Math.max(S.reminders.periodBefore, 0)) out.push({ id: 'period', icon: 'drop', text: n === 0 ? 'Deine Periode könnte heute beginnen' : `Periode in ca. ${tg(n)} erwartet`, sub: `Zeitraum ${fmtD(m.nextRange[0])} – ${fmtD(m.nextRange[1])}` });
    const fs = m.segs.find(s => (s.current || s.predicted) && add(s.ov, 1) >= t && add(s.ov, -5) <= add(t, 2));
    if (fs && S.categories.sex !== false) { const a = add(fs.ov, -5); out.push({ id: 'fert', icon: 'spark', text: a <= t ? 'Fruchtbares Fenster (geschätzt)' : `Fruchtbares Fenster ab ${fmtD(a)}`, sub: 'Schätzung – nicht zur Verhütung geeignet' }); }
  }
  if (S.pill && !e.pill) out.push({ id: 'pill', icon: 'pill', text: 'Pille heute noch nicht abgehakt', sub: S.pillTime ? `Geplant um ${S.pillTime} Uhr` : '', action: 'pillToday' });
  for (const med of S.meds) if (med.daily && !(e.meds || []).includes(med.name)) out.push({ id: 'med-' + med.name, icon: 'pill', text: `${med.name} heute noch nicht eingetragen`, sub: med.time ? `Geplant um ${med.time} Uhr` : '', action: 'medToday', value: med.name });
  for (const r of S.reminders.custom || []) {
    const due = reminderDue(r, t);
    if (due != null && due <= 3) out.push({ id: 'c-' + r.id, icon: 'bell', text: r.text, sub: due === 0 ? 'Heute' + (r.time ? ` · ${r.time} Uhr` : '') : due === 1 ? 'Morgen' : `In ${tg(due)} · ${fmtD(add(t, due))}`, custom: r.id });
  }
  return out;
}
/** Tage bis zur nächsten Fälligkeit (0 = heute) oder null. */
export function reminderDue(r, t) {
  if (!r.date) return r.repeat === 'daily' ? 0 : null;
  let d = r.date;
  if (r.repeat === 'daily') return d <= t ? 0 : diff(t, d);
  if (r.repeat === 'weekly') { while (d < t) d = add(d, 7); }
  else if (r.repeat === 'monthly') { let i = 0; const [y, mo, dd] = r.date.split('-').map(Number); while (d < t && i < 600) { i++; const x = new Date(y, mo - 1 + i, 1, 12); const dim = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(dd, dim)); d = iso(x); } }
  const n = diff(t, d);
  return n >= 0 ? n : null;
}

/* ---------- Kalender-Export (.ics) für echte iPhone-Erinnerungen ---------- */
const icsDate = s => s.replace(/-/g, '');
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
export function buildICS(db, m, opts = {}, now = new Date()) {
  const S = db.settings;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Haiwoche//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const ev = (uid, start, end, title, desc, alarm, rrule, time) => {
    L.push('BEGIN:VEVENT', `UID:${uid}@liwy.local`, `DTSTAMP:${stamp}`);
    if (time) { const hm = time.replace(':', '') + '00'; L.push(`DTSTART:${icsDate(start)}T${hm}`, `DTEND:${icsDate(start)}T${hm}`); }
    else L.push(`DTSTART;VALUE=DATE:${icsDate(start)}`, `DTEND;VALUE=DATE:${icsDate(end)}`);
    if (rrule) L.push(`RRULE:${rrule}`);
    L.push(`SUMMARY:${icsEsc(title)}`);
    if (desc) L.push(`DESCRIPTION:${icsEsc(desc)}`);
    if (alarm != null) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, `TRIGGER:${alarm}`, 'END:VALARM');
    L.push('END:VEVENT');
  };
  if (opts.periods !== false && m.cur) {
    m.future.slice(0, opts.count || 6).forEach((s, i) => {
      const before = S.reminders.periodBefore || 0;
      ev(`period-${i}-${s.start}`, s.start, add(s.end, 1), '🩸 Periode erwartet (Schätzung)', `Geschätzter Zeitraum ± ${s.unc} Tage. Erstellt von „Haiwoche“.`, before > 0 ? `-P${before}DT0H0M0S` : '-PT0M', null, null);
    });
  }
  if (opts.fertile && m.cur) m.future.slice(0, opts.count || 6).forEach((s, i) => ev(`fert-${i}-${s.ov}`, add(s.ov, -5), add(s.ov, 2), 'Fruchtbares Fenster (Schätzung)', 'Nur eine Schätzung – nicht zur Verhütung geeignet.', null, null, null));
  const todayS = iso(now);
  if (opts.pill && S.pill) ev('pill-daily', todayS, null, '💊 Pille nehmen', '', '-PT0M', 'FREQ=DAILY', S.pillTime || '20:00');
  if (opts.meds) for (const md of S.meds.filter(x => x.daily)) ev('med-' + md.name.replace(/\W/g, ''), todayS, null, `💊 ${md.name}`, '', '-PT0M', 'FREQ=DAILY', md.time || '09:00');
  if (opts.log) ev('log-daily', todayS, null, 'Wie geht es dir heute? Kurz eintragen', '', '-PT0M', 'FREQ=DAILY', S.reminders.logTime || '21:00');
  if (opts.custom) for (const r of S.reminders.custom || []) {
    if (!r.date && r.repeat !== 'daily') continue;
    const rr = { daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY' }[r.repeat] || null;
    ev('custom-' + r.id, r.date || todayS, r.time ? null : add(r.date || todayS, 1), r.text, '', r.time ? '-PT0M' : '-PT9H', rr, r.time || null);
  }
  L.push('END:VCALENDAR');
  // Zeilen auf 75 Oktette falten (RFC 5545)
  return L.map(line => { const out = []; let s = line; while (new TextEncoder().encode(s).length > 74) { let cut = 74; while (new TextEncoder().encode(s.slice(0, cut)).length > 74) cut--; out.push(s.slice(0, cut)); s = ' ' + s.slice(cut); } out.push(s); return out.join('\r\n'); }).join('\r\n') + '\r\n';
}

/* ---------- Teilen mit Partner (nur ausgewählte Infos, nur auf Wunsch) ---------- */
export function partnerSummary(db, m, opts, t = m.t) {
  const lines = [];
  const name = db.settings.name || 'Ich';
  lines.push(`Kurzes Update von ${name} (${fmtD(t)}):`);
  if (opts.phase && m.cur) {
    const inf = dayInfo(m, db.days, t);
    const label = { mens: 'Periode', foll: 'Follikelphase', fert: 'fruchtbare Phase (geschätzt)', lut: 'Lutealphase' }[inf.phase];
    lines.push(`• Phase: ${m.inPeriod ? `Periode, Tag ${m.periodDay}` : label}`);
  }
  if (opts.next && m.cur) lines.push(m.late > 0 ? `• Periode: noch nicht da (erwartet ${fmtD(m.nominal)})` : `• Nächste Periode: ca. ${fmtD(m.next)} (${fmtD(m.nextRange[0])} – ${fmtD(m.nextRange[1])})`);
  const e = db.days[t] || {};
  if (opts.mood && (e.moods || []).length) lines.push(`• Stimmung heute: ${e.moods.join(', ')}`);
  if (opts.symptoms && (e.symptoms || []).length) lines.push(`• Heute: ${e.symptoms.join(', ')}`);
  if (opts.energy && typeof e.energy === 'number') lines.push(`• Energie: ${e.energy}/5`);
  if (opts.note && opts.noteText) lines.push(`• ${opts.noteText}`);
  return lines.join('\n');
}

/* ---------- Bericht ---------- */
export function reportData(db, m, from, to) {
  const A = analyze(db, m, from, to);
  const ps = m.ps.filter(p => p.start >= from && p.start <= to);
  const notes = Object.entries(db.days).filter(([d, e]) => d >= from && d <= to && e.note).sort((a, b) => a[0].localeCompare(b[0]));
  return { ...A, periods: ps, notes };
}
