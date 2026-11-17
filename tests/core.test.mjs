import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  add, diff, parse, iso, isDate, periods, wstats, predictCycle, detectShift, buildModel, dayInfo,
  migrate, analyze, pmsPattern, insights, upcoming, reminderDue, buildICS, partnerSummary, cleanEntry, tempPoints,
} from '../js/core.js';

const mk = (settings = {}) => migrate({ settings, days: {} });
function addPeriod(db, start, len = 5, flow = 'medium') { for (let i = 0; i < len; i++) db.days[add(start, i)] = { ...(db.days[add(start, i)] || {}), flow }; }
function cyclesFrom(db, start, lens, plen = 5) { let s = start; addPeriod(db, s, plen); for (const l of lens) { s = add(s, l); addPeriod(db, s, plen); } return s; }

test('Datumsrechnung über Jahreswechsel, Schaltjahr und Sommerzeit', () => {
  assert.equal(add('2026-12-30', 3), '2027-01-02');
  assert.equal(add('2028-02-28', 1), '2028-02-29');
  assert.equal(add('2027-02-28', 1), '2027-03-01');
  assert.equal(diff('2026-03-28', '2026-03-30'), 2); // Zeitumstellung Ende März
  assert.equal(diff('2026-10-24', '2026-10-26'), 2); // Zeitumstellung Ende Oktober
  assert.equal(diff('2026-12-25', '2027-01-05'), 11);
  assert.equal(iso(parse('2026-01-01')), '2026-01-01');
  assert.ok(isDate('2026-02-28')); assert.ok(!isDate('2026-02-30')); assert.ok(!isDate('x'));
});

test('Perioden werden zusammengefasst, eine Lücke wird überbrückt, Schmierblutung zählt nicht', () => {
  const days = { '2026-01-01': { flow: 'heavy' }, '2026-01-02': { flow: 'medium' }, '2026-01-04': { flow: 'light' }, '2026-01-10': { flow: 'spotting' }, '2026-01-29': { flow: 'medium' } };
  assert.deepEqual(periods(days), [{ start: '2026-01-01', end: '2026-01-04' }, { start: '2026-01-29', end: '2026-01-29' }]);
});

test('Gewichtete Statistik bevorzugt neuere Werte', () => {
  const s = wstats([26, 26, 26, 32]);
  assert.ok(s.mean > 27.5 && s.mean < 32);
  assert.equal(wstats([]).n, 0);
  assert.equal(wstats([28]).sd, 0);
});

test('Vorhersage ohne Daten nutzt Startwert, mit wenig Daten wird gemischt', () => {
  assert.equal(predictCycle([], 30).mean, 30);
  assert.equal(predictCycle([26], 30).mean, 28);
  const p = predictCycle([27, 29, 28, 28, 27, 29], 35);
  assert.ok(Math.abs(p.mean - 28) < 0.6);
  assert.ok(p.sd >= 1);
});

test('Modell: regelmäßige Zyklen → richtige nächste Periode und Eisprung', () => {
  const db = mk();
  const last = cyclesFrom(db, '2026-01-05', [28, 28, 28, 28, 28, 28]);
  const t = add(last, 10);
  const m = buildModel(db, t);
  assert.equal(m.avgCycle, 28);
  assert.equal(m.avgPeriod, 5);
  assert.equal(m.next, add(last, 28));
  assert.equal(m.cur.ov, add(last, 14));
  assert.equal(m.regularity, 'regular');
  assert.equal(m.confidence, 'high');
  assert.equal(m.cycleDay, 11);
  assert.equal(m.late, 0);
  assert.equal(m.mae, 0);
  assert.equal(dayInfo(m, db.days, add(last, 14)).ov, true);
  assert.equal(dayInfo(m, db.days, add(last, 10)).phase, 'fert');
  assert.equal(dayInfo(m, db.days, add(last, 6)).phase, 'foll');
  assert.equal(dayInfo(m, db.days, add(last, 20)).phase, 'lut');
  assert.equal(dayInfo(m, db.days, add(last, 28)).pred, true);
});

test('Modell: unregelmäßige Zyklen → breiterer Zeitraum und geringe Sicherheit', () => {
  const db = mk();
  const last = cyclesFrom(db, '2026-01-01', [24, 38, 29, 41, 26]);
  const m = buildModel(db, add(last, 3));
  assert.equal(m.regularity, 'irregular');
  assert.ok(m.uncertainty >= 5, 'Unsicherheit ' + m.uncertainty);
  assert.equal(m.confidence, 'low');
  assert.ok(diff(m.nextRange[0], m.nextRange[1]) >= 10);
});

