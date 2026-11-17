// End-to-End-Test im simulierten iPhone (Playwright + Chromium).
// Start: node tests/e2e.mjs [Screenshot-Ordner]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const shots = process.argv[2] || null;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

let failures = 0, passes = 0;
const ok = (cond, msg) => { if (cond) { passes++; console.log('  ✓ ' + msg); } else { failures++; console.log('  ✗ ' + msg); } };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addD = (s, n) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d, 12); x.setDate(x.getDate() + n); return iso(x); };
const today = iso(new Date());

function v1Data() {
  // Daten wie aus Version 1 (inkl. Schmerz als Text)
  const days = {};
  let s = addD(today, -12);
  const starts = [s];
  for (const l of [29, 27, 30, 28, 26, 29]) { s = addD(s, -l); starts.push(s); }
  for (const st of starts) for (let i = 0; i < 5; i++) days[addD(st, i)] = { flow: i < 2 ? 'heavy' : 'medium', ...(i < 2 ? { symptoms: ['Krämpfe'], pain: 'Stark' } : {}) };
  for (const st of starts.slice(1)) { days[addD(st, -2)] = { symptoms: ['Brustspannen', 'Heißhunger'], moods: ['Gereizt'] }; days[addD(st, -3)] = { symptoms: ['Brustspannen'], moods: ['Gereizt'], note: 'Etwas dünnhäutig heute' }; }
  for (let i = 1; i <= 40; i++) { const d = addD(today, -i); days[d] = { ...(days[d] || {}), energy: 1 + (i % 5), sleep: 5 + (i % 4), temp: 36.4 + ((i % 28) > 14 ? 0.3 : 0) }; }
  return { settings: { name: 'Mia', cycleLen: 28, periodLen: 5, luteal: 14, pill: true, pin: null, lastBackup: null }, days };
}

const b = await chromium.launch();
async function newPage(seed) {
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, acceptDownloads: true });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) p.errors.push(m.text()); });
  if (seed) await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, ['liwy.v1', JSON.stringify(seed)]);
  await p.goto(base);
  await p.waitForTimeout(300);
  return p;
}
const shot = async (p, name, full = true) => { if (shots) await p.screenshot({ path: path.join(shots, name + '.png'), fullPage: full }); };
const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);

