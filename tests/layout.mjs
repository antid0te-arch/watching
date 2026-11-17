// Layout-Prüfung: sucht überlappende Geschwister-Elemente und Elemente, die aus ihrem Container ragen.
// Start: node tests/layout.mjs [Screenshot-Ordner]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const shots = process.argv[2] || null;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const base = `http://localhost:${srv.address().port}/`;

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addD = (s, n) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d, 12); x.setDate(x.getDate() + n); return iso(x); };
const today = iso(new Date());
function seed() {
  const days = {};
  let s = addD(today, -12); const starts = [s];
  for (const l of [29, 27, 30, 28, 26, 29, 31, 27]) { s = addD(s, -l); starts.push(s); }
  for (const st of starts) for (let i = 0; i < 5; i++) days[addD(st, i)] = { flow: i < 2 ? 'heavy' : 'medium', ...(i < 2 ? { symptoms: ['Krämpfe', 'Unterleibsschmerzen'], pain: 2 } : {}) };
  for (const st of starts.slice(1)) for (const k of [2, 3, 4]) days[addD(st, -k)] = { symptoms: ['Brustspannen', 'Heißhunger', 'Kopfschmerzen'], moods: ['Gereizt', 'Stimmungsschwankungen'], note: 'Ein etwas längerer Tagebucheintrag, um zu sehen, wie mehrzeiliger Text in der Zeitleiste umbricht und ob er sauber bleibt.' };
  for (let i = 0; i <= 60; i++) { const d = addD(today, -i); days[d] = { ...(days[d] || {}), energy: 1 + (i % 5), stress: 1 + (i % 4), sleep: 5.5 + (i % 4), sleepQ: 1 + (i % 5), temp: 36.4 + ((i % 28) > 14 ? 0.3 : 0), moods: [...new Set([...(days[d]?.moods || []), 'Glücklich'])], activity: ['Yoga'] }; }
  return { settings: { name: 'Maximiliane', cycleLen: 28, periodLen: 5, luteal: 14, pill: false, meds: [{ name: 'Eisen', daily: true, time: '08:00' }, { name: 'Magnesium', daily: false }], customSymptoms: ['Kiefer verspannt', 'Sehr langes eigenes Symptom'], reminders: { periodBefore: 20, custom: [{ id: 'a', text: 'Frauenärztin Kontrolle mit langem Text', date: addD(today, 1), time: '10:15', repeat: 'none' }] } }, days };
}

const routes = ['today', 'cal', 'stats', 'journal', 'more', 'more/cycle', 'more/tracking', 'more/reminders', 'more/report', 'more/partner', 'more/privacy', 'more/data', 'more/library', 'more/article/pms', 'more/about'];
const widths = [320, 375, 390, 430];
const b = await chromium.launch();
let problems = 0;
for (const w of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: shots ? 2 : 1, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(v => { if (!localStorage.getItem('liwy.v1')) localStorage.setItem('liwy.v1', v); }, JSON.stringify(seed()));
  const check = async (label, scope) => {
    const res = await p.evaluate((scope) => {
      const out = [];
      const root = document.querySelector(scope);
      if (!root) return out;
      const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.position !== 'absolute' && cs.position !== 'fixed' && cs.position !== 'sticky' && !cs.display.startsWith('inline') || (cs.display === 'inline-flex' || cs.display === 'inline-block') && r.width > 0 && cs.position === 'static'; };
      const name = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + ' "' + (el.textContent || '').trim().slice(0, 30) + '"';
      const scrollX = el => { const cs = getComputedStyle(el); return /auto|scroll|hidden/.test(cs.overflowX); };
      for (const el of root.querySelectorAll('*')) {
        if (el.closest('svg')) continue; // Diagramm-Inhalte dürfen sich überlagern
        const kids = [...el.children].filter(vis);
        if (!scrollX(el)) {
          const pr = el.getBoundingClientRect();
          for (const k of kids) { if (scrollX(k) && parseFloat(getComputedStyle(k).marginLeft) < 0) continue; const r = k.getBoundingClientRect(); if (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) out.push(`ragt heraus: ${name(k)} in ${name(el)} (${Math.round(r.right - pr.right)} px)`); }
        }
        for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
          const a = kids[i].getBoundingClientRect(), c = kids[j].getBoundingClientRect();
          const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
          if (ox > 2 && oy > 2) out.push(`überlappt: ${name(kids[i])} ↔ ${name(kids[j])} (${Math.round(ox)}×${Math.round(oy)})`);
        }
        // Text, der in seinem eigenen Element abgeschnitten wird
        if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible' && !/n$/.test(el.className)) out.push(`abgeschnitten: ${name(el)}`);
      }
      if (document.documentElement.scrollWidth > window.innerWidth) out.push('horizontales Scrollen der Seite');
      return out;
    }, scope);
    const uniq = [...new Set(res)];
    if (uniq.length) { problems += uniq.length; console.log(`\n[${w}px] ${label}`); uniq.slice(0, 25).forEach(x => console.log('  - ' + x)); }
  };
  for (const r of routes) {
    await p.goto(base + '#/' + r); await p.waitForTimeout(450);
    await check(r, '#main');
    if (shots && w === 390) { await p.addStyleTag({ content: '#nav{display:none!important}' }); await p.screenshot({ path: path.join(shots, `L-${r.replace(/\//g, '_')}.png`), fullPage: true }); await p.addStyleTag({ content: '#nav{display:block!important}' }); }
  }
  await check('nav', '#nav');
  // Tages-Editor
  await p.goto(base + '#/today'); await p.waitForTimeout(400);
  await p.evaluate(t => window.__liwy.A.openSheet({ dataset: { v: t } }), today);
  await p.waitForTimeout(450);
  await check('sheet', '#sheet .sheet');
  if (shots && w === 390) { await p.screenshot({ path: path.join(shots, 'L-sheet.png') }); }
  const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (!/248, 240, 245/.test(bg)) { problems++; console.log(`[${w}px] Hintergrund nicht hell trotz Dark Mode: ${bg}`); }
  if (errs.length) { problems += errs.length; console.log(`[${w}px] JS-Fehler: ` + errs.join(' | ')); }
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${problems} Layout-Probleme gefunden`);
process.exit(problems ? 1 : 0);