test('Modell: kein fester 28-Tage-Wert – lange Zyklen werden gelernt', () => {
  const db = mk();
  const last = cyclesFrom(db, '2026-01-01', [34, 35, 34, 35]);
  const m = buildModel(db, add(last, 2));
  assert.ok(m.avgCycle >= 34 && m.avgCycle <= 35);
});

test('Modell: Ausreißer (vergessene Periode) wird nicht in den Schnitt gerechnet', () => {
  const db = mk();
  const last = cyclesFrom(db, '2026-01-01', [28, 29, 28, 57, 28, 29]);
  const m = buildModel(db, add(last, 2));
  assert.ok(m.cycles.find(c => c.len === 57).outlier);
  assert.ok(m.avgCycle <= 29);
});

test('Modell: verspätete Periode', () => {
  const db = mk();
  const last = cyclesFrom(db, '2026-01-01', [28, 28, 28]);
  const m = buildModel(db, add(last, 31));
  assert.equal(m.late, 3);
  assert.equal(m.next, add(last, 32));
  assert.ok(m.lateBeyondRange);
  assert.ok(insights(db, m).some(i => i.id === 'late'));
});

test('Modell: laufende Periode wird fortgeschrieben, „Periode vorbei“ beendet sie', () => {
  const db = mk();
  const prev = cyclesFrom(db, '2026-01-01', [28, 28]);
  const start = add(prev, 28);
  addPeriod(db, start, 2);
  let m = buildModel(db, add(start, 2));
  assert.ok(m.inPeriod);
  assert.equal(m.periodDay, 3);
  assert.equal(m.cur.end, add(start, 4));
  db.days[add(start, 2)] = { flow: 'none' };
  m = buildModel(db, add(start, 2));
  assert.ok(!m.inPeriod);
  assert.equal(m.cur.end, add(start, 1));
});

test('Historische Korrektur verändert die Vorhersage sofort', () => {
  const db = mk();
  const last = cyclesFrom(db, '2026-01-01', [28, 28, 28]);
  const before = buildModel(db, add(last, 5)).next;
  // erste Periode war in Wahrheit 4 Tage früher
  for (let i = 0; i < 5; i++) delete db.days[add('2026-01-01', i)];
  addPeriod(db, '2025-12-28', 5);
  const after = buildModel(db, add(last, 5));
  assert.notEqual(after.cycles[0].len, 28);
  assert.equal(after.cycles[0].len, 32);
  assert.ok(after.next >= before);
});

test('Temperaturanstieg nach 3-über-6-Regel', () => {
  const pts = [36.4, 36.45, 36.38, 36.42, 36.4, 36.44, 36.41, 36.43, 36.7, 36.72, 36.75].map((v, i) => [i + 1, v]);
  const sh = detectShift(pts);
  assert.equal(sh.day, 9);
  assert.equal(detectShift(pts.slice(0, 9)), null);
  assert.equal(detectShift([36.5, 36.5, 36.5, 36.5, 36.5, 36.5, 36.6, 36.6, 36.6].map((v, i) => [i + 1, v])), null); // Anstieg < 0,2
});

test('Lutealphase wird aus Temperaturkurven gelernt', () => {
  const db = mk();
  const last = cyclesFrom(db, '2026-01-01', [30, 30, 30]);
  let s = '2026-01-01';
  for (let c = 0; c < 3; c++) {
    for (let d = 5; d < 30; d++) db.days[add(s, d)] = { ...(db.days[add(s, d)] || {}), temp: d < 17 ? 36.4 + (d % 2) * 0.03 : 36.75 };
    s = add(s, 30);
  }
  const m = buildModel(db, add(last, 3));
  assert.equal(m.lutealSource, 'temp');
  assert.equal(m.luteal, 14);
  assert.equal(m.cycles[0].ovTemp, add('2026-01-01', 16));
  assert.ok(tempPoints(db.days, '2026-01-01', '2026-01-30').length > 10);
});

test('Migration aus Version 1 erhält alle Daten', () => {
  const v1 = { settings: { name: 'Mia', cycleLen: 30, periodLen: 4, luteal: 14, pill: true, pin: 'abc', lastBackup: null },
    days: { '2026-01-01': { flow: 'medium', pain: 'Stark', symptoms: ['Krämpfe'] }, '2026-01-02': { temp: '36,5' }, 'kaputt': { flow: 'x' }, '2026-01-03': {} } };
  const db = migrate(v1);
  assert.equal(db.v, 2);
  assert.equal(db.settings.name, 'Mia');
  assert.equal(db.settings.cycleLen, 30);
  assert.equal(db.settings.legacyPin, 'abc');
  assert.equal(db.settings.pin, undefined);
  assert.equal(db.days['2026-01-01'].pain, 3);
  assert.equal(db.days['2026-01-02'].temp, 36.5);
  assert.equal(Object.keys(db.days).length, 2);
  assert.ok(db.settings.categories.mood);
  assert.deepEqual(migrate(db), db, 'Migration ist idempotent');
  assert.equal(migrate(null), null);
});