try {
  console.log('Onboarding');
  {
    const p = await newPage();
    ok(await p.isVisible('text=Los geht'), 'Onboarding wird angezeigt');
    await shot(p, '01-onboarding');
    await p.fill('[data-ob=name]', 'Lea');
    await p.fill('[data-ob=start]', addD(today, -3));
    await p.click('[data-a=finishOb]');
    await p.waitForTimeout(200);
    ok(await p.isVisible('text=Lea'), 'Begrüßung mit Namen');
    ok(await p.isVisible('text=Tag 4'), 'Periode Tag 4 erkannt');
    const db = JSON.parse(await ls(p, 'liwy.v1'));
    ok(db.v === 2 && Object.keys(db.days).length === 4, 'Daten im neuen Format gespeichert (4 Periodentage bis heute)');
    ok(p.errors.length === 0, 'keine JS-Fehler ' + p.errors.join(' | '));
    await p.context().close();
  }

  console.log('Bestehende Daten aus Version 1');
  const p = await newPage(v1Data());
  {
    const db = JSON.parse(await ls(p, 'liwy.v1'));
    ok(db.v === 2, 'v1-Daten automatisch migriert');
    const painDay = Object.values(db.days).find(e => e.pain != null);
    ok(painDay && painDay.pain === 3, 'Schmerz „Stark“ → 3');
    ok(await p.isVisible('text=Mia'), 'Name übernommen');
    ok(await p.isVisible('text=Tag 13') || await p.isVisible('text=Zyklustag'), 'Heute-Ansicht mit Zyklustag');
    await shot(p, '02-heute');

    // Schnell-Eintrag
    await p.click('[data-a=quick][data-f=moods][data-v="Glücklich"]');
    await p.click('[data-a=quickScale][data-v="4"]');
    const t = JSON.parse(await ls(p, 'liwy.v1')).days[today];
    ok(t && t.moods.includes('Glücklich') && t.energy === 4, 'Schnell-Eintrag gespeichert');

    // Tages-Editor
    await p.click('text=Symptome eintragen');
    await p.waitForSelector('.sheet');
    await p.click('.sheet [data-a=chip][data-f=symptoms][data-v="Kopfschmerzen"]');
    await p.click('.sheet [data-a=scale][data-f=stress][data-v="4"]');
    await p.fill('.sheet [data-num=temp]', '36,62');
    await p.fill('.sheet textarea[data-note]', 'Test-Notiz 🌸');
    await shot(p, '03-eintrag', false);
    await p.click('.sheet [data-a=close]');
    const t2 = JSON.parse(await ls(p, 'liwy.v1')).days[today];
    ok(t2.symptoms.includes('Kopfschmerzen') && t2.stress === 4 && t2.temp === 36.62 && t2.note === 'Test-Notiz 🌸', 'Editor speichert Symptom, Stress, Temperatur, Notiz');
    await p.reload(); await p.waitForTimeout(300);
    ok((JSON.parse(await ls(p, 'liwy.v1')).days[today] || {}).note === 'Test-Notiz 🌸', 'Daten überstehen Neuladen');

    // Periode beginnt → Vorhersage ändert sich
    const nextBefore = await p.evaluate(() => window.__liwy.model().next);
    await p.click('[data-a=startPeriod]');
    await p.waitForTimeout(150);
    const m2 = await p.evaluate(() => ({ next: window.__liwy.model().next, inP: window.__liwy.model().inPeriod }));
    ok(m2.inP && m2.next !== nextBefore, 'Periodenstart aktualisiert Vorhersage & Startseite');
    ok(await p.isVisible('text=Tag 1'), 'Startseite zeigt „Tag 1“');
    await p.click('#toast [data-a=undo]');
    ok(!(await p.evaluate(() => window.__liwy.model().inPeriod)), 'Rückgängig funktioniert');

    // Kalender
    await p.click('#nav [data-v=cal]');
    await p.waitForTimeout(150);
    ok(await p.isVisible('.calgrid'), 'Kalender sichtbar');
    await shot(p, '04-kalender');
    await p.click('[data-a=calFilter][data-v=note]');
    ok(await p.locator('.d-hl').count() >= 1, 'Filter „Notizen“ markiert Tage');
    await p.click('[data-a=editPeriods]');
    const cnt0 = await p.evaluate(() => window.__liwy.model().ps.length);
    const target = addD(today, -1);
    await p.click(`.calgrid [data-v="${target}"]`);
    const cnt1 = await p.evaluate(() => window.__liwy.model().ps.length);
    ok(cnt1 === cnt0 + 1, 'Bearbeiten-Modus legt Periodentag an');
    await p.click(`.calgrid [data-v="${target}"]`);
    ok(await p.evaluate(() => window.__liwy.model().ps.length) === cnt0, 'und entfernt ihn wieder');
    await p.click('[data-a=editDone]');

    // Analyse
    await p.click('#nav [data-v=stats]');
    await p.waitForTimeout(150);
    ok(await p.isVisible('text=Bisherige Zyklen'), 'Analyse zeigt Zykluslängen');
    ok(await p.locator('.ins').count() >= 2, 'Erkenntnisse vorhanden');
    ok(await p.isVisible('text=Vor der Periode'), 'PMS-Bereich vorhanden');
    const pmsTxt = await p.locator('.card:has(h2:text("Vor der Periode"))').innerText();
    ok(/Brustspannen/.test(pmsTxt), 'PMS-Muster „Brustspannen“ aus echten Daten erkannt');
    await p.click('.chart .hit >> nth=0');
    ok(/Tage/.test(await p.locator('#tip-cyc').innerText()), 'Diagramm-Tooltip reagiert');
    await p.click('[data-a=metric][data-v=sleep]');
    ok(await p.locator('#tip-phc').count() === 1 && await p.locator('#tip-curve').count() === 1, 'Schlaf nach Phase und nach Zyklustag gezeichnet');
    await shot(p, '05-analyse');
    await p.click('[data-a=range][data-v="3"]');
    ok(p.errors.length === 0, 'Zeitraumwechsel ohne Fehler');

    // Tagebuch
    await p.click('#nav [data-v=journal]');
    await p.waitForTimeout(150);
    ok(await p.isVisible('text=Test-Notiz'), 'Tagebuch zeigt Notiz');
    await p.fill('[data-in=jq]', 'dünnhäutig');
    await p.waitForTimeout(350);
    ok(await p.locator('.tl-day').count() >= 1 && !(await p.isVisible('text=Test-Notiz')), 'Suche filtert');
    await shot(p, '06-tagebuch');

    // Mehr-Seiten
    for (const r of ['more', 'more/cycle', 'more/tracking', 'more/reminders', 'more/report', 'more/partner', 'more/privacy', 'more/data', 'more/look', 'more/library', 'more/article/pms', 'more/about']) {
      await p.evaluate(r => { location.hash = '/' + r; }, r);
      await p.waitForTimeout(120);
      if (r === 'more/report') await shot(p, '07-bericht');
      if (r === 'more/article/pms') await shot(p, '08-wissen');
      if (r === 'more') await shot(p, '09-mehr');
    }
    ok(p.errors.length === 0, 'alle Unterseiten ohne JS-Fehler ' + p.errors.join(' | '));

    // Eigene Symptome
    await p.evaluate(() => { location.hash = '/more/tracking'; });
    await p.waitForTimeout(100);
    await p.fill('#newCustom', 'Kiefer verspannt');
    await p.click('[data-a=addCustom]');
    ok(JSON.parse(await ls(p, 'liwy.v1')).settings.customSymptoms.includes('Kiefer verspannt'), 'Eigenes Symptom angelegt');

    // Erinnerung + Kalender-Export
    await p.evaluate(() => { location.hash = '/more/reminders'; });
    await p.waitForTimeout(100);
    await p.fill('#remText', 'Frauenärztin');
    await p.fill('#remDate', addD(today, 1));
    await p.click('[data-a=addRem]');
    const [ics] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=exportIcs]')]);
    const icsTxt = fs.readFileSync(await ics.path(), 'utf8');
    ok(icsTxt.includes('BEGIN:VCALENDAR') && icsTxt.includes('Frauenärztin') && icsTxt.includes('Pille'), 'Kalenderdatei mit Perioden, Pille und Termin');
    await p.evaluate(() => { location.hash = '/today'; });
    await p.waitForTimeout(100);
    ok(await p.isVisible('text=Frauenärztin'), 'Erinnerung erscheint auf „Heute“');

    // Partner
    await p.evaluate(() => { location.hash = '/more/partner'; });
    await p.waitForTimeout(100);
    const prev = await p.locator('#partnerPreview').innerText();
    ok(/Phase/.test(prev) && !/Kopfschmerzen/.test(prev), 'Partner-Text nur mit ausgewählten Infos');

    // Backup Export + Import
    await p.evaluate(() => { location.hash = '/more/data'; });
    await p.waitForTimeout(100);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=export]')]);
    const backupPath = await dl.path();
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    ok(backup.data && Object.keys(backup.data.days).length > 50, 'Backup enthält alle Tage');
    const [csv] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=exportCsv]')]);
    ok(fs.readFileSync(await csv.path(), 'utf8').includes('Test-Notiz'), 'CSV-Export');
    await p.evaluate(() => { const db = window.__liwy.state.db; db.days = {}; });
    p.once('dialog', d => d.accept());
    await p.setInputFiles('#importFile', backupPath);
    await p.waitForTimeout(300);
    ok(Object.keys(JSON.parse(await ls(p, 'liwy.v1')).days).length === Object.keys(backup.data.days).length, 'Import stellt alle Tage wieder her');

    // Code & Verschlüsselung
    await p.evaluate(() => { location.hash = '/more/privacy'; });
    await p.waitForTimeout(100);
    await p.click('[data-a=setPin]');
    for (const k of '24682468') { await p.click(`#lock [data-a=key][data-v="${k}"]`); await p.waitForTimeout(40); }
    await p.waitForSelector('#lock', { state: 'hidden', timeout: 10000 });
    ok(await ls(p, 'liwy.v1') === null, 'Unverschlüsselte Daten entfernt');
    const enc = await ls(p, 'liwy.enc.v1');
    ok(enc && !enc.includes('Test-Notiz') && !enc.includes('Krämpfe'), 'Gespeicherte Daten sind verschlüsselt');
    await p.reload(); await p.waitForTimeout(300);
    ok(await p.isVisible('#lock'), 'Nach Neustart gesperrt');
    await shot(p, '10-sperre', false);
    for (const k of '1111') await p.click(`#lock [data-a=key][data-v="${k}"]`);
    await p.waitForTimeout(1500);
    ok(await p.isVisible('text=Falscher Code'), 'Falscher Code wird abgelehnt');
    for (const k of '2468') await p.click(`#lock [data-a=key][data-v="${k}"]`);
    await p.waitForSelector('#lock', { state: 'hidden', timeout: 10000 });
    ok(await p.evaluate(() => window.__liwy.state.db.settings.name === 'Mia'), 'Richtiger Code entschlüsselt die Daten');
    await p.evaluate(() => { location.hash = '/today'; }); await p.waitForTimeout(150);
    await p.click('[data-a=quick][data-f=moods][data-v="Ruhig"]');
    await p.waitForTimeout(500);
    await p.reload(); await p.waitForTimeout(300);
    for (const k of '2468') await p.click(`#lock [data-a=key][data-v="${k}"]`);
    await p.waitForSelector('#lock', { state: 'hidden', timeout: 10000 });
    ok(await p.evaluate(t => (window.__liwy.state.db.days[t].moods || []).includes('Ruhig'), today), 'Änderungen werden verschlüsselt gespeichert');
    ok(p.errors.length === 0, 'keine JS-Fehler ' + p.errors.join(' | '));
    await p.context().close();
  }

  console.log('Code aus Version 1');
  {
    const seed = v1Data();
    seed.settings.pin = 'ef46db3751d8e999'; // falscher Platzhalter wird unten ersetzt
    const ctx = await b.newContext({ ...devices['iPhone 13'] });
    const p2 = await ctx.newPage();
    await p2.goto(base);
    const hash = await p2.evaluate(async () => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('liwy:1357')); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); });
    seed.settings.pin = hash;
    await p2.evaluate(v => localStorage.setItem('liwy.v1', v), JSON.stringify(seed));
    await p2.reload(); await p2.waitForTimeout(300);
    ok(await p2.isVisible('#lock'), 'Alter Code sperrt die App');
    for (const k of '1357') await p2.click(`#lock [data-a=key][data-v="${k}"]`);
    await p2.waitForSelector('#lock', { state: 'hidden', timeout: 10000 });
    ok(await p2.evaluate(() => !!localStorage.getItem('liwy.enc.v1') && !localStorage.getItem('liwy.v1')), 'Alter Code → Daten jetzt verschlüsselt');
    await ctx.close();
  }

  console.log('Dunkelmodus & schmaler Bildschirm');
  {
    const ctx = await b.newContext({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, colorScheme: 'dark', isMobile: true, hasTouch: true });
    const p3 = await ctx.newPage();
    await p3.addInitScript(v => { if (!localStorage.getItem('liwy.v1')) localStorage.setItem('liwy.v1', v); }, JSON.stringify(v1Data()));
    for (const r of ['today', 'cal', 'stats', 'journal', 'more/report']) {
      await p3.goto(base + '#/' + r); await p3.waitForTimeout(250);
      const over = await p3.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(over <= 0, `kein horizontales Scrollen auf ${r} bei 320 px (${over})`);
      if (r === 'today') await shot(p3, '11-dunkel');
    }
    await ctx.close();
  }
} catch (e) {
  failures++; console.log('ABBRUCH: ' + e.stack);
} finally {
  await b.close(); server.close();
  console.log(`\n${passes} bestanden, ${failures} fehlgeschlagen`);
  process.exit(failures ? 1 : 0);
}
