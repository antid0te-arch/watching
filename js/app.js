// Haiwoche – App-Steuerung, Ansichten und Aktionen.
import * as C from './core.js';
import * as T from './content.js';
import * as St from './store.js';
import { esc, fmt, fmtLong, fmtMonth, fmtShortMonth, tage, dec, icon, logo, bars, curve, cycleRows, heatmap, confBars, CONF_LABEL, TYPE_LABEL, gauge, phaseCurve, areaLine, donut } from './ui.js';

const VERSION = '2.2';
const $ = s => document.querySelector(s);
const state = {
  db: null, session: null, prefs: St.loadPrefs(), ver: 0,
  calMonth: C.todayISO().slice(0, 7), calSel: C.todayISO(), calEdit: false, calFilter: '',
  range: '6', metric: 'energy', sheetDay: null, jq: '', jMonth: '', reportRange: '3',
  partner: { phase: true, next: true, mood: false, symptoms: false, energy: false, note: false, noteText: '' },
  ics: { periods: true, fertile: false, pill: true, meds: true, log: false, custom: true },
  ob: { name: '', start: '', periodLen: 5, cycleLen: 28, pill: false, sex: true, unknownStart: false },
};

/* ---------- Daten & Modell ---------- */
let memo = { ver: -1, t: '', m: null };
function model() {
  const t = C.todayISO();
  if (memo.ver !== state.ver || memo.t !== t) memo = { ver: state.ver, t, m: C.buildModel(state.db, t) };
  return memo.m;
}
let saving = Promise.resolve();
function persist() {
  if (!state.db) return;
  if (state.session) {
    const snap = structuredClone(state.db), ses = state.session;
    saving = saving.then(() => St.saveEncrypted(snap, ses)).catch(() => toast('Speichern fehlgeschlagen'));
  } else St.savePlain(state.db);
}
function commit(opts = {}) { state.ver++; persist(); if (!opts.silent) render(); }
const S = () => state.db.settings;
const cat = id => S().categories[id] !== false;

function setField(d, f, v) {
  const days = state.db.days;
  const e = { ...(days[d] || {}) };
  e[f] = v;
  const c = C.cleanEntry(e);
  if (Object.keys(c).length) days[d] = c; else delete days[d];
}

/* ---------- Router ---------- */
function route() {
  const h = (location.hash || '#/today').slice(2).split('/');
  return { tab: ['today', 'cal', 'stats', 'journal', 'more'].includes(h[0]) ? h[0] : 'today', sub: h[1] || '', arg: decodeURIComponent(h[2] || '') };
}
function go(path) { if (location.hash !== '#/' + path) location.hash = '/' + path; else render(); }
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

/* ---------- Gemeinsame Bausteine ---------- */
function backHead(title, to = 'more') {
  return `<div class="top"><button class="back" data-a="go" data-v="${to}">${icon('back')}Zurück</button></div><h1>${esc(title)}</h1>`;
}
function emptyState(ic, text) { return `<div class="empty">${icon(ic)}<div>${text}</div></div>`; }
function phasePill(ph, detail) {
  if (!ph) return '';
  const label = detail === 'ov' ? 'Eisprung (geschätzt)' : T.PHASE[ph].name;
  return `<span class="pill ph-${ph}"><i></i>${label}</span>`;
}
function dayCell(m, d, extra = '') {
  const inf = C.dayInfo(m, state.db.days, d);
  const cls = ['day'];
  if (inf.logged) cls.push('d-period'); else if (inf.spot) cls.push('d-spot'); else if (inf.pred) cls.push('d-pred');
  else if (inf.ov) cls.push('d-ov'); else if (inf.fert) cls.push('d-fert');
  if (d === m.t) cls.push('d-today');
  const e = inf.entry;
  const marks = [];
  if (inf.has) marks.push('<i></i>');
  if (e && e.note) marks.push('<i class="n"></i>');
  const lbl = `${fmtLong(d)}${inf.logged ? ', Periode' : inf.pred ? ', Periode erwartet' : inf.ov ? ', Eisprung geschätzt' : inf.fert ? ', fruchtbar geschätzt' : ''}${inf.has ? ', mit Eintrag' : ''}`;
  return `<button class="${cls.join(' ')} ${extra}" data-a="day" data-v="${d}" aria-label="${lbl}"><span class="dn">${C.parse(d).getDate()}</span><span class="mk">${marks.join('')}</span></button>`;
}
function summarize(e) {
  const out = [];
  if (!e) return out;
  if (e.flow) out.push({ t: T.FLOW_LABEL[e.flow], c: 'p' });
  for (const s of e.moods || []) out.push({ t: s, c: 'm' });
  for (const s of e.symptoms || []) out.push({ t: s });
  if (typeof e.pain === 'number' && e.pain > 0) out.push({ t: 'Schmerz: ' + T.PAIN[e.pain] });
  if (typeof e.energy === 'number') out.push({ t: 'Energie ' + e.energy + '/5' });
  if (typeof e.stress === 'number') out.push({ t: 'Stress ' + e.stress + '/5' });
  if (typeof e.sleep === 'number') out.push({ t: dec(e.sleep, e.sleep % 1 ? 1 : 0) + ' h Schlaf' });
  if (typeof e.sleepQ === 'number') out.push({ t: 'Schlaf: ' + T.SLEEPQ[e.sleepQ - 1] });
  if (e.appetite) out.push({ t: 'Appetit: ' + e.appetite });
  for (const s of e.cravings || []) out.push({ t: 'Lust auf ' + s });
  for (const s of e.activity || []) out.push({ t: s });
  if (e.discharge) out.push({ t: e.discharge });
  if (cat('sex') && e.sex) out.push({ t: e.sex });
  if (cat('sex') && e.libido) out.push({ t: e.libido });
  if (typeof e.temp === 'number') out.push({ t: dec(e.temp, 2) + ' °C' });
  if (typeof e.weight === 'number') out.push({ t: dec(e.weight) + ' kg' });
  if (e.pill) out.push({ t: 'Pille ✓' });
  for (const s of e.meds || []) out.push({ t: s + ' ✓' });
  return out;
}
const chipsHtml = items => `<div class="mini-chips">${items.map(i => `<span class="${i.c || ''}">${esc(i.t)}</span>`).join('')}</div>`;

/* ---------- Onboarding ---------- */
function viewOnboarding() {
  const o = state.ob;
  return `<div class="view" style="padding-top:28px">
    <div class="center"><div style="width:96px;height:96px;margin:0 auto">${logo()}</div>
    <h1 style="margin:10px 0 2px">Haiwoche</h1>
    <p style="margin:0 0 10px;color:var(--sel);font-weight:600">Keine Panik, nur Zyklus.</p>
    <p class="muted" style="margin:0 0 24px">Dein privater Zyklus-Tracker. Alles bleibt auf diesem iPhone – ohne Account, ohne Internet, ohne Abo.</p></div>
    <div class="card">
      <label class="f" style="margin-top:0" for="ob-name">Wie heißt du? (optional)</label>
      <input id="ob-name" type="text" data-ob="name" value="${esc(o.name)}" placeholder="Name" autocomplete="off">
      <label class="f" for="ob-start">Erster Tag deiner letzten Periode</label>
      <input id="ob-start" type="date" data-ob="start" value="${o.start}" max="${C.todayISO()}" ${o.unknownStart ? 'disabled' : ''}>
      <div class="swrow" style="padding-top:12px"><span class="small">Weiß ich nicht mehr – ich trage die nächste Periode ein</span><label class="switch"><input type="checkbox" data-a="obToggle" data-k="unknownStart" ${o.unknownStart ? 'checked' : ''} aria-label="Datum unbekannt"><span></span></label></div>
      <label class="f">Wie lange dauert deine Periode meistens?</label>
      <div class="stepper"><button class="iconbtn" data-a="obstep" data-k="periodLen" data-d="-1" aria-label="weniger">−</button><span class="v">${tage(o.periodLen)}</span><button class="iconbtn" data-a="obstep" data-k="periodLen" data-d="1" aria-label="mehr">+</button></div>
      <label class="f">Wie lang ist dein Zyklus ungefähr?</label>
      <div class="stepper"><button class="iconbtn" data-a="obstep" data-k="cycleLen" data-d="-1" aria-label="weniger">−</button><span class="v">${tage(o.cycleLen)}</span><button class="iconbtn" data-a="obstep" data-k="cycleLen" data-d="1" aria-label="mehr">+</button></div>
      <p class="small muted" style="margin:10px 0 0">Nur ein Startwert. Sobald du Perioden einträgst, rechnet die App mit deinen echten Daten.</p>
    </div>
    <div class="card">
      <div class="swrow"><span>Ich nehme die Pille</span><label class="switch"><input type="checkbox" data-a="obToggle" data-k="pill" ${o.pill ? 'checked' : ''} aria-label="Pille"><span></span></label></div>
      <div class="swrow"><span>Sex & Lust tracken<br><span class="small muted">Kann jederzeit geändert werden</span></span><label class="switch"><input type="checkbox" data-a="obToggle" data-k="sex" ${o.sex ? 'checked' : ''} aria-label="Sex tracken"><span></span></label></div>
    </div>
    <button class="btn" data-a="finishOb">Los geht's</button>
    <p class="xs muted center mt">Vorhersagen sind Schätzungen und kein Verhütungsmittel.</p>
  </div>`;
}