test('cleanEntry entfernt leere Werte, behält 0', () => {
  assert.deepEqual(cleanEntry({ a: [], b: '', c: null, d: 0, e: false, f: ['x'] }), { d: 0, f: ['x'] });
});

test('Analyse zählt Symptome je Phase und erkennt PMS-Muster', () => {
  const db = mk();
  const last = cyclesFrom(db, '2026-01-01', [28, 28, 28, 28]);
  let s = '2026-01-01';
  for (let c = 0; c < 4; c++) {
    const next = add(s, 28);
    for (let i = 1; i <= 3; i++) db.days[add(next, -i)] = { symptoms: ['Brustspannen'], moods: ['Gereizt'], energy: 2 };
    for (let i = 6; i <= 9; i++) db.days[add(s, i)] = { moods: ['Energiegeladen'], energy: 5 };
    s = next;
  }
  const m = buildModel(db, add(last, 2));
  const A = analyze(db, m, '2025-12-01', add(last, 2));
  const b = A.symptoms.find(x => x.name === 'Brustspannen');
  assert.equal(b.total, 12);
  assert.equal(b.lut, 12);
  assert.ok(A.phaseAvg.energy.lut < A.phaseAvg.energy.foll);
  const pms = pmsPattern(db, m, m.cycles);
  assert.ok(pms.list.some(x => x.name === 'Brustspannen' && x.cycles === 4));
  assert.ok(!pms.list.some(x => x.name === 'Energiegeladen'));
  const ins = insights(db, m);
  assert.ok(ins.some(i => i.id === 'pms' && i.type === 'personal'));
  assert.ok(ins.every(i => ['personal', 'estimate', 'education', 'notice'].includes(i.type)));
  assert.equal(new Set(ins.map(i => i.id)).size, ins.length, 'keine doppelten Erkenntnisse');
});

test('Erkenntnisse ohne Daten stürzen nicht ab', () => {
  const db = mk();
  const m = buildModel(db, '2026-05-01');
  assert.equal(m.cur, null);
  assert.equal(insights(db, m)[0].id, 'start');
  assert.deepEqual(upcoming(db, m), []);
  assert.equal(analyze(db, m, '2026-01-01', '2026-05-01').logged, 0);
});

test('Erinnerungen: Fälligkeit wiederholender Termine', () => {
  assert.equal(reminderDue({ date: '2026-03-10', repeat: 'none' }, '2026-03-08'), 2);
  assert.equal(reminderDue({ date: '2026-03-01', repeat: 'none' }, '2026-03-08'), null);
  assert.equal(reminderDue({ date: '2026-03-01', repeat: 'weekly' }, '2026-03-08'), 0);
  assert.equal(reminderDue({ date: '2026-01-31', repeat: 'monthly' }, '2026-02-27'), 1); // 28. Feb
  assert.equal(reminderDue({ repeat: 'daily' }, '2026-03-08'), 0);
});

test('Kalender-Export ist gültiges iCalendar', () => {
  const db = mk({ pill: true, pillTime: '08:30' });
  const last = cyclesFrom(db, '2026-01-01', [28, 28]);
  db.settings.reminders.custom = [{ id: 'a1', text: 'Frauenärztin, Kontrolle; bitte', date: '2026-04-02', repeat: 'none', time: '10:15' }];
  const m = buildModel(db, add(last, 3));
  const ics = buildICS(db, m, { periods: true, pill: true, custom: true, log: true }, new Date('2026-03-01T10:00:00Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.trim().endsWith('END:VCALENDAR'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 6 + 1 + 1 + 1);
  assert.ok(ics.includes('RRULE:FREQ=DAILY'));
  assert.ok(ics.includes('DTSTART:20260402T101500'));
  assert.ok(ics.includes('Frauenärztin\\, Kontrolle\\; bitte'));
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, 'Zeile zu lang: ' + line);
});

test('Partner-Text enthält nur ausgewählte Informationen', () => {
  const db = mk({ name: 'Mia' });
  const last = cyclesFrom(db, '2026-01-01', [28, 28]);
  const t = add(last, 3);
  db.days[t] = { ...(db.days[t] || {}), symptoms: ['Krämpfe'], moods: ['Gereizt'], sex: 'Ungeschützt' };
  const m = buildModel(db, t);
  const txt = partnerSummary(db, m, { phase: true, next: false, mood: true, symptoms: false }, t);
  assert.ok(txt.includes('Gereizt'));
  assert.ok(!txt.includes('Krämpfe'));
  assert.ok(!txt.includes('Ungeschützt'));
  assert.ok(!txt.includes('Nächste Periode'));
});
