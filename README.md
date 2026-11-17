# Lukas is watching you

Privater Zyklus- und Gesundheits-Tracker als Web-App (PWA) für das iPhone.
Läuft komplett offline: keine Accounts, keine Server, keine Abos, keine externen Dienste.

**Live:** https://antid0te-arch.github.io/watching/ → in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

## Aufbau

Bewusst ohne Build-Schritt und ohne Abhängigkeiten: GitHub Pages liefert die Dateien direkt aus.

| Datei | Aufgabe |
|---|---|
| `index.html` | App-Hülle, Navigation |
| `css/app.css` | Designsystem (Tokens, Hell/Dunkel, Pink als Akzentfarbe, Druckansicht, reduzierte Bewegung) |
| `js/core.js` | **Einzige Quelle aller Berechnungen** (reine Funktionen): Perioden, Vorhersagemodell, Phasen, Analyse, Erkenntnisse, Erinnerungen, Kalender-Export, Partner-Text, Migration |
| `js/store.js` | Lokaler Speicher, AES-GCM-Verschlüsselung (PBKDF2-Schlüssel aus dem Code) |
| `js/ui.js` | Icons, Formatierung, SVG-Diagramme |
| `js/content.js` | Kategorien, Texte, Wissensartikel mit Quellen |
| `js/app.js` | Ansichten, Routing (`#/…`), Aktionen |
| `sw.js` | Offline-Cache (bei neuer Version `CACHE` erhöhen) |

Datenfluss: Jede Änderung schreibt in `db.days` / `db.settings`, danach wird das Modell (`buildModel`) neu berechnet.
Startseite, Kalender, Analyse, Erkenntnisse, Bericht und Export lesen alle aus diesem einen Modell.

### Datenmodell (v2)
```
{ v: 2, settings: { name, cycleLen, periodLen, luteal, pill, pillTime, categories{}, customSymptoms[], meds[], reminders{} },
  days: { "YYYY-MM-DD": { flow, symptoms[], moods[], pain 0–3, energy 1–5, stress 1–5, sleep h, sleepQ 1–5,
          appetite, cravings[], activity[], discharge, sex, libido, temp, weight, pill, meds[], note } } }
```
Daten der Version 1 (gleicher Speicherschlüssel `liwy.v1`) werden beim Start automatisch und verlustfrei migriert.

### Vorhersagemodell
- Gewichteter Mittelwert der letzten bis zu 12 Zyklen (neuere zählen stärker), bei wenig Daten mit dem Startwert gemischt.
- Ausreißer (z. B. vergessene Periode) werden per Median-Abstand erkannt und nicht mitgerechnet.
- Unsicherheit = Streuung der Zyklen → Zeitraum ± n Tage, wächst für spätere Zyklen (√k).
- Eisprung = nächste Periode − Lutealphase. Die Lutealphase wird aus Temperaturkurven gelernt (3-über-6-Regel), sonst Einstellung.
- Treffergenauigkeit wird rückblickend berechnet (Vorhersage zu Beginn jedes Zyklus vs. tatsächlich).

## Tests
```bash
npm test          # 20 Unit-Tests für den Rechenkern (node:test)
npm run e2e       # 50 Browser-Prüfungen im simulierten iPhone (Playwright/Chromium)
```

## Bestandsaufnahme vor dem Upgrade (v1 → v2)

**Funktionierte:** Onboarding, Periodenkalender, Tagebuch-Grundfelder, einfache Vorhersage, PIN-Sperre, JSON-Backup, Offline-Betrieb.
**Verbesserungsbedürftig:** Vorhersage (ungewichteter Schnitt, kein Spielraum, keine Ausreißer), Analyse (nur Balken + Zählung), Design (rot/weiß, uneinheitlich), Einträge (wenige Kategorien).
**Teilweise/fehlerhaft:** PIN nur als Hash – Daten lagen unverschlüsselt; Periodenende nicht markierbar; keine Korrektur vergangener Perioden außer Tag für Tag; Pille ohne Erinnerung.
**Fehlte:** Erkenntnisse, PMS-Muster, Phasen-Analyse, Verlauf nach Zyklustag, Monatsvergleich, Bericht/PDF, Wissen, Erinnerungen, eigene Symptome/Medikamente, Kategorien-Auswahl, Partner-Teilen, Verschlüsselung, Tests.

## Grenzen
- Keine Push-Benachrichtigungen (bräuchte einen Server) → Kalender-Export (.ics) in die iPhone-Kalender-App.
- Kein Geräte-Sync → Backup/Wiederherstellen.
- 4-stelliger Code: guter Schutz vor neugierigen Blicken, gegen gezielte Angriffe begrenzt. Code vergessen = Daten verloren.
- Vorhersagen sind Schätzungen, kein Verhütungsmittel, keine Diagnosen.