/* ---------- Heute ---------- */
function quickLists() {
  const t = C.todayISO(), from = C.add(t, -120), cnt = {}, mcnt = {};
  for (const [d, e] of Object.entries(state.db.days)) {
    if (d < from) continue;
    for (const s of e.symptoms || []) cnt[s] = (cnt[s] || 0) + 1;
    for (const s of e.moods || []) mcnt[s] = (mcnt[s] || 0) + 1;
  }
  const enabled = new Set([...Object.entries(T.SYMPTOM_GROUPS).filter(([g]) => cat(g)).flatMap(([, l]) => l), ...S().customSymptoms]);
  const sym = [...new Set([...Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]), 'Krämpfe', 'Kopfschmerzen', 'Brustspannen', 'Müdigkeit', 'Blähungen', 'Akne', 'Rückenschmerzen', 'Übelkeit'])].filter(s => enabled.has(s)).slice(0, 8);
  const moods = [...new Set([...Object.keys(mcnt).sort((a, b) => mcnt[b] - mcnt[a]), 'Glücklich', 'Ruhig', 'Energiegeladen', 'Gereizt', 'Traurig', 'Gestresst', 'Sensibel'])].slice(0, 7);
  return { sym, moods };
}
function capsules(m) {
  const t = m.t, days = state.db.days;
  const start = m.cur && C.diff(m.cur.start, t) <= 14 ? m.cur.start : C.add(t, -7);
  let out = '';
  for (let d = start; d <= C.add(t, 5); d = C.add(d, 1)) {
    const inf = C.dayInfo(m, days, d), e = days[d], isT = d === t, fut = d > t;
    const lbl = isT ? 'Heute' : inf.cycleDay ? 'Tag ' + inf.cycleDay : C.parse(d).getDate() + '.';
    const inner = inf.logged ? icon('drop') : (fut || C.hasData(e)) ? icon('check') : '';
    out += `<button class="cap ${isT ? 'today' : ''} ${fut ? 'future' : ''} ${inf.logged && !isT ? 'mens' : ''}" data-a="day" data-v="${d}" ${isT ? 'id="cap-today"' : ''} aria-label="${fmtLong(d)}${inf.logged ? ', Periode' : ''}${C.hasData(e) ? ', mit Eintrag' : ''}">${lbl}<span class="o">${inner}</span></button>`;
  }
  return `<div class="caps" role="list" aria-label="Zyklustage">${out}</div>`;
}
function viewToday() {
  const m = model(), t = m.t, e = state.db.days[t] || {};
  const inf = C.dayInfo(m, state.db.days, t);
  const ph = m.cur ? (m.inPeriod ? 'mens' : inf.phase) : null;
  let big, sub;
  if (!m.cur) { big = '–'; sub = 'Trag deine Periode ein'; }
  else if (m.late > 0 && !m.inPeriod) { big = tage(m.late); sub = m.lateBeyondRange ? 'später als erwartet' : 'nach Termin – im Spielraum'; }
  else { big = 'Tag ' + (m.inPeriod ? m.periodDay : m.cycleDay); sub = m.inPeriod ? 'Menstruation' : inf.phaseDetail === 'ov' ? 'Eisprung*' : ph === 'fert' ? 'Fruchtbares Fenster*' : T.PHASE[ph].name; }
  const q = { mens: 'Gönn dir heute etwas Ruhe', foll: 'Bereit für einen guten Tag?', fert: 'Wie fühlst du dich heute?', lut: 'Sei heute lieb zu dir' }[ph] || 'Schön, dass du da bist';
  const name = S().name;
  let status = '';
  if (m.cur) {
    const n = C.diff(t, m.next);
    const nextTxt = m.inPeriod ? `Nächste Periode ca. ${fmt(m.future[0] ? m.future[0].start : m.next)}` : m.late > 0 ? `Erwartet war der ${fmt(m.nominal)}` : n === 0 ? 'Periode könnte heute beginnen' : `Periode in ${n === 1 ? '1 Tag' : n + ' Tagen'} · ${fmt(m.nextRange[0])}–${fmt(m.nextRange[1])}`;
    const fs = m.segs.find(x => (x.current || x.predicted) && C.add(x.ov, 1) >= t);
    status = `<div class="status"><b>${nextTxt}</b><div class="row" style="justify-content:center;gap:12px;margin-top:6px"><span class="conf">${confBars(m.confidence)} ${CONF_LABEL[m.confidence]}</span>${fs ? `<span class="xs muted">Eisprung ca. ${fmt(fs.ov)}*</span>` : ''}</div></div>`;
  }
  const legend = `<div class="dots"><span><i style="background:var(--mens)"></i>Menstruation</span><span><i style="background:var(--foll)"></i>Follikelphase</span><span><i style="background:var(--fert)"></i>Fruchtbar*</span><span><i style="background:var(--lut)"></i>Lutealphase</span></div>`;

  const period = m.inPeriod
    ? `<div class="card"><div class="card-h"><h2>Blutung heute</h2>${e.flow ? `<span class="small muted">${T.FLOW_LABEL[e.flow]}</span>` : ''}</div>
       <div class="chips">${[['spotting', 'Schmier'], ['light', 'Leicht'], ['medium', 'Mittel'], ['heavy', 'Stark']].map(([v, l]) => `<button class="chip mens ${e.flow === v ? 'on' : ''}" data-a="flowToday" data-v="${v}"><span class="em">${T.EMOJI[v]}</span>${l}</button>`).join('')}</div>
       <button class="btn sec mt" data-a="flowToday" data-v="none">${icon('check')}Heute keine Blutung mehr</button></div>`
    : `<div class="btnrow mt"><button class="btn mens" data-a="startPeriod">${icon('drop')}Periode da</button><button class="btn sec" data-a="editPeriods">${icon('edit')}Korrigieren</button></div>`;

  const rec = ph ? T.RECS[ph] : null;
  const recs = rec ? `<div class="card-h" style="margin:22px 4px 12px"><h2>Empfehlung für heute</h2><button class="link" data-a="go" data-v="more/library">Wissen</button></div>
    <div class="recs"><div class="rec"><h4><span class="em">🥗</span>Ernährung</h4><p>${rec.food}</p></div><div class="rec"><h4><span class="em">🧘‍♀️</span>Bewegung</h4><p>${rec.move}</p></div></div>
    <p class="xs muted" style="margin:8px 4px 0">Allgemeine Tipps zur ${T.PHASE[ph].name} – kein medizinischer Rat.</p>` : '';

  const { sym, moods } = quickLists();
  const em = s => T.EMOJI[s] ? `<span class="em">${T.EMOJI[s]}</span>` : '';
  const quick = `<div class="card mt2">
    <div class="card-h"><h2>Wie fühlst du dich?</h2><button class="link" data-a="day" data-v="${t}">Alles</button></div>
    ${cat('mood') ? `<div class="chips" role="group" aria-label="Stimmung">${moods.slice(0, 6).map(s => `<button class="chip ${(e.moods || []).includes(s) ? 'on' : ''}" data-a="quick" data-f="moods" data-v="${esc(s)}">${em(s)}${esc(s)}</button>`).join('')}</div>` : ''}
    ${sym.length ? `<p class="small muted" style="margin:16px 0 8px">Körper</p><div class="chips" role="group" aria-label="Symptome">${sym.slice(0, 6).map(s => `<button class="chip ${(e.symptoms || []).includes(s) ? 'on' : ''}" data-a="quick" data-f="symptoms" data-v="${esc(s)}">${em(s)}${esc(s)}</button>`).join('')}</div>` : ''}
    ${cat('energy') ? `<p class="small muted" style="margin:16px 0 10px">Energie</p><div class="scale s5">${T.ENERGY.map((l, i) => `<button class="${e.energy === i + 1 ? 'on' : ''}" data-a="quickScale" data-f="energy" data-v="${i + 1}"><b>${i + 1}</b>${l}</button>`).join('')}</div>` : ''}
  </div>`;

  const ups = C.upcoming(state.db, m);
  const reminders = ups.length ? `<div class="card"><div class="card-h"><h2>Erinnerungen</h2><button class="link" data-a="go" data-v="more/reminders">Verwalten</button></div>
    ${ups.map(u => `<div class="reminder"><span class="ic">${icon(u.icon)}</span><div class="grow"><div>${esc(u.text)}</div>${u.sub ? `<div class="xs muted">${esc(u.sub)}</div>` : ''}</div>
    ${u.action ? `<button class="btn sm ghost" data-a="${u.action}" data-v="${esc(u.value || '')}">Erledigt</button>` : ''}</div>`).join('')}</div>` : '';
  const ins = C.insights(state.db, m).filter(i => i.id !== 'pred').slice(0, 3);
  const insights = ins.length ? `<div class="card"><div class="card-h"><h2>Für dich</h2><button class="link" data-a="go" data-v="stats">Analyse</button></div>${ins.map(insHtml).join('')}</div>` : '';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;

  return `<div class="view">
  <div class="hello"><div class="grow"><div class="hi">Hallo${name ? ', ' + esc(name) : ''} 👋</div><h1>${q}</h1></div>
    <button class="avatar" data-a="go" data-v="more" aria-label="Mehr">${name ? esc(name.trim()[0].toUpperCase()) : `<span style="width:30px;height:30px">${logo()}</span>`}</button></div>
  ${capsules(m)}
  ${ios && !standalone ? `<div class="card tint"><h2>Als App installieren</h2><p class="small mb0">Tippe in Safari auf <b>Teilen</b> → <b>Zum Home-Bildschirm</b>. Erst dann bleiben deine Daten dauerhaft gespeichert.</p></div>` : ''}
  <div class="card hero">
    <div class="gauge">${gauge(m)}<div class="gauge-c"><div class="big">${big}</div><div class="ph" style="color:var(--sel)">${sub}</div></div></div>
    ${legend}${status}
  </div>
  <button class="btn" data-a="day" data-v="${t}">${icon('plus')}Symptome eintragen</button>
  ${period}
  ${recs}${quick}${reminders}${insights}
  <p class="xs muted center" style="margin:18px 8px 0">* Vorhersagen sind Schätzungen aus deinen Daten – kein Verhütungsmittel und keine Diagnose.</p>
  </div>`;
}
function insHtml(i) { return `<div class="ins"><span class="badge b-${i.type}">${TYPE_LABEL[i.type]}</span><h4>${esc(i.title)}</h4><p>${esc(i.text)}</p></div>`; }

/* ---------- Kalender ---------- */
const FILTERS = [['', 'Alles'], ['note', 'Notizen'], ['pain', 'Schmerzen'], ['mood', 'Stimmung'], ['sex', 'Sex'], ['temp', 'Temperatur'], ['meds', 'Medikamente']];
function matchFilter(e, f) {
  if (!f || !e) return false;
  if (f === 'note') return !!e.note;
  if (f === 'pain') return (typeof e.pain === 'number' && e.pain > 0) || (e.symptoms || []).some(s => T.SYMPTOM_GROUPS.pain.includes(s));
  if (f === 'mood') return (e.moods || []).length > 0;
  if (f === 'sex') return !!e.sex && e.sex !== 'Kein Sex';
  if (f === 'temp') return typeof e.temp === 'number';
  if (f === 'meds') return !!e.pill || (e.meds || []).length > 0;
  if (f.startsWith('s:')) return (e.symptoms || []).includes(f.slice(2)) || (e.moods || []).includes(f.slice(2));
  return false;
}
function viewCal() {
  const m = model(), days = state.db.days;
  const [y, mo] = state.calMonth.split('-').map(Number);
  const first = new Date(y, mo - 1, 1, 12), off = (first.getDay() + 6) % 7, dim = new Date(y, mo, 0).getDate();
  let cells = '', hits = 0;
  for (let i = 0; i < off; i++) cells += '<div></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = `${y}-${C.pad(mo)}-${C.pad(d)}`;
    const hl = state.calFilter && matchFilter(days[ds], state.calFilter);
    if (hl) hits++;
    cells += `<div>${dayCell(m, ds, `${ds === state.calSel && !state.calEdit ? 'd-sel' : ''} ${hl ? 'd-hl' : ''}`)}</div>`;
  }
  const isCur = state.calMonth === C.todayISO().slice(0, 7);
  const symOpts = [...new Set(Object.values(days).flatMap(e => [...(e.symptoms || []), ...(e.moods || [])]))].sort();
  const filters = FILTERS.filter(([k]) => k !== 'sex' || cat('sex'));
  const sel = state.calSel, se = days[sel], si = C.dayInfo(m, days, sel);
  const future = sel > m.t;
  const notes = [];
  if (si.pred) notes.push('Periode erwartet');
  if (si.ov) notes.push(si.seg && si.seg.ovSource === 'temp' ? 'Eisprung (aus Temperatur geschätzt)' : 'Eisprung geschätzt');
  if (si.fert) notes.push('Fruchtbares Fenster geschätzt');
  const detail = state.calEdit ? '' : `<div class="card">
    <div class="card-h"><div><h2 style="margin:0">${fmtLong(sel)}</h2><div class="small muted">${[si.cycleDay ? 'Zyklustag ' + si.cycleDay : '', si.phase ? T.PHASE[si.phase].name : ''].filter(Boolean).join(' · ')}</div></div>
    ${future ? '' : `<button class="btn sm" data-a="openSheet" data-v="${sel}">${se ? 'Bearbeiten' : 'Eintragen'}</button>`}</div>
    ${notes.length ? `<p class="small" style="color:var(--fert)">${notes.join(' · ')}</p>` : ''}
    ${se ? chipsHtml(summarize(se)) + (se.note ? `<p class="tl-note">${esc(se.note)}</p>` : '') : `<p class="small muted mb0">${future ? 'Für zukünftige Tage zeigt der Kalender nur Vorhersagen.' : 'Noch kein Eintrag für diesen Tag.'}</p>`}
  </div>`;
  const next3 = m.future ? m.future.slice(0, 3) : [];
  return `<div class="view">
  <div class="top"><span></span>${state.calEdit ? '' : `<button class="btn sm ghost" data-a="editPeriods">${icon('edit')}Periode bearbeiten</button>`}</div>
  <h1>Kalender</h1>
  ${state.calEdit ? `<div class="editbar"><span>Tippe auf Tage, um sie als Periode zu markieren oder zu entfernen.</span><button class="btn sm" data-a="editDone">Fertig</button></div>` : ''}
  <div class="card">
    <div class="calhead">
      <button class="iconbtn" data-a="calNav" data-d="-1" aria-label="Vorheriger Monat">${icon('left')}</button>
      <div class="center"><div class="t">${fmtMonth(state.calMonth)}</div>${isCur ? '' : '<button class="link small" data-a="calToday">Zu heute</button>'}</div>
      <button class="iconbtn" data-a="calNav" data-d="1" aria-label="Nächster Monat">${icon('right')}</button>
    </div>
    <div class="calgrid" role="grid">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<div class="wd">${w}</div>`).join('')}${cells}</div>
    <div class="legend">
      <span><i class="lg" style="background:var(--mens)"></i>Periode</span>
      <span><i class="lg" style="border:1.5px dashed var(--mens)"></i>Erwartet</span>
      <span><i class="lg" style="background:var(--fert-soft);border:1px solid var(--fert)"></i>Fruchtbar*</span>
      <span><i class="lg" style="background:var(--fert)"></i>Eisprung*</span>
      <span><i class="lg" style="width:6px;height:6px;background:var(--muted)"></i>Eintrag</span>
      <span><i class="lg" style="width:6px;height:6px;background:var(--accent)"></i>Notiz</span>
    </div>
    ${state.calEdit ? '' : `<div class="chips scroll mt" role="group" aria-label="Filter">${filters.map(([k, l]) => `<button class="chip ${state.calFilter === k ? 'on' : ''}" data-a="calFilter" data-v="${k}">${l}</button>`).join('')}
      ${symOpts.length ? `<select data-a="calFilterSel" aria-label="Nach Symptom filtern" style="width:auto;min-height:38px;padding:6px 12px;border-radius:999px;font-size:15px"><option value="">Symptom …</option>${symOpts.map(s => `<option value="s:${esc(s)}" ${state.calFilter === 's:' + s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>` : ''}</div>
      ${state.calFilter ? `<p class="small muted mt mb0">${hits} ${hits === 1 ? 'Tag' : 'Tage'} in diesem Monat markiert.</p>` : ''}`}
  </div>
  ${detail}
  ${!state.calEdit && next3.length ? `<div class="card"><h2>Nächste Perioden</h2>${next3.map(s => `<div class="kv"><span>${fmt(s.start, { weekday: 'short', day: 'numeric', month: 'long' })}<br><span class="xs muted">Spielraum ± ${tage(s.unc)}</span></span><b class="small muted">Eisprung ca. ${fmt(C.add(s.next, -m.luteal))}</b></div>`).join('')}</div>` : ''}
  <p class="xs muted center">* Geschätzt – kein bestätigter Eisprung, nicht zur Verhütung geeignet.</p>
  </div>`;
}

/* ---------- Analyse ---------- */
function rangeFrom(r, t) { return r === 'all' ? '1900-01-01' : C.add(t, -Math.round(Number(r) * 30.44)); }
function viewStats() {
  const m = model(), t = m.t, from = rangeFrom(state.range, t);
  const A = C.analyze(state.db, m, from, t);
  const seg = `<div class="seg" role="tablist">${[['3', '3 Mon.'], ['6', '6 Mon.'], ['12', '1 Jahr'], ['all', 'Alles']].map(([k, l]) => `<button role="tab" aria-selected="${state.range === k}" class="${state.range === k ? 'on' : ''}" data-a="range" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (!m.ps.length) return `<div class="view"><h1>Analyse</h1><div class="card">${emptyState('chart', 'Sobald du deine Periode einträgst, erscheinen hier Statistiken, Muster und Erkenntnisse.')}</div></div>`;
  const cyc = A.cycles;
  const regTxt = { regular: 'Regelmäßig', irregular: 'Schwankend', unknown: 'Zu wenig Daten' }[m.regularity];
  const inN = l => l >= 21 && l <= 35;
  const cycTag = !m.nUsed ? '<span class="tag warn">Startwert</span>' : inN(m.avgCycle) ? '<span class="tag ok2">Im Normbereich</span>' : '<span class="tag warn">Außerhalb</span>';
  const perTag = !m.periodStats.n ? '<span class="tag warn">Startwert</span>' : m.avgPeriod >= 2 && m.avgPeriod <= 7 ? '<span class="tag ok2">Im Normbereich</span>' : '<span class="tag warn">Außerhalb</span>';
  const tiles = `<div class="tiles">
    <div class="tile"><div class="small muted">Regelmäßigkeit</div><div class="v" style="font-size:20px;margin-top:6px">${regTxt}</div><div class="xs muted">${m.range != null && m.nUsed >= 2 ? `Spanne ${tage(m.range)}` : 'ab 3 Zyklen'}</div></div>
    <div class="tile"><div class="small muted">Vorhersage-Treffer</div><div class="v">${m.mae != null ? '± ' + dec(m.mae) : '–'} <small>${m.mae != null ? 'Tage' : ''}</small></div><div class="xs muted">${m.mae != null ? 'Ø Abweichung' : 'ab 3 Zyklen'}</div></div>
  </div>`;
  const ins = C.insights(state.db, m);
  const cycBars = cyc.map(c => ({ label: fmtShortMonth(c.start), value: c.len, color: c.outlier ? 'var(--muted)' : c.len < 21 || c.len > 35 ? 'var(--lut)' : 'var(--sel)', tip: `${fmt(c.start, { day: 'numeric', month: 'long', year: 'numeric' })}: ${tage(c.len)}, Periode ${tage(c.plen)}${c.outlier ? ' – als Ausreißer nicht mitgerechnet' : ''}` }));
  const perBars = cyc.map(c => ({ label: fmtShortMonth(c.start), value: c.plen, color: 'var(--mens)', tip: `${fmt(c.start, { day: 'numeric', month: 'long' })}: ${tage(c.plen)} Blutung` }));
  const metrics = [['energy', 'Energie', 1, 5], ['pain', 'Schmerz', 0, 3], ['stress', 'Stress', 1, 5], ['sleep', 'Schlaf h', null, null], ['sleepQ', 'Schlafqualität', 1, 5], ['temp', 'Temperatur', null, null]].filter(([k]) => ({ energy: 'energy', stress: 'energy', pain: 'pain', sleep: 'sleep', sleepQ: 'sleep', temp: 'temp' })[k] && cat({ energy: 'energy', stress: 'energy', pain: 'pain', sleep: 'sleep', sleepQ: 'sleep', temp: 'temp' }[k]));
  if (!metrics.find(x => x[0] === state.metric) && metrics.length) state.metric = metrics[0][0];
  const mt = metrics.find(x => x[0] === state.metric);
  let curveHtml = '';
  if (mt) {
    const pts = A.curve[mt[0]];
    const vals = pts.map(p => p[1]);
    const lo = mt[2] ?? (vals.length ? Math.floor((Math.min(...vals) - 0.1) * 10) / 10 : 0), hi = mt[3] ?? (vals.length ? Math.ceil((Math.max(...vals) + 0.1) * 10) / 10 : 1);
    const xMax = Math.max(m.avgCycle, ...pts.map(p => p[0]), 2);
    const pa = A.phaseAvg[mt[0]];
    const phaseVals = C.PHASES.filter(p => pa[p] != null).length;
    const pLo = mt[2] ?? Math.floor(Math.min(...C.PHASES.map(p => pa[p] ?? Infinity)) - 0.3), pHi = mt[3] ?? Math.ceil(Math.max(...C.PHASES.map(p => pa[p] ?? -Infinity)) + 0.3);
    curveHtml = (phaseVals >= 2 ? `<h3 style="margin-top:4px">Ø nach Phase</h3>` + phaseCurve(pa, { yMin: pLo, yMax: pHi, id: 'phc', fmtY: v => dec(v, mt[0] === 'temp' ? 2 : 1), label: mt[1] + ' nach Phase' }) : '') + (pts.length >= 2 ? `<h3>Nach Zyklustag</h3>` : '') + (pts.length >= 2 ? curve(pts, { xMax, yMin: lo, yMax: hi, m, id: 'curve', fmtY: v => dec(v, mt[0] === 'temp' ? 2 : 1), label: mt[1] + ' nach Zyklustag' })
      : phaseVals >= 2 ? '' : emptyState('chart', `Trag „${mt[1]}“ an ein paar Tagen ein – dann siehst du hier deinen Verlauf über den Zyklus.`));
  }
  const symTop = A.symptoms.slice(0, 8), maxS = symTop.length ? symTop[0].total : 1;
  const heatList = [...A.symptoms.slice(0, 6), ...A.moods.slice(0, 4)];
  const months = A.months.slice(-6);
  return `<div class="view">
  <h1>Analyse</h1>${seg}<div style="height:14px"></div>${tiles}
  <div class="card"><h2>Erkenntnisse</h2>${ins.map(insHtml).join('')}<p class="xs muted mt mb0"><span class="b-personal badge">Aus deinen Daten</span> beobachtete Muster · <span class="b-estimate badge">Schätzung</span> statistisch · <span class="b-education badge">Wissen</span> allgemein. Keine Diagnosen.</p></div>
  <div class="card"><div class="donut-row">${donut(m.cur ? Math.min(1, m.cycleDay / m.avgCycle) : 0)}<div><div class="lbl">Zykluslänge</div><div class="val">${tage(m.avgCycle)}</div><div class="xs muted">${m.nUsed ? `± ${dec(m.sd)} · ${m.nUsed} Zyklen` : 'noch keine vollständigen Zyklen'}</div></div><div class="norm">Normal<b>21–35</b>${cycTag}</div></div>
    <h2 class="mt2">Bisherige Zyklen</h2>${cyc.length ? areaLine(cycBars, { band: [21, 35], avg: m.avgCycle, id: 'cyc', unit: ' Tage' }) + '<p class="xs muted mb0">Rosa Band: 21–35 Tage (typisch bei Erwachsenen). Gestrichelt: dein Durchschnitt.</p>' : emptyState('cycle', 'Sobald zwei Perioden im Zeitraum liegen, siehst du hier deine Zykluslängen.')}</div>
  <div class="card"><div class="donut-row">${donut(Math.min(1, m.avgPeriod / 7), 'var(--mens)')}<div><div class="lbl">Periodendauer</div><div class="val">${tage(m.avgPeriod)}</div><div class="xs muted">${m.periodStats.n ? `aus ${m.periodStats.n} Perioden` : 'Startwert'}</div></div><div class="norm">Normal<b>2–7</b>${perTag}</div></div>
    ${cyc.length ? `<h2 class="mt2">Bisherige Perioden</h2>${areaLine(perBars, { avg: m.avgPeriod, id: 'per', unit: ' Tage', height: 140 })}` : ''}</div>
  ${cyc.length ? `<div class="card"><h2>Zyklen im Vergleich</h2>${cycleRows([...cyc].reverse().slice(0, 12), m.luteal, m.avgCycle)}<div class="legend"><span><i class="lg" style="background:var(--mens)"></i>Periode</span><span><i class="lg" style="background:var(--fert-soft)"></i>Fruchtbar (gesch.)</span><span><i class="lg" style="background:var(--fert)"></i>Eisprung (gesch.)</span></div></div>` : ''}
  ${metrics.length ? `<div class="card"><h2>Körper im Zyklusverlauf</h2><div class="chips scroll" style="margin-bottom:12px">${metrics.map(([k, l]) => `<button class="chip ${state.metric === k ? 'on' : ''}" data-a="metric" data-v="${k}">${l}</button>`).join('')}</div>${curveHtml}</div>` : ''}
  <div class="card"><h2>Häufigste Symptome</h2>${symTop.length ? symTop.map(s => `<div style="margin-bottom:12px"><div class="row between small"><span>${esc(s.name)}</span><span class="muted">${s.total}×</span></div><div class="hbar" style="margin-top:6px"><i style="width:${Math.max(4, s.total / maxS * 100)}%"></i></div></div>`).join('') : emptyState('heart', 'Noch keine Symptome im gewählten Zeitraum.')}</div>
  <div class="card"><h2>Vor der Periode</h2>${A.pms.list.length ? `<p class="small muted">Symptome und Stimmungen, die du in den 5 Tagen vor der Periode deutlich häufiger einträgst als sonst:</p>${A.pms.list.slice(0, 6).map(x => `<div class="kv"><span>${esc(x.name)}</span><b class="small">${x.cycles} von ${x.of} Zyklen</b></div>`).join('')}` : `<p class="small muted mb0">${A.pms.cyclesWithData < 2 ? 'Dafür braucht es Einträge vor mindestens zwei Perioden.' : 'Kein deutliches Muster vor der Periode erkennbar.'}</p>`}</div>
  ${heatList.length ? `<div class="card"><h2>Muster nach Phase</h2><p class="small muted">Anteil deiner Einträge je Phase, an denen das jeweilige Symptom vorkam.</p>${heatmap(heatList, A.phaseDays)}</div>` : ''}
  ${months.length ? `<div class="card"><h2>Monatsvergleich</h2><div style="overflow-x:auto"><table class="tbl compact"><thead><tr><th>Monat</th><th>Periode</th><th>Schmerz</th><th>Energie</th><th>Schlaf</th></tr></thead><tbody>
    ${months.map(x => `<tr><td>${fmtShortMonth(x.key)} ’${x.key.slice(2, 4)}</td><td>${x.periodDays ? x.periodDays + ' T.' : '–'}</td><td>${dec(x.pain)}</td><td>${dec(x.energy)}</td><td>${x.sleep == null ? '–' : dec(x.sleep) + ' h'}</td></tr>`).join('')}</tbody></table></div><p class="xs muted mt mb0">Durchschnitt der Einträge: Schmerz 0–3, Energie 1–5.</p></div>` : ''}
  ${m.accuracy.length ? `<div class="card"><h2>Wie gut waren die Vorhersagen?</h2><p class="small muted">Rückblickend: Was die App zu Zyklusbeginn vorhergesagt hätte – und was tatsächlich passiert ist.</p>${m.accuracy.slice(-6).reverse().map(a => `<div class="kv"><span>${fmt(a.start, { day: 'numeric', month: 'short', year: '2-digit' })}<br><span class="xs muted">erwartet ${tage(a.predicted)}, tatsächlich ${tage(a.actual)}</span></span><b style="color:${Math.abs(a.error) <= 2 ? 'var(--foll)' : 'var(--lut)'}">${a.error === 0 ? 'exakt' : (a.error > 0 ? '+' : '−') + tage(Math.abs(a.error))}</b></div>`).join('')}</div>` : ''}
  <button class="btn ghost" data-a="go" data-v="more/report">${icon('doc')}Gesundheitsbericht erstellen</button>
  </div>`;
}

/* ---------- Tagebuch ---------- */
function viewJournal() {
  const days = state.db.days, q = state.jq.trim().toLowerCase();
  let list = Object.entries(days).filter(([, e]) => C.hasData(e)).sort((a, b) => b[0].localeCompare(a[0]));
  const monthsAvail = [...new Set(list.map(([d]) => d.slice(0, 7)))];
  if (state.jMonth) list = list.filter(([d]) => d.startsWith(state.jMonth));
  if (q) list = list.filter(([, e]) => JSON.stringify(e).toLowerCase().includes(q));
  const shown = list.slice(0, 120);
  let lastMonth = '', html = '';
  for (const [d, e] of shown) {
    const mk = d.slice(0, 7);
    if (mk !== lastMonth) { if (lastMonth) html += '</div>'; html += `<div class="sectitle">${fmtMonth(mk)}</div><div class="card" style="padding:4px 16px">`; lastMonth = mk; }
    const dt = C.parse(d);
    html += `<button class="tl-day" data-a="openSheet" data-v="${d}"><div class="tl-date"><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')}</span></div>
      <div class="grow">${chipsHtml(summarize(e).slice(0, 8))}${e.note ? `<div class="tl-note">${esc(e.note.length > 280 ? e.note.slice(0, 280) + '…' : e.note)}</div>` : ''}</div></button>`;
  }
  if (lastMonth) html += '</div>';
  return `<div class="view">
  <div class="top"><span></span><button class="btn sm" data-a="openSheet" data-v="${C.todayISO()}">${icon('plus')}Heute</button></div>
  <h1>Tagebuch</h1>
  <input type="search" placeholder="Suchen: Notizen, Symptome, Stimmung …" data-in="jq" value="${esc(state.jq)}" aria-label="Tagebuch durchsuchen">
  ${monthsAvail.length > 1 ? `<div class="chips scroll mt"><button class="chip ${!state.jMonth ? 'on' : ''}" data-a="jMonth" data-v="">Alle</button>${monthsAvail.slice(0, 24).map(mk => `<button class="chip ${state.jMonth === mk ? 'on' : ''}" data-a="jMonth" data-v="${mk}">${fmtShortMonth(mk)} ${mk.slice(2, 4)}</button>`).join('')}</div>` : ''}
  <div id="jlist">${html || `<div class="card mt">${emptyState('note', q ? 'Keine Treffer.' : 'Hier entsteht dein persönliches Tagebuch. Jeder Eintrag – Stimmung, Symptome, Notizen – erscheint in dieser Zeitleiste.')}</div>`}
  ${list.length > shown.length ? `<p class="small muted center">${list.length - shown.length} ältere Einträge – nutze Suche oder Monatsfilter.</p>` : ''}</div>
  </div>`;
}

/* ---------- Mehr ---------- */
function li(ic, title, sub, to) { return `<button class="li" data-a="go" data-v="${to}"><span class="ic">${icon(ic)}</span><span class="grow"><div>${title}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</span>${icon('chev', 'chev')}</button>`; }
function viewMore() {
  const s = S();
  return `<div class="view"><h1>Mehr</h1>
  <div class="sectitle">Gesundheit</div><div class="list">
    ${li('doc', 'Gesundheitsbericht', 'Zusammenfassung als PDF für dich oder die Ärztin', 'more/report')}
    ${li('book', 'Wissen', 'Zyklus, PMS, Beschwerden – mit Quellen', 'more/library')}
    ${li('bell', 'Erinnerungen', 'Periode, Pille, Termine, Kalender-Export', 'more/reminders')}
  </div>
  <div class="sectitle">Persönlich</div><div class="list">
    ${li('sliders', 'Tracking anpassen', 'Kategorien, eigene Symptome, Medikamente', 'more/tracking')}
    ${li('cycle', 'Zyklus-Einstellungen', `Startwerte: ${s.cycleLen} / ${s.periodLen} Tage`, 'more/cycle')}
    ${li('users', 'Mit Partner teilen', 'Nur was du auswählst, nur auf Knopfdruck', 'more/partner')}
  </div>
  <div class="sectitle">Privatsphäre & Daten</div><div class="list">
    ${li('lock', 'Code & Verschlüsselung', state.session ? 'Aktiv – Daten verschlüsselt' : 'Aus', 'more/privacy')}
    ${li('shield', 'Backup & Daten', s.lastBackup ? 'Letztes Backup: ' + fmt(s.lastBackup, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Noch kein Backup', 'more/data')}
    ${li('palette', 'Darstellung', { system: 'Wie iPhone', light: 'Hell', dark: 'Dunkel' }[state.prefs.theme], 'more/look')}
    ${li('info', 'Über die App', 'Version ' + VERSION + ' · Datenschutz · Grenzen', 'more/about')}
  </div></div>`;
}

function stepper(k, label, hint, val) {
  return `<div class="kv"><span>${label}${hint ? `<br><span class="xs muted">${hint}</span>` : ''}</span><div class="stepper"><button class="iconbtn" data-a="step" data-k="${k}" data-d="-1" aria-label="${label} verringern">−</button><span class="v" style="min-width:44px">${val}</span><button class="iconbtn" data-a="step" data-k="${k}" data-d="1" aria-label="${label} erhöhen">+</button></div></div>`;
}
function sw(action, on, label, sub, extra = '') {
  return `<div class="swrow"><span>${label}${sub ? `<br><span class="xs muted">${sub}</span>` : ''}</span><label class="switch"><input type="checkbox" data-a="${action}" ${extra} ${on ? 'checked' : ''} aria-label="${esc(label)}"><span></span></label></div>`;
}

function viewCycleSettings() {
  const s = S(), m = model();
  return `<div class="view">${backHead('Zyklus-Einstellungen')}
  <div class="card"><h2>Profil</h2><input type="text" data-set="name" value="${esc(s.name)}" placeholder="Dein Name" autocomplete="off" aria-label="Name"></div>
  <div class="card"><h2>Startwerte</h2>
    ${stepper('cycleLen', 'Zykluslänge', 'Gilt, bis echte Zyklen erfasst sind', s.cycleLen)}
    ${stepper('periodLen', 'Periodendauer', 'Gilt, bis echte Perioden erfasst sind', s.periodLen)}
    ${stepper('luteal', 'Lutealphase', 'Tage zwischen Eisprung und Periode', s.luteal)}
  </div>
  <div class="card"><h2>So rechnet die App gerade</h2>
    <div class="kv"><span>Zykluslänge</span><b>${tage(m.avgCycle)}${m.nUsed ? ` <span class="muted small">aus ${m.nUsed} Zyklen</span>` : ' <span class="muted small">Startwert</span>'}</b></div>
    <div class="kv"><span>Periodendauer</span><b>${tage(m.avgPeriod)}</b></div>
    <div class="kv"><span>Lutealphase</span><b>${tage(m.luteal)} <span class="muted small">${m.lutealSource === 'temp' ? 'aus Temperatur' : 'Einstellung'}</span></b></div>
    <p class="small muted mt mb0">Vorhersagen nutzen einen gewichteten Durchschnitt deiner letzten bis zu 12 Zyklen (neuere zählen stärker). Ausreißer – z. B. eine vergessene Periode – werden erkannt und nicht mitgerechnet. Der angezeigte Spielraum ergibt sich aus der Schwankung deiner Zyklen.</p>
  </div></div>`;
}

function viewTracking() {
  const s = S();
  return `<div class="view">${backHead('Tracking anpassen')}
  <div class="card"><h2>Kategorien</h2><p class="small muted">Was du ausschaltest, verschwindet aus dem Eintragen. Bereits gespeicherte Daten bleiben erhalten.</p>
    ${T.CATEGORIES.map(c => sw('toggleCat', cat(c.id), c.label, c.desc, `data-k="${c.id}"`)).join('')}
  </div>
  <div class="card"><h2>Eigene Symptome</h2>
    <div class="chips">${s.customSymptoms.map(x => `<button class="chip" data-a="rmCustom" data-v="${esc(x)}" aria-label="${esc(x)} entfernen">${esc(x)} <span class="x">${icon('x', '')}</span></button>`).join('') || '<span class="small muted">Noch keine.</span>'}</div>
    <div class="row mt"><input type="text" id="newCustom" placeholder="z. B. Kiefer verspannt" maxlength="40" aria-label="Neues Symptom"><button class="btn sm" data-a="addCustom">Hinzufügen</button></div>
  </div>
  <div class="card"><h2>Pille</h2>
    ${sw('togglePill', s.pill, 'Pille abhaken', 'Erscheint auf „Heute“ und im Tagebuch')}
    ${s.pill ? `<div class="kv"><span>Einnahmezeit</span><input type="time" data-set="pillTime" value="${esc(s.pillTime || '')}" style="width:auto"></div>` : ''}
  </div>
  <div class="card"><h2>Medikamente</h2><p class="small muted">Lege Medikamente oder Nahrungsergänzung an, um sie täglich abzuhaken.</p>
    ${s.meds.map((md, i) => `<div class="kv"><span>${esc(md.name)}<br><span class="xs muted">${md.daily ? 'Täglich' + (md.time ? ' um ' + md.time : '') : 'Bei Bedarf'}</span></span><button class="iconbtn" data-a="rmMed" data-v="${i}" aria-label="${esc(md.name)} entfernen">${icon('trash')}</button></div>`).join('')}
    <label class="f" for="medName">Neues Medikament</label><input type="text" id="medName" placeholder="z. B. Eisen, Ibuprofen" maxlength="40">
    <div class="row mt"><label class="row grow small"><input type="checkbox" id="medDaily" style="width:20px;height:20px;min-height:0"> täglich</label><input type="time" id="medTime" style="width:auto" aria-label="Uhrzeit"><button class="btn sm" data-a="addMed">Hinzufügen</button></div>
  </div></div>`;
}

function viewReminders() {
  const s = S(), r = s.reminders, ics = state.ics;
  const rep = { none: 'Einmalig', daily: 'Täglich', weekly: 'Wöchentlich', monthly: 'Monatlich' };
  return `<div class="view">${backHead('Erinnerungen')}
  <div class="card"><h2>In der App</h2>
    ${stepper('periodBefore', 'Periode ankündigen', 'Tage vorher auf „Heute“', r.periodBefore)}
    <p class="small muted mt mb0">Pille und tägliche Medikamente erscheinen auf „Heute“, bis du sie abhakst.</p>
  </div>
  <div class="card"><h2>Eigene Erinnerungen</h2>
    ${(r.custom || []).map(c => `<div class="kv"><span>${esc(c.text)}<br><span class="xs muted">${rep[c.repeat || 'none']}${c.date ? ' · ab ' + fmt(c.date, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}${c.time ? ' · ' + c.time : ''}</span></span><button class="iconbtn" data-a="rmRem" data-v="${esc(c.id)}" aria-label="Entfernen">${icon('trash')}</button></div>`).join('') || '<p class="small muted">Zum Beispiel Frauenarzttermin, Kontrolle, Ring wechseln.</p>'}
    <label class="f" for="remText">Text</label><input type="text" id="remText" placeholder="z. B. Frauenarzttermin" maxlength="60">
    <div class="meas mt"><div><label for="remDate">Datum</label><input type="date" id="remDate" value="${C.todayISO()}"></div><div><label for="remTime">Uhrzeit</label><input type="time" id="remTime"></div>
    <div><label for="remRep">Wiederholen</label><select id="remRep">${Object.entries(rep).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
    <button class="btn sec mt" data-a="addRem">${icon('plus')}Erinnerung hinzufügen</button>
  </div>
  <div class="card"><h2>Benachrichtigungen aufs iPhone</h2>
    <p class="small muted">Eine Web-App kann ohne Server keine Push-Nachrichten senden, wenn sie geschlossen ist. Die Lösung: Übertrage deine Erinnerungen in die <b>iPhone-Kalender-App</b> – die erinnert dich dann zuverlässig, auch offline.</p>
    ${sw('icsOpt', ics.periods, 'Erwartete Perioden (nächste 6)', `Mit Erinnerung ${r.periodBefore} Tage vorher`, 'data-k="periods"')}
    ${sw('icsOpt', ics.fertile, 'Fruchtbare Fenster (Schätzung)', '', 'data-k="fertile"')}
    ${s.pill ? sw('icsOpt', ics.pill, 'Tägliche Pillen-Erinnerung', s.pillTime ? 'um ' + s.pillTime : '', 'data-k="pill"') : ''}
    ${s.meds.some(x => x.daily) ? sw('icsOpt', ics.meds, 'Tägliche Medikamente', '', 'data-k="meds"') : ''}
    ${sw('icsOpt', ics.log, 'Tägliche Eintrage-Erinnerung', '', 'data-k="log"')}
    ${ics.log ? `<div class="kv"><span>Uhrzeit</span><input type="time" data-setr="logTime" value="${esc(r.logTime || '21:00')}" style="width:auto"></div>` : ''}
    ${(r.custom || []).length ? sw('icsOpt', ics.custom, 'Eigene Erinnerungen', '', 'data-k="custom"') : ''}
    <button class="btn mt" data-a="exportIcs">${icon('cal')}In Kalender übernehmen</button>
    <p class="xs muted mt mb0">Es wird eine Kalenderdatei (.ics) erstellt. Wähle im Teilen-Menü „Kalender“ bzw. öffne sie, um die Termine hinzuzufügen. Vorhersagen ändern sich mit neuen Daten – exportiere gelegentlich neu und lösche alte Einträge im Kalender.</p>
  </div></div>`;
}

function viewReport() {
  const m = model(), t = m.t;
  const r = state.reportRange, from = r === 'cycle' ? (m.cycles.length ? m.cycles[m.cycles.length - 1].start : (m.cur ? m.cur.start : t)) : rangeFrom(r, t);
  const R = C.reportData(state.db, m, from, t);
  const ins = C.insights(state.db, m).filter(i => i.type !== 'notice');
  const per = R.periods;
  return `<div class="view report">
  <div class="noprint">${backHead('Gesundheitsbericht')}
  <div class="seg">${[['cycle', 'Letzter Zyklus'], ['3', '3 Mon.'], ['6', '6 Mon.'], ['12', '1 Jahr']].map(([k, l]) => `<button class="${r === k ? 'on' : ''}" data-a="repRange" data-v="${k}">${l}</button>`).join('')}</div>
  <div class="btnrow mt"><button class="btn" data-a="print">${icon('doc')}PDF</button><button class="btn sec" data-a="shareReport">${icon('share')}Als Datei</button></div>
  <p class="xs muted mt">„Als PDF“ öffnet den Druckdialog – dort „Teilen“ → „In Dateien sichern“ als PDF. Falls er sich nicht öffnet, nutze „Als Datei“ und öffne sie in Safari.</p></div>
  <div id="report">
  <div class="card"><div class="row"><div style="width:36px;height:36px">${logo()}</div><div><h2 style="margin:0">Zyklusbericht${S().name ? ' – ' + esc(S().name) : ''}</h2><div class="small muted">${fmt(from, { day: 'numeric', month: 'long', year: 'numeric' })} – ${fmt(t, { day: 'numeric', month: 'long', year: 'numeric' })}</div></div></div></div>
  <div class="card"><h2>Überblick</h2>
    <div class="kv"><span>Ø Zykluslänge (gesamt)</span><b>${m.nUsed ? tage(m.avgCycle) + ' (± ' + dec(m.sd) + ')' : '–'}</b></div>
    <div class="kv"><span>Spanne der letzten Zyklen</span><b>${m.lens.length ? Math.min(...m.lens.slice(-6)) + '–' + Math.max(...m.lens.slice(-6)) + ' Tage' : '–'}</b></div>
    <div class="kv"><span>Ø Periodendauer</span><b>${tage(m.avgPeriod)}</b></div>
    <div class="kv"><span>Perioden im Zeitraum</span><b>${per.length}</b></div>
    <div class="kv"><span>Tage mit Einträgen</span><b>${R.logged}</b></div>
    ${m.cur ? `<div class="kv"><span>Aktueller Zyklus</span><b>seit ${fmt(m.cur.start, { day: 'numeric', month: 'short' })} · Tag ${m.cycleDay}</b></div><div class="kv"><span>Nächste Periode (Schätzung)</span><b>${fmt(m.nextRange[0])} – ${fmt(m.nextRange[1])}</b></div>` : ''}
  </div>
  <div class="card"><h2>Perioden</h2>${per.length ? `<table class="tbl"><thead><tr><th>Beginn</th><th>Dauer</th><th>Zykluslänge</th><th>Ø Schmerz</th></tr></thead><tbody>${per.map(p => {
    const c = m.cycles.find(x => x.start === p.start);
    const pv = []; for (let d = p.start; d <= p.end; d = C.add(d, 1)) { const e = state.db.days[d]; if (e && typeof e.pain === 'number') pv.push(e.pain); }
    return `<tr><td>${fmt(p.start, { day: 'numeric', month: 'short', year: '2-digit' })}</td><td>${tage(C.diff(p.start, p.end) + 1)}</td><td>${c ? tage(c.len) : 'läuft'}</td><td>${pv.length ? dec(C.mean(pv)) + '/3' : '–'}</td></tr>`;
  }).join('')}</tbody></table>` : '<p class="small muted mb0">Keine Perioden im Zeitraum.</p>'}</div>
  <div class="card"><h2>Symptome</h2>${R.symptoms.length ? `<table class="tbl"><thead><tr><th>Symptom</th><th>Tage</th><th>häufigste Phase</th></tr></thead><tbody>${R.symptoms.slice(0, 12).map(s => { const p = C.PHASES.slice().sort((a, b) => s[b] - s[a])[0]; return `<tr><td>${esc(s.name)}</td><td>${s.total}</td><td>${T.PHASE[p].name}</td></tr>`; }).join('')}</tbody></table>` : '<p class="small muted mb0">Keine Symptome eingetragen.</p>'}
    ${R.pms.list.length ? `<p class="small mt mb0"><b>Vor der Periode gehäuft:</b> ${R.pms.list.slice(0, 5).map(x => `${esc(x.name)} (${x.cycles}/${x.of} Zyklen)`).join(', ')}</p>` : ''}</div>
  ${R.moods.length ? `<div class="card"><h2>Stimmung</h2><p class="mb0">${R.moods.slice(0, 8).map(x => `${esc(x.name)} (${x.total}×)`).join(' · ')}</p></div>` : ''}
  ${R.months.length ? `<div class="card"><h2>Verlauf je Monat</h2><table class="tbl"><thead><tr><th>Monat</th><th>Periode</th><th>Schmerz</th><th>Energie</th><th>Schlaf</th></tr></thead><tbody>${R.months.map(x => `<tr><td>${fmtMonth(x.key)}</td><td>${x.periodDays || '–'}</td><td>${dec(x.pain)}</td><td>${dec(x.energy)}</td><td>${x.sleep == null ? '–' : dec(x.sleep) + ' h'}</td></tr>`).join('')}</tbody></table><p class="xs muted mt mb0">Schmerz 0–3, Energie 1–5 (Durchschnitt der Einträge).</p></div>` : ''}
  ${ins.length ? `<div class="card"><h2>Beobachtungen</h2>${ins.slice(0, 6).map(i => `<p class="small"><b>${esc(i.title)}</b> (${TYPE_LABEL[i.type]}): ${esc(i.text)}</p>`).join('')}</div>` : ''}
  ${R.notes.length ? `<div class="card"><h2>Notizen</h2>${R.notes.slice(-15).map(([d, e]) => `<p class="small"><b>${fmt(d, { day: 'numeric', month: 'short' })}:</b> ${esc(e.note)}</p>`).join('')}</div>` : ''}
  <p class="xs muted">Erstellt am ${fmt(t, { day: 'numeric', month: 'long', year: 'numeric' })} mit „Haiwoche“. Selbst erfasste Daten; Eisprung- und Periodenangaben sind Schätzungen. Keine Diagnose.</p>
  </div></div>`;
}

function viewPartner() {
  const m = model(), p = state.partner;
  const txt = C.partnerSummary(state.db, m, p);
  return `<div class="view">${backHead('Mit Partner teilen')}
  <div class="card tint"><p class="small mb0"><b>Du entscheidest.</b> Es wird nichts automatisch geteilt und nichts gespeichert. Du wählst aus, was im Text steht, und verschickst ihn selbst – z. B. per WhatsApp oder iMessage.</p></div>
  <div class="card"><h2>Was soll drinstehen?</h2>
    ${sw('partnerOpt', p.phase, 'Aktuelle Phase', '', 'data-k="phase"')}
    ${sw('partnerOpt', p.next, 'Nächste Periode (Zeitraum)', '', 'data-k="next"')}
    ${sw('partnerOpt', p.mood, 'Stimmung heute', '', 'data-k="mood"')}
    ${sw('partnerOpt', p.symptoms, 'Symptome heute', '', 'data-k="symptoms"')}
    ${sw('partnerOpt', p.energy, 'Energie heute', '', 'data-k="energy"')}
    ${sw('partnerOpt', p.note, 'Persönliche Nachricht', '', 'data-k="note"')}
    ${p.note ? `<input type="text" class="mt" data-partner="noteText" value="${esc(p.noteText)}" placeholder="z. B. Bring bitte Schokolade mit 🍫" maxlength="140">` : ''}
  </div>
  <div class="card"><h2>Vorschau</h2><pre style="white-space:pre-wrap;font:inherit;margin:0" id="partnerPreview">${esc(txt)}</pre></div>
  <button class="btn" data-a="sharePartner">${icon('share')}Teilen</button>
  <p class="xs muted mt">Sex, Temperatur, Ausfluss und Notizen werden nie in diesen Text aufgenommen.</p>
  </div>`;
}

function viewPrivacy() {
  const enc = !!state.session;
  return `<div class="view">${backHead('Code & Verschlüsselung')}
  <div class="card"><div class="row" style="margin-bottom:12px"><span class="ic" style="color:${enc ? 'var(--foll)' : 'var(--muted)'}">${icon(enc ? 'lock' : 'shield')}</span><b>${enc ? 'Code-Sperre aktiv, Daten verschlüsselt' : 'Keine Code-Sperre'}</b></div>
    <p class="small muted">${enc ? 'Deine Einträge sind auf dem iPhone mit AES-256 verschlüsselt. Ohne den Code können sie nicht gelesen werden – auch nicht aus einem Backup der App-Daten.' : 'Mit einem 4-stelligen Code wird die App gesperrt und alle Einträge werden verschlüsselt gespeichert.'}</p>
    <button class="btn ${enc ? 'sec' : ''}" data-a="setPin">${enc ? 'Code ändern' : 'Code einrichten'}</button>
    ${enc ? '<button class="btn danger mt" data-a="removePin">Code entfernen</button>' : ''}
  </div>
  ${enc ? `<div class="card"><h2>Automatisch sperren</h2><div class="seg">${[[0, 'Sofort'], [30, '30 Sek.'], [300, '5 Min.']].map(([v, l]) => `<button class="${state.prefs.lockAfter === v ? 'on' : ''}" data-a="lockAfter" data-v="${v}">${l}</button>`).join('')}</div><p class="xs muted mt mb0">Nachdem die App in den Hintergrund gewechselt ist.</p></div>` : ''}
  <div class="card"><h2>Gut zu wissen</h2><ul class="small muted" style="padding-left:18px;margin:0">
    <li>Es gibt keinen Server und keinen Account – niemand außer dir hat Zugriff.</li>
    <li>Ein 4-stelliger Code schützt gut gegen neugierige Blicke. Gegen gezielte technische Angriffe auf ein entsperrtes Gerät ist er nur begrenzt sicher.</li>
    <li><b>Code vergessen = Daten weg.</b> Es gibt keine Wiederherstellung. Speichere regelmäßig ein Backup.</li>
  </ul></div></div>`;
}

function viewData() {
  const s = S(), n = Object.keys(state.db.days).length;
  return `<div class="view">${backHead('Backup & Daten')}
  <div class="card"><h2>Backup</h2>
    <p class="small muted">${n} Tage mit Einträgen · Letztes Backup: <b>${s.lastBackup ? fmt(s.lastBackup, { day: 'numeric', month: 'long', year: 'numeric' }) : 'noch nie'}</b>. Speichere es in „Dateien“ oder iCloud Drive – z. B. für ein neues iPhone.</p>
    <button class="btn" data-a="export">${icon('down')}Backup speichern</button>
    <button class="btn sec mt" data-a="import">${icon('up')}Backup wiederherstellen</button>
    <p class="xs muted mt mb0">Das Backup ist eine lesbare JSON-Datei, also nicht verschlüsselt. Bewahre es sicher auf.</p>
  </div>
  <div class="card"><h2>Export für Tabellen</h2><p class="small muted">Alle Einträge als CSV, z. B. für Numbers oder Excel.</p><button class="btn sec" data-a="exportCsv">${icon('down')}CSV exportieren</button></div>
  <div class="card"><h2>Alles löschen</h2><p class="small muted">Entfernt alle Einträge und Einstellungen unwiderruflich von diesem Gerät.</p><button class="btn danger" data-a="wipe">${icon('trash')}Alle Daten löschen</button></div>
  </div>`;
}

function viewLook() {
  return `<div class="view">${backHead('Darstellung')}
  <div class="card"><h2>Design</h2><div class="seg">${[['system', 'Wie iPhone'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, l]) => `<button class="${state.prefs.theme === k ? 'on' : ''}" data-a="theme" data-v="${k}">${l}</button>`).join('')}</div></div>
  <div class="card"><h2>Farben im Kalender</h2>
    <div class="kv"><span class="row"><i class="lg" style="background:var(--mens)"></i>Periode</span><span class="small muted">eingetragen</span></div>
    <div class="kv"><span class="row"><i class="lg" style="border:1.5px dashed var(--mens)"></i>Erwartete Periode</span><span class="small muted">Schätzung</span></div>
    <div class="kv"><span class="row"><i class="lg" style="background:var(--foll-soft);border:1px solid var(--foll)"></i>Follikelphase</span><span class="small muted">im Ring</span></div>
    <div class="kv"><span class="row"><i class="lg" style="background:var(--fert-soft);border:1px solid var(--fert)"></i>Fruchtbares Fenster</span><span class="small muted">Schätzung</span></div>
    <div class="kv"><span class="row"><i class="lg" style="background:var(--lut-soft);border:1px solid var(--lut)"></i>Lutealphase</span><span class="small muted">im Ring</span></div>
  </div></div>`;
}

function viewLibrary() {
  const tags = [...new Set(T.ARTICLES.map(a => a.tag))];
  return `<div class="view">${backHead('Wissen')}
  <p class="small muted">Allgemeine Gesundheitsinformationen mit Quellenangaben. Sie ersetzen keine ärztliche Beratung.</p>
  ${tags.map(tag => `<div class="sectitle">${tag}</div><div class="list">${T.ARTICLES.filter(a => a.tag === tag).map(a => li('book', a.title, a.mins + ' Min. Lesezeit', 'more/article/' + a.id)).join('')}</div>`).join('')}
  </div>`;
}
function viewArticle(id) {
  const a = T.ARTICLES.find(x => x.id === id);
  if (!a) return viewLibrary();
  return `<div class="view">${backHead(a.title, 'more/library')}
  <div class="card article"><span class="badge b-education">Wissen · ${a.tag}</span><div class="mt">${a.body}</div>
  <div class="src"><b>Quellen</b>${a.sources.map(k => T.SOURCES[k]).map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a>`).join('')}<div class="mt">Stand der Quellen: Abruf 2026. Online-Links benötigen Internet.</div></div></div>
  </div>`;
}

function viewAbout() {
  return `<div class="view">${backHead('Über die App')}
  <div class="card center"><div style="width:64px;height:64px;margin:0 auto">${logo()}</div><h2 style="margin:8px 0 2px">Haiwoche</h2><p class="small mb0" style="color:var(--sel)">Keine Panik, nur Zyklus.</p><p class="small muted mb0">Version ${VERSION} · mit ❤️ gebaut</p></div>
  <div class="card"><h2>Datenschutz</h2><ul class="small" style="padding-left:18px;margin:0">
    <li>Alle Daten bleiben auf diesem Gerät (lokaler Speicher), optional verschlüsselt.</li>
    <li>Keine Accounts, keine Server, keine Werbung, keine Analyse-Tools, keine Drittanbieter.</li>
    <li>Die App funktioniert vollständig offline. Nur Quellen-Links in „Wissen“ öffnen Webseiten.</li>
  </ul></div>
  <div class="card"><h2>Wichtige Hinweise</h2><ul class="small" style="padding-left:18px;margin:0">
    <li>Vorhersagen zu Periode, Eisprung und fruchtbaren Tagen sind statistische Schätzungen. Sie bestätigen keinen Eisprung und sind <b>kein Verhütungsmittel</b>.</li>
    <li>Die App stellt keine Diagnosen. Erkenntnisse beschreiben Muster in deinen Einträgen, keine Ursachen.</li>
    <li>Bei hormoneller Verhütung sind Eisprung-Schätzungen nicht aussagekräftig.</li>
  </ul></div>
  <div class="card"><h2>Grenzen</h2><ul class="small" style="padding-left:18px;margin:0">
    <li>Push-Benachrichtigungen sind ohne Server nicht möglich – nutze den Kalender-Export unter „Erinnerungen“.</li>
    <li>Daten werden nicht automatisch zwischen Geräten synchronisiert – nutze „Backup“.</li>
    <li>Wenn iOS den Website-Speicher löscht (z. B. App vom Home-Bildschirm entfernt), sind die Daten weg. Daher: regelmäßig Backups.</li>
  </ul></div></div>`;
}

/* ---------- Tages-Editor (Sheet) ---------- */
function chipGroup(field, options, val, multi, cls = '') {
  return `<div class="chips">${options.map(o => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    const on = multi ? (val || []).includes(v) : val === v;
    const em = T.EMOJI[v] ? `<span class="em" aria-hidden="true">${T.EMOJI[v]}</span>` : '';
    return `<button class="chip ${cls} ${on ? 'on' : ''}" data-a="chip" data-f="${field}" data-v="${esc(v)}" data-m="${multi ? 1 : 0}" aria-pressed="${on}">${em}${esc(l)}</button>`;
  }).join('')}</div>`;
}
function scaleGroup(field, labels, val, start = 1) {
  return `<div class="scale s${labels.length}">${labels.map((l, i) => `<button class="${val === i + start ? 'on' : ''}" data-a="scale" data-f="${field}" data-v="${i + start}" aria-pressed="${val === i + start}" aria-label="${l}"><b>${i + start}</b>${l}</button>`).join('')}</div>`;
}
const num = v => v == null ? '' : String(v).replace('.', ',');
function renderSheet(keep = false) {
  const el = $('#sheet');
  if (!state.sheetDay || !state.db) { el.innerHTML = ''; document.body.style.overflow = ''; return; }
  const prevScroll = keep && el.querySelector('.sheet') ? el.querySelector('.sheet').scrollTop : 0;
  document.body.style.overflow = 'hidden';
  const d = state.sheetDay, m = model(), inf = C.dayInfo(m, state.db.days, d), e = state.db.days[d] || {}, s = S();
  const sub = [inf.cycleDay ? 'Zyklustag ' + inf.cycleDay : '', inf.phase ? T.PHASE[inf.phase].name : ''].filter(Boolean).join(' · ');
  const symIn = g => cat(g) ? T.SYMPTOM_GROUPS[g] : [];
  const has = list => (e.symptoms || []).filter(x => list.includes(x));
  const join = a => a.slice(0, 3).join(', ') + (a.length > 3 ? ` +${a.length - 3}` : '');
  const sect = (key, title, value, body) => `<section class="sect ${value ? 'done' : ''}"><div class="sect-h"><span class="em" aria-hidden="true">${T.SECTION_EMOJI[key]}</span><div class="grow"><b>${title}</b><div class="v">${esc(value || '')}</div></div><span class="ok" aria-label="${value ? 'ausgefüllt' : 'leer'}">${icon('check')}</span></div>${body}</section>`;
  let body = '';
  body += sect('flow', 'Periode', e.flow ? T.FLOW_LABEL[e.flow] : '', chipGroup('flow', [...T.FLOW, ['none', 'Keine']], e.flow, false, 'mens'));
  if (cat('pain')) { const v = [typeof e.pain === 'number' ? 'Schmerz: ' + T.PAIN[e.pain] : '', join(has(symIn('pain')))].filter(Boolean).join(' · '); body += sect('pain', 'Schmerzen', v, scaleGroup('pain', T.PAIN, e.pain, 0) + '<div style="height:14px"></div>' + chipGroup('symptoms', symIn('pain'), e.symptoms, true)); }
  if (cat('mood')) body += sect('mood', 'Stimmung', join(e.moods || []), chipGroup('moods', T.MOODS, e.moods, true));
  if (cat('energy')) {
    body += sect('energy', 'Energie', e.energy ? T.ENERGY[e.energy - 1] : '', scaleGroup('energy', T.ENERGY, e.energy));
    body += sect('stress', 'Stress', e.stress ? T.STRESS[e.stress - 1] : '', scaleGroup('stress', T.STRESS, e.stress));
  }
  if (cat('sleep')) { const v = [typeof e.sleep === 'number' ? dec(e.sleep, e.sleep % 1 ? 1 : 0) + ' h' : '', e.sleepQ ? T.SLEEPQ[e.sleepQ - 1] : '', join(has(symIn('sleep')))].filter(Boolean).join(' · '); body += sect('sleep', 'Schlaf', v, `${scaleGroup('sleepQ', T.SLEEPQ, e.sleepQ)}<div class="row mt"><label for="in-sleep" class="small muted" style="flex:none">Stunden</label><input id="in-sleep" type="text" inputmode="decimal" data-num="sleep" value="${num(e.sleep)}" placeholder="7,5" style="max-width:120px"></div><div style="height:12px"></div>${chipGroup('symptoms', symIn('sleep'), e.symptoms, true)}`); }
  if (cat('body')) body += sect('body', 'Körper', join(has(symIn('body'))), chipGroup('symptoms', symIn('body'), e.symptoms, true));
  if (cat('digestion')) { const v = [join(has(symIn('digestion'))), e.appetite ? 'Appetit: ' + e.appetite : '', (e.cravings || []).length ? 'Lust auf ' + join(e.cravings) : ''].filter(Boolean).join(' · '); body += sect('digestion', 'Verdauung & Appetit', v, chipGroup('symptoms', symIn('digestion'), e.symptoms, true) + '<p class="xs muted" style="margin:14px 0 8px">Appetit</p>' + chipGroup('appetite', T.APPETITE, e.appetite, false) + '<p class="xs muted" style="margin:14px 0 8px">Lust auf …</p>' + chipGroup('cravings', T.CRAVINGS, e.cravings, true)); }
  if (cat('skin')) body += sect('skin', 'Haut & Haare', join(has(symIn('skin'))), chipGroup('symptoms', symIn('skin'), e.symptoms, true));
  if (s.customSymptoms.length) body += sect('custom', 'Eigene Symptome', join(has(s.customSymptoms)), chipGroup('symptoms', s.customSymptoms, e.symptoms, true));
  if (cat('activity')) body += sect('activity', 'Bewegung', join(e.activity || []), chipGroup('activity', T.ACTIVITY, e.activity, true));
  if (cat('mucus')) body += sect('mucus', 'Zervixschleim / Ausfluss', e.discharge || '', chipGroup('discharge', T.DISCHARGE, e.discharge, false, 'fert'));
  if (cat('sex')) body += sect('sex', 'Sex & Lust', [e.sex, e.libido].filter(Boolean).join(' · '), chipGroup('sex', T.SEX, e.sex, false) + '<div style="height:8px"></div>' + chipGroup('libido', T.LIBIDO, e.libido, false));
  if (cat('meds') && (s.pill || s.meds.length || e.pill || (e.meds || []).length)) {
    const medNames = [...new Set([...s.meds.map(x => x.name), ...(e.meds || [])])];
    body += sect('meds', 'Medikamente', [e.pill ? 'Pille ✓' : '', join(e.meds || [])].filter(Boolean).join(' · '), `${s.pill || e.pill ? `<div class="swrow"><span>Pille genommen</span><label class="switch"><input type="checkbox" data-a="pillDay" ${e.pill ? 'checked' : ''} aria-label="Pille genommen"><span></span></label></div>` : ''}${medNames.length ? '<div style="height:10px"></div>' + chipGroup('meds', medNames, e.meds, true) : ''}`);
  }
  const meas = [];
  if (cat('temp')) meas.push(`<div><label for="in-temp">Basaltemp. °C</label><input id="in-temp" type="text" inputmode="decimal" data-num="temp" value="${num(e.temp)}" placeholder="36,50"></div>`);
  if (cat('weight')) meas.push(`<div><label for="in-weight">Gewicht kg</label><input id="in-weight" type="text" inputmode="decimal" data-num="weight" value="${num(e.weight)}" placeholder="–"></div>`);
  if (meas.length) body += sect('meas', 'Messwerte', [typeof e.temp === 'number' ? dec(e.temp, 2) + ' °C' : '', typeof e.weight === 'number' ? dec(e.weight) + ' kg' : ''].filter(Boolean).join(' · '), `<div class="meas">${meas.join('')}</div>`);
  if (cat('notes')) body += sect('notes', 'Notiz', e.note ? 'Gespeichert' : '', `<textarea data-note placeholder="Wie war dein Tag? Was ist dir aufgefallen?" aria-label="Notiz">${esc(e.note)}</textarea>`);
  if (C.hasData(e)) body += `<button class="btn danger mt2" data-a="clearDay">${icon('trash')}Eintrag löschen</button>`;
  const canNext = d < m.t;
    el.innerHTML = `<div class="overlay" data-a="closeBg" ${keep ? 'style="animation:none"' : ''}><div class="sheet" role="dialog" aria-modal="true" aria-label="Eintrag ${fmtLong(d)}" ${keep ? 'style="animation:none"' : ''}>
    <div class="sheet-h"><div class="grab"></div>
    <div class="row between"><div class="dnav"><button class="iconbtn" data-a="sheetNav" data-d="-1" aria-label="Vorheriger Tag">${icon('left')}</button><button class="iconbtn" data-a="sheetNav" data-d="1" aria-label="Nächster Tag" ${canNext ? '' : 'disabled style="opacity:.3"'}>${icon('right')}</button></div>
    <div class="grow center"><div style="font:700 19px var(--font-round)">${d === m.t ? 'Heute' : fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}</div><div class="xs muted">${sub}</div></div>
    <span style="width:86px"></span></div></div>
    ${body}
    <div class="sheet-foot"><button class="btn" data-a="close">${icon('check')}Fertig</button><p class="xs muted center" style="margin:8px 0 0">Alles wird sofort gespeichert.</p></div>
  </div></div>`;
  if (keep) el.querySelector('.sheet').scrollTop = prevScroll;
}

/* ---------- Code-Sperre ---------- */
let pin = { mode: null, buf: '', first: '', msg: '', busy: false };
function renderLock(shake) {
  const el = $('#lock');
  if (!pin.mode) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const unlock = pin.mode.startsWith('unlock');
  const title = unlock ? 'Code eingeben' : pin.mode === 'set1' ? 'Neuen Code wählen' : 'Code wiederholen';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', unlock ? 'forgot' : 'cancel', '0', 'del'];
  el.innerHTML = `<div style="width:64px;height:64px">${logo()}</div>
    <div style="font-size:20px;font-weight:650;margin-top:10px">${title}</div>
    <div class="small muted" style="min-height:20px;margin-top:4px" role="status">${pin.busy ? 'Wird entschlüsselt …' : pin.msg}</div>
    ${pin.busy ? '<div style="margin:30px 0 54px"><div class="spinner"></div></div>' : `<div class="pdots ${shake ? 'shake' : ''}" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${i < pin.buf.length ? 'on' : ''}"></i>`).join('')}</div>`}
    <div class="keypad" ${pin.busy ? 'style="opacity:.4;pointer-events:none"' : ''}>${keys.map(k => k === 'del' ? `<button class="key t" data-a="key" data-v="del" aria-label="Löschen">${icon('left')}</button>`
      : k === 'cancel' ? `<button class="key t" data-a="key" data-v="cancel">Abbrechen</button>`
      : k === 'forgot' ? `<button class="key t" data-a="key" data-v="forgot">Vergessen?</button>`
      : `<button class="key" data-a="key" data-v="${k}">${k}</button>`).join('')}</div>`;
}
async function onKey(v) {
  if (pin.busy) return;
  if (v === 'cancel') { pin = { mode: null, buf: '', first: '', msg: '' }; renderLock(); return; }
  if (v === 'forgot') {
    if (confirm('Ohne Code können die Daten nicht entschlüsselt werden. Möchtest du ALLE Daten löschen und neu beginnen?') && confirm('Wirklich alles löschen? Das kann nicht rückgängig gemacht werden.')) {
      St.wipeAll(); state.db = null; state.session = null; pin = { mode: null, buf: '', first: '', msg: '' }; renderLock(); render();
    }
    return;
  }
  if (v === 'del') { pin.buf = pin.buf.slice(0, -1); renderLock(); return; }
  if (pin.buf.length >= 4) return;
  pin.buf += v; renderLock();
  if (pin.buf.length < 4) return;
  const code = pin.buf;
  if (pin.mode === 'unlock-enc') {
    pin.busy = true; renderLock();
    const res = await St.unlockEncrypted(code).catch(() => null);
    pin.busy = false;
    if (res && res.db) { state.db = res.db; state.session = res.session; state.ver++; pin = { mode: null, buf: '', first: '', msg: '' }; renderLock(); render(); }
    else { pin.buf = ''; pin.msg = 'Falscher Code'; renderLock(true); }
  } else if (pin.mode === 'unlock-legacy') {
    if (await St.legacyHash(code) === state.db.settings.legacyPin) {
      pin.busy = true; renderLock();
      delete state.db.settings.legacyPin;
      if (St.cryptoAvailable()) { state.session = await St.newSession(code); await St.saveEncrypted(state.db, state.session); }
      else St.savePlain(state.db);
      pin = { mode: null, buf: '', first: '', msg: '' }; renderLock(); render();
      if (state.session) toast('Deine Daten sind jetzt zusätzlich verschlüsselt 🔒');
    } else { pin.buf = ''; pin.msg = 'Falscher Code'; renderLock(true); }
  } else if (pin.mode === 'set1') {
    pin.first = code; pin.buf = ''; pin.mode = 'set2'; pin.msg = ''; renderLock();
  } else if (pin.mode === 'set2') {
    if (code === pin.first) {
      if (!St.cryptoAvailable()) { pin = { mode: null, buf: '', first: '', msg: '' }; renderLock(); alert('Verschlüsselung ist nur über eine sichere Verbindung (https) verfügbar.'); return; }
      pin.busy = true; renderLock();
      state.session = await St.newSession(code);
      await saving; await St.saveEncrypted(state.db, state.session);
      pin = { mode: null, buf: '', first: '', msg: '' }; renderLock(); render(); toast('Code aktiv – Daten verschlüsselt 🔒');
    } else { pin.buf = ''; pin.mode = 'set1'; pin.msg = 'Codes stimmen nicht überein'; renderLock(true); }
  }
}
let hiddenAt = 0;
async function lockNow() {
  if (!state.session) return;
  await saving;
  state.db = null; state.session = null; memo = { ver: -1, t: '', m: null };
  state.sheetDay = null; renderSheet();
  pin = { mode: 'unlock-enc', buf: '', first: '', msg: '' }; renderLock();
  $('#main').innerHTML = ''; $('#nav').hidden = true;
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); if (state.session && state.prefs.lockAfter === 0) lockNow(); }
  else {
    if (state.session && hiddenAt && Date.now() - hiddenAt >= state.prefs.lockAfter * 1000) lockNow();
    else if (state.db && !pin.mode && memo.t !== C.todayISO()) render(); // neuer Tag
  }
});

/* ---------- Dateien ---------- */
async function shareOrDownload(name, text, type, title) {
  const file = new File([text], name, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
const importInput = $('#importFile');
importInput.addEventListener('change', async ev => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try {
    const obj = JSON.parse(await f.text());
    const data = C.migrate(obj.data || obj);
    if (!data || !data.days) throw new Error('bad');
    const n = Object.keys(data.days).length;
    if (!confirm(`Backup mit ${n} Tagen wiederherstellen? Die aktuellen Einträge auf diesem Gerät werden ersetzt.`)) return;
    delete data.settings.legacyPin;
    if (!state.db) { state.db = data; } else { state.db = data; }
    commit(); toast('Backup wiederhergestellt');
    go('today');
  } catch (e) { alert('Diese Datei ist kein gültiges Backup.'); }
});

/* ---------- Toast ---------- */
let toastT, undoFn = null;
function toast(msg, undo) {
  const t = $('#toast');
  undoFn = undo || null;
  t.innerHTML = esc(msg) + (undo ? '<button data-a="undo">Rückgängig</button>' : '');
  t.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => { t.classList.remove('show'); undoFn = null; }, undo ? 4500 : 2200);
}
function snapshot() { return structuredClone(state.db.days); }

/* ---------- Aktionen ---------- */
const A = {
  go(el) { go(el.dataset.v); },
  undo() { if (undoFn) { undoFn(); undoFn = null; $('#toast').classList.remove('show'); } },
  tip(el) { const t = document.getElementById('tip-' + el.dataset.t); if (t) t.textContent = el.dataset.tip; },
  day(el) {
    const d = el.dataset.v, r = route();
    if (r.tab === 'cal' && state.calEdit) {
      if (d > C.todayISO()) { toast('Zukünftige Tage können nicht eingetragen werden'); return; }
      const e = state.db.days[d] || {};
      setField(d, 'flow', C.isFlow(e.flow) ? null : 'medium'); commit(); return;
    }
    if (r.tab === 'cal') { state.calSel = d; render(); return; }
    if (d > C.todayISO()) { state.calSel = d; state.calMonth = d.slice(0, 7); go('cal'); return; }
    state.sheetDay = d; renderSheet();
  },
  openSheet(el) { state.sheetDay = el.dataset.v; renderSheet(); },
  close() { state.sheetDay = null; renderSheet(); render(); },
  closeBg(el, ev) { if (ev.target === el) A.close(); },
  sheetNav(el) {
    const d = C.add(state.sheetDay, Number(el.dataset.d));
    if (d > C.todayISO()) return;
    state.sheetDay = d; renderSheet(); render();
  },
  chip(el) {
    const d = state.sheetDay, f = el.dataset.f, v = el.dataset.v, multi = el.dataset.m === '1', e = state.db.days[d] || {};
    if (multi) { const set = new Set(e[f] || []); set.has(v) ? set.delete(v) : set.add(v); setField(d, f, [...set]); }
    else setField(d, f, e[f] === v ? null : v);
    commit({ silent: true }); renderSheet(true); render();
  },
  scale(el) {
    const d = state.sheetDay, f = el.dataset.f, v = Number(el.dataset.v), e = state.db.days[d] || {};
    setField(d, f, e[f] === v ? null : v); commit({ silent: true }); renderSheet(true); render();
  },
  pillDay(el) { setField(state.sheetDay, 'pill', el.checked); commit({ silent: true }); renderSheet(true); render(); },
  clearDay() {
    const d = state.sheetDay, before = snapshot();
    delete state.db.days[d]; commit(); state.sheetDay = null; renderSheet();
    toast('Eintrag gelöscht', () => { state.db.days = before; commit(); });
  },
  quick(el) {
    const t = C.todayISO(), f = el.dataset.f, v = el.dataset.v, e = state.db.days[t] || {};
    const set = new Set(e[f] || []); const on = !set.has(v); on ? set.add(v) : set.delete(v);
    setField(t, f, [...set]); commit({ silent: true });
    el.classList.toggle('on', on);
  },
  quickScale(el) {
    const t = C.todayISO(), f = el.dataset.f, v = Number(el.dataset.v), e = state.db.days[t] || {};
    setField(t, f, e[f] === v ? null : v); commit({ silent: true });
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el && e[f] !== v));
  },
  startPeriod() {
    const t = C.todayISO(), before = snapshot();
    setField(t, 'flow', 'medium'); commit();
    toast('Periode eingetragen – Vorhersagen aktualisiert', () => { state.db.days = before; commit(); });
  },
  flowToday(el) {
    const t = C.todayISO(), e = state.db.days[t] || {}, v = el.dataset.v;
    setField(t, 'flow', e.flow === v ? null : v); commit();
    if (v === 'none') toast('Periode als beendet markiert');
  },
  pillToday() { const t = C.todayISO(), e = state.db.days[t] || {}; setField(t, 'pill', !e.pill); commit(); },
  medToday(el) { const t = C.todayISO(), e = state.db.days[t] || {}; setField(t, 'meds', [...new Set([...(e.meds || []), el.dataset.v])]); commit(); },
  editPeriods() { state.calEdit = true; if (route().tab !== 'cal') go('cal'); else render(); },
  editDone() { state.calEdit = false; render(); toast('Gespeichert – Vorhersagen neu berechnet'); },
  calNav(el) { const [y, m] = state.calMonth.split('-').map(Number); state.calMonth = C.iso(new Date(y, m - 1 + Number(el.dataset.d), 1, 12)).slice(0, 7); render(); },
  calToday() { state.calMonth = C.todayISO().slice(0, 7); state.calSel = C.todayISO(); render(); },
  calFilter(el) { state.calFilter = el.dataset.v; render(); },
  range(el) { state.range = el.dataset.v; render(); },
  metric(el) { state.metric = el.dataset.v; render(); },
  repRange(el) { state.reportRange = el.dataset.v; render(); },
  jMonth(el) { state.jMonth = el.dataset.v; render(); },
  print() { window.print(); },
  async shareReport() {
    const css = await fetch('css/app.css').then(r => r.text()).catch(() => '');
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zyklusbericht</title><style>${css}</style></head><body><div id="main" style="padding:16px">${$('#report').outerHTML}</div></body></html>`;
    await shareOrDownload(`zyklusbericht-${C.todayISO()}.html`, html, 'text/html', 'Zyklusbericht');
  },
  // Onboarding
  obstep(el) { const k = el.dataset.k, lim = k === 'cycleLen' ? [18, 60] : [1, 12]; state.ob[k] = C.clamp(state.ob[k] + Number(el.dataset.d), lim[0], lim[1]); render(); },
  obToggle(el) { state.ob[el.dataset.k] = el.checked; if (el.dataset.k === 'unknownStart') render(); },
  finishOb() {
    const o = state.ob, t = C.todayISO();
    if (!o.unknownStart && !o.start) { alert('Bitte wähle den ersten Tag deiner letzten Periode – oder schalte „Weiß ich nicht mehr“ ein.'); return; }
    if (o.start > t) { alert('Das Datum liegt in der Zukunft.'); return; }
    const db = C.migrate({ settings: { name: o.name.trim(), cycleLen: o.cycleLen, periodLen: o.periodLen, pill: o.pill }, days: {} });
    db.settings.categories.sex = o.sex;
    if (!o.unknownStart) for (let i = 0; i < o.periodLen; i++) { const d = C.add(o.start, i); if (d <= t) db.days[d] = { flow: 'medium' }; }
    state.db = db; commit({ silent: true });
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
    go('today'); render();
  },
  // Einstellungen
  step(el) {
    const k = el.dataset.k, lim = { cycleLen: [18, 60], periodLen: [1, 12], luteal: [9, 18], periodBefore: [0, 7] }[k];
    if (k === 'periodBefore') S().reminders.periodBefore = C.clamp(S().reminders.periodBefore + Number(el.dataset.d), lim[0], lim[1]);
    else S()[k] = C.clamp(S()[k] + Number(el.dataset.d), lim[0], lim[1]);
    commit();
  },
  toggleCat(el) { S().categories[el.dataset.k] = el.checked; commit({ silent: true }); },
  togglePill(el) { S().pill = el.checked; commit(); },
  addCustom() {
    const inp = $('#newCustom'), v = inp.value.trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (!S().customSymptoms.includes(v)) S().customSymptoms.push(v);
    commit(); toast('„' + v + '“ hinzugefügt');
  },
  rmCustom(el) { const v = el.dataset.v; if (!confirm(`„${v}“ aus der Liste entfernen? Bisherige Einträge bleiben erhalten.`)) return; S().customSymptoms = S().customSymptoms.filter(x => x !== v); commit(); },
  addMed() {
    const name = $('#medName').value.trim(); if (!name) return;
    if (S().meds.some(x => x.name === name)) { toast('Gibt es schon'); return; }
    S().meds.push({ name, daily: $('#medDaily').checked, time: $('#medTime').value || '' }); commit(); toast(name + ' hinzugefügt');
  },
  rmMed(el) { const md = S().meds[Number(el.dataset.v)]; if (md && confirm(`${md.name} entfernen? Bisherige Einträge bleiben erhalten.`)) { S().meds.splice(Number(el.dataset.v), 1); commit(); } },
  addRem() {
    const text = $('#remText').value.trim(); if (!text) { $('#remText').focus(); return; }
    const repeat = $('#remRep').value, date = $('#remDate').value || (repeat === 'daily' ? '' : C.todayISO());
    S().reminders.custom.push({ id: Date.now().toString(36), text, date, time: $('#remTime').value || '', repeat });
    commit(); toast('Erinnerung gespeichert');
  },
  rmRem(el) { S().reminders.custom = S().reminders.custom.filter(r => r.id !== el.dataset.v); commit(); },
  icsOpt(el) { state.ics[el.dataset.k] = el.checked; render(); },
  async exportIcs() {
    const ics = C.buildICS(state.db, model(), state.ics);
    await shareOrDownload('zyklus-erinnerungen.ics', ics, 'text/calendar', 'Zyklus-Erinnerungen');
  },
  partnerOpt(el) { state.partner[el.dataset.k] = el.checked; render(); },
  async sharePartner() {
    const txt = C.partnerSummary(state.db, model(), state.partner);
    if (navigator.share) { try { await navigator.share({ text: txt }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(txt); toast('Text kopiert'); } catch (e) { alert(txt); }
  },
  setPin() { pin = { mode: 'set1', buf: '', first: '', msg: '' }; renderLock(); },
  async removePin() {
    if (!confirm('Code entfernen? Die Daten werden dann unverschlüsselt gespeichert.')) return;
    await saving; state.session = null; St.savePlain(state.db); St.ls.del(St.ENC_KEY); render(); toast('Code entfernt');
  },
  lockAfter(el) { state.prefs.lockAfter = Number(el.dataset.v); St.savePrefs(state.prefs); render(); },
  theme(el) { state.prefs.theme = el.dataset.v; St.savePrefs(state.prefs); applyTheme(); render(); },
  async export() {
    const json = JSON.stringify({ app: 'haiwoche', version: 2, exported: new Date().toISOString(), data: state.db }, null, 1);
    const ok = await shareOrDownload(`zyklus-backup-${C.todayISO()}.json`, json, 'application/json', 'Zyklus-Backup');
    if (ok) { S().lastBackup = C.todayISO(); commit(); toast('Backup erstellt'); }
  },
  import() { importInput.click(); },
  async exportCsv() {
    const cols = ['datum', 'blutung', 'schmerz', 'energie', 'stress', 'schlaf_h', 'schlafqualitaet', 'temperatur', 'gewicht', 'symptome', 'stimmung', 'appetit', 'gelueste', 'bewegung', 'ausfluss', 'pille', 'medikamente', 'notiz'];
    if (cat('sex')) cols.splice(15, 0, 'sex', 'lust');
    const q = v => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = Object.entries(state.db.days).sort((a, b) => a[0].localeCompare(b[0])).map(([d, e]) => {
      const r = { datum: d, blutung: e.flow ? T.FLOW_LABEL[e.flow] : '', schmerz: e.pain, energie: e.energy, stress: e.stress, schlaf_h: e.sleep, schlafqualitaet: e.sleepQ, temperatur: e.temp, gewicht: e.weight, symptome: (e.symptoms || []).join(', '), stimmung: (e.moods || []).join(', '), appetit: e.appetite, gelueste: (e.cravings || []).join(', '), bewegung: (e.activity || []).join(', '), ausfluss: e.discharge, sex: e.sex, lust: e.libido, pille: e.pill ? 'ja' : '', medikamente: (e.meds || []).join(', '), notiz: e.note };
      return cols.map(c => q(r[c])).join(';');
    });
    await shareOrDownload(`zyklus-export-${C.todayISO()}.csv`, '﻿' + [cols.join(';'), ...rows].join('\n'), 'text/csv', 'Zyklus-Export');
  },
  wipe() {
    if (!confirm('Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden.')) return;
    if (!confirm('Ganz sicher? Speichere vorher am besten ein Backup.')) return;
    St.wipeAll(); state.db = null; state.session = null; state.sheetDay = null; renderSheet(); go('today'); render();
  },
  key(el) { onKey(el.dataset.v); },
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]');
  if (!el || el.tagName === 'SELECT') return;
  const fn = A[el.dataset.a];
  if (fn) fn(el, ev);
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.a === 'calFilterSel') { state.calFilter = el.value; render(); }
  if (el.dataset.set && state.db) { S()[el.dataset.set] = el.value; commit({ silent: true }); }
  if (el.dataset.setr && state.db) { S().reminders[el.dataset.setr] = el.value; commit({ silent: true }); }
});
let jqT;
document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.ob) state.ob[el.dataset.ob] = el.value;
  else if (el.dataset.set && el.type === 'text') { S()[el.dataset.set] = el.value; commit({ silent: true }); }
  else if (el.dataset.num) {
    const raw = el.value.replace(',', '.').trim(), v = raw === '' ? null : parseFloat(raw);
    if (raw === '' || Number.isFinite(v)) { setField(state.sheetDay, el.dataset.num, v); commit({ silent: true }); }
  } else if ('note' in el.dataset) { setField(state.sheetDay, 'note', el.value); commit({ silent: true }); }
  else if (el.dataset.in === 'jq') { state.jq = el.value; clearTimeout(jqT); jqT = setTimeout(() => { const pos = el.selectionStart; render(); const n = document.querySelector('[data-in="jq"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 200); }
  else if (el.dataset.partner) { state.partner[el.dataset.partner] = el.value; const p = $('#partnerPreview'); if (p) p.textContent = C.partnerSummary(state.db, model(), state.partner); }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && state.sheetDay) A.close(); });

/* ---------- Darstellung ---------- */
function applyTheme() {
  const th = state.prefs.theme;
  if (th === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = th;
}

/* ---------- Rendern ---------- */
function render() {
  const main = $('#main'), nav = $('#nav');
  if (pin.mode && pin.mode.startsWith('unlock')) return;
  if (!state.db) { main.innerHTML = viewOnboarding(); nav.hidden = true; return; }
  nav.hidden = false;
  const r = route();
  let html;
  if (r.tab === 'today') html = viewToday();
  else if (r.tab === 'cal') html = viewCal();
  else if (r.tab === 'stats') html = viewStats();
  else if (r.tab === 'journal') html = viewJournal();
  else html = ({ '': viewMore, cycle: viewCycleSettings, tracking: viewTracking, reminders: viewReminders, report: viewReport, partner: viewPartner, privacy: viewPrivacy, data: viewData, look: viewLook, library: viewLibrary, article: () => viewArticle(r.arg), about: viewAbout }[r.sub] || viewMore)();
  const same = main.dataset.r === location.hash;
  main.innerHTML = html;
  if (same) main.querySelectorAll('.view, .ring-anim').forEach(x => { x.style.animation = 'none'; });
  main.dataset.r = location.hash;
  const ct = document.getElementById('cap-today');
  if (ct) ct.parentElement.scrollLeft = ct.offsetLeft - ct.parentElement.clientWidth / 2 + ct.clientWidth / 2;
  nav.querySelectorAll('button').forEach(b => { const on = b.dataset.v === r.tab; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
}

/* ---------- Start ---------- */
function boot() {
  applyTheme();
  if (St.isEncrypted()) { pin = { mode: 'unlock-enc', buf: '', first: '', msg: '' }; renderLock(); return; }
  state.db = St.loadPlain();
  if (state.db && state.db.settings.legacyPin) { pin = { mode: 'unlock-legacy', buf: '', first: '', msg: '' }; renderLock(); return; }
  if (state.db) St.savePlain(state.db); // Migration sofort sichern
  render();
}
boot();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Neue Version geladen – wird beim nächsten Öffnen aktiv'); });
    });
  }).catch(() => { });
}
window.__liwy = { state, model, A }; // für Tests
