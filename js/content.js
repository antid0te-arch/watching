// Texte, Kategorien und Wissensartikel. Gesundheitsinfos sind bewusst allgemein gehalten
// und verweisen auf öffentlich zugängliche Quellen (NHS, ACOG, WHO, Frauenärzte im Netz).

export const FLOW = [['spotting', 'Schmier­blutung'], ['light', 'Leicht'], ['medium', 'Mittel'], ['heavy', 'Stark']];
export const FLOW_LABEL = { spotting: 'Schmierblutung', light: 'Leichte Blutung', medium: 'Mittlere Blutung', heavy: 'Starke Blutung', none: 'Keine Blutung' };

export const CATEGORIES = [
  { id: 'pain', label: 'Schmerzen', desc: 'Krämpfe, Kopf-, Rücken-, Brustschmerzen, Schmerzstärke' },
  { id: 'body', label: 'Körper', desc: 'Müdigkeit, Schwindel, Wassereinlagerungen …' },
  { id: 'digestion', label: 'Verdauung & Appetit', desc: 'Blähungen, Übelkeit, Appetit, Gelüste' },
  { id: 'skin', label: 'Haut & Haare', desc: 'Pickel, fettige oder trockene Haut' },
  { id: 'mood', label: 'Stimmung', desc: 'Gefühle des Tages' },
  { id: 'energy', label: 'Energie & Stress', desc: 'Skalen von 1 bis 5' },
  { id: 'sleep', label: 'Schlaf', desc: 'Stunden und Qualität' },
  { id: 'activity', label: 'Bewegung', desc: 'Sport und Aktivität' },
  { id: 'mucus', label: 'Zervixschleim / Ausfluss', desc: 'Konsistenz' },
  { id: 'temp', label: 'Basaltemperatur', desc: 'Morgens vor dem Aufstehen gemessen' },
  { id: 'weight', label: 'Gewicht', desc: '' },
  { id: 'sex', label: 'Sex & Lust', desc: 'Sensibel – nur sichtbar, wenn eingeschaltet', sensitive: true },
  { id: 'meds', label: 'Medikamente & Pille', desc: 'Eigene Medikamente in den Einstellungen anlegen' },
  { id: 'notes', label: 'Notizen', desc: 'Freitext-Tagebuch' },
];

export const SYMPTOM_GROUPS = {
  pain: ['Krämpfe', 'Unterleibsschmerzen', 'Kopfschmerzen', 'Migräne', 'Rückenschmerzen', 'Brustspannen', 'Gelenkschmerzen'],
  body: ['Müdigkeit', 'Schwindel', 'Hitzewallungen', 'Frösteln', 'Wassereinlagerungen'],
  digestion: ['Blähungen', 'Übelkeit', 'Durchfall', 'Verstopfung', 'Heißhunger'],
  skin: ['Akne', 'Fettige Haut', 'Trockene Haut', 'Fettige Haare'],
  sleep: ['Schlafprobleme'],
};
export const MOODS = ['Glücklich', 'Ruhig', 'Energiegeladen', 'Verliebt', 'Selbstbewusst', 'Gereizt', 'Traurig', 'Ängstlich', 'Gestresst', 'Stimmungsschwankungen', 'Sensibel', 'Antriebslos', 'Wütend'];
export const CRAVINGS = ['Süßes', 'Salziges', 'Schokolade', 'Kohlenhydrate'];
export const APPETITE = ['Wenig', 'Normal', 'Viel'];
export const ACTIVITY = ['Spaziergang', 'Yoga', 'Laufen', 'Krafttraining', 'Radfahren', 'Schwimmen', 'Tanzen', 'Teamsport', 'Ruhetag'];
export const DISCHARGE = ['Kein Ausfluss', 'Trocken', 'Klebrig', 'Cremig', 'Wässrig', 'Eiweißartig', 'Ungewöhnlich'];
export const SEX = ['Kein Sex', 'Geschützt', 'Ungeschützt'];
export const LIBIDO = ['Wenig Lust', 'Normal', 'Viel Lust'];
export const PAIN = ['Keine', 'Leicht', 'Mittel', 'Stark'];
export const ENERGY = ['Erschöpft', 'Müde', 'Okay', 'Gut', 'Top'];
export const STRESS = ['Keiner', 'Wenig', 'Mittel', 'Hoch', 'Sehr hoch'];
export const SLEEPQ = ['Sehr schlecht', 'Schlecht', 'Okay', 'Gut', 'Sehr gut'];

export const PHASE = {
  mens: { name: 'Periode', long: 'Menstruation', color: 'mens' },
  foll: { name: 'Follikelphase', long: 'Follikelphase', color: 'foll' },
  fert: { name: 'Fruchtbares Fenster', long: 'Fruchtbares Fenster (geschätzt)', color: 'fert' },
  lut: { name: 'Lutealphase', long: 'Lutealphase', color: 'lut' },
};

// Kurze, allgemeine Hinweise je Phase. Mehrere pro Phase, damit es nicht jeden Tag gleich klingt.
export const PHASE_TIPS = {
  mens: [
    'Die Gebärmutterschleimhaut wird abgestoßen. Östrogen und Progesteron sind jetzt niedrig.',
    'Wärme auf dem Bauch und leichte Bewegung können Regelschmerzen lindern.',
    'Viele brauchen in diesen Tagen mehr Ruhe. Das ist völlig in Ordnung.',
    'Wer stark blutet, verliert Eisen. Eisenreiche Lebensmittel können helfen – bei Erschöpfung lieber ärztlich prüfen lassen.',
  ],
  foll: [
    'Östrogen steigt an. Viele erleben jetzt mehr Energie und bessere Laune.',
    'Im Eierstock reift ein Follikel heran, die Gebärmutterschleimhaut baut sich wieder auf.',
    'Eine gute Zeit für neue Vorhaben – zumindest fühlt es sich für viele so an.',
  ],
  fert: [
    'Spermien können bis zu fünf Tage überleben. Darum zählen auch die Tage vor dem Eisprung zum fruchtbaren Fenster.',
    'Zervixschleim wird um den Eisprung oft klar, dehnbar und „eiweißartig“.',
    'Das fruchtbare Fenster in der App ist eine Schätzung und nicht zur Verhütung geeignet.',
  ],
  lut: [
    'Nach dem Eisprung steigt Progesteron. Die Basaltemperatur liegt jetzt meist etwas höher.',
    'Kurz vor der Periode treten bei vielen PMS-Beschwerden wie Brustspannen, Heißhunger oder Reizbarkeit auf.',
    'Regelmäßiger Schlaf und Bewegung können PMS-Beschwerden bei manchen abmildern.',
  ],
};

export const SOURCES = {
  nhsPeriods: { name: 'NHS – Periods', url: 'https://www.nhs.uk/conditions/periods/' },
  nhsPMS: { name: 'NHS – PMS (pre-menstrual syndrome)', url: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/' },
  nhsPain: { name: 'NHS – Period pain', url: 'https://www.nhs.uk/conditions/period-pain/' },
  nhsHeavy: { name: 'NHS – Heavy periods', url: 'https://www.nhs.uk/conditions/heavy-periods/' },
  nhsIrregular: { name: 'NHS – Irregular periods', url: 'https://www.nhs.uk/conditions/irregular-periods/' },
  nhsEndo: { name: 'NHS – Endometriosis', url: 'https://www.nhs.uk/conditions/endometriosis/' },
  nhsPcos: { name: 'NHS – Polycystic ovary syndrome', url: 'https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/' },
  nhsNfp: { name: 'NHS – Natural family planning', url: 'https://www.nhs.uk/contraception/methods/natural-family-planning/' },
  whoEndo: { name: 'WHO – Endometriosis (Fact sheet)', url: 'https://www.who.int/news-room/fact-sheets/detail/endometriosis' },
  acogCycle: { name: 'ACOG – Your Changing Body: Puberty / Menstrual cycle FAQs', url: 'https://www.acog.org/womens-health/faqs' },
  fin: { name: 'Frauenärzte im Netz (Berufsverband der Frauenärzte)', url: 'https://www.frauenaerzte-im-netz.de/' },
};

export const ARTICLES = [
  {
    id: 'zyklus', title: 'Die vier Phasen deines Zyklus', tag: 'Grundlagen', mins: 3,
    body: `<p>Ein Zyklus beginnt am ersten Tag der Periode und endet am Tag vor der nächsten. Bei Erwachsenen dauert er meistens zwischen <b>21 und 35 Tagen</b>; 28 Tage sind nur ein Durchschnitt.</p>
<h3>1. Menstruation</h3><p>Die Gebärmutterschleimhaut wird abgestoßen. Die Blutung dauert meist <b>2 bis 7 Tage</b>.</p>
<h3>2. Follikelphase</h3><p>Sie beginnt ebenfalls mit dem ersten Periodentag. Im Eierstock reifen Follikel heran, Östrogen steigt und die Schleimhaut wird wieder aufgebaut. Die Länge dieser Phase schwankt am stärksten – deshalb unterscheiden sich Zykluslängen vor allem hier.</p>
<h3>3. Eisprung</h3><p>Eine reife Eizelle wird freigesetzt. Sie ist etwa 12 bis 24 Stunden befruchtungsfähig. Weil Spermien bis zu 5 Tage überleben können, umfasst das <b>fruchtbare Fenster</b> etwa die 5 Tage vor dem Eisprung und den Tag des Eisprungs.</p>
<h3>4. Lutealphase</h3><p>Der „Gelbkörper“ bildet Progesteron. Die Basaltemperatur steigt leicht an. Diese Phase ist relativ konstant und dauert oft um die 14 Tage, kann aber individuell abweichen. Ohne Schwangerschaft sinken die Hormone und die nächste Periode beginnt.</p>`,
    sources: ['nhsPeriods', 'acogCycle', 'nhsNfp'],
  },
  {
    id: 'hormone', title: 'Hormone im Zyklus', tag: 'Grundlagen', mins: 2,
    body: `<p>Vier Hormone steuern den Zyklus:</p>
<ul><li><b>FSH</b> (follikelstimulierendes Hormon) lässt Follikel im Eierstock reifen.</li>
<li><b>Östrogen</b> wird vom reifenden Follikel gebildet, baut die Gebärmutterschleimhaut auf und erreicht kurz vor dem Eisprung seinen Höhepunkt.</li>
<li><b>LH</b> (luteinisierendes Hormon) steigt kurz vor dem Eisprung steil an und löst ihn aus. Ovulationstests messen diesen Anstieg.</li>
<li><b>Progesteron</b> wird nach dem Eisprung gebildet, bereitet die Schleimhaut auf eine mögliche Einnistung vor und erhöht die Körpertemperatur leicht.</li></ul>
<p>Viele Menschen bemerken, dass sich Energie, Stimmung, Haut oder Appetit im Zyklusverlauf verändern. Wie stark, ist sehr individuell – genau dafür hilft das Tracking.</p>`,
    sources: ['nhsPeriods', 'fin'],
  },
  {
    id: 'pms', title: 'PMS – das prämenstruelle Syndrom', tag: 'Beschwerden', mins: 3,
    body: `<p>PMS beschreibt körperliche und seelische Beschwerden in den Tagen bis etwa zwei Wochen vor der Periode, die mit Beginn der Blutung nachlassen. Sehr viele Menstruierende kennen zumindest leichte Symptome.</p>
<h3>Typische Beschwerden</h3><ul><li>Stimmungsschwankungen, Reizbarkeit, Niedergeschlagenheit, Angespanntheit</li><li>Brustspannen, Blähungen, Wassereinlagerungen</li><li>Kopfschmerzen, Müdigkeit, Schlafprobleme</li><li>Heißhunger, Hautunreinheiten</li></ul>
<h3>Was helfen kann</h3><ul><li>Regelmäßige Bewegung, ausreichend Schlaf, Stress reduzieren</li><li>Ein Symptom-Tagebuch über mehrere Zyklen – die Analyse in dieser App zeigt, welche Beschwerden bei dir typischerweise vor der Periode auftreten</li><li>Bei starken Beschwerden: ärztliche Beratung, es gibt wirksame Behandlungen</li></ul>
<h3>PMDS</h3><p>Eine schwere Form ist die <b>prämenstruelle dysphorische Störung (PMDS)</b>, bei der vor allem seelische Symptome den Alltag stark beeinträchtigen. Wenn du dich vor der Periode regelmäßig sehr niedergeschlagen, hoffnungslos oder überfordert fühlst, sprich mit deiner Ärztin oder deinem Arzt.</p>`,
    sources: ['nhsPMS', 'fin'],
  },
  {
    id: 'schmerzen', title: 'Regelschmerzen', tag: 'Beschwerden', mins: 2,
    body: `<p>Krampfartige Schmerzen im Unterbauch, die in Rücken und Beine ausstrahlen können, sind während der Periode häufig. Sie entstehen, weil sich die Gebärmuttermuskulatur zusammenzieht.</p>
<h3>Was helfen kann</h3><ul><li>Wärme, z. B. eine Wärmflasche</li><li>Leichte Bewegung wie Spazierengehen, Yoga oder Schwimmen</li><li>Entspannung, Massage des Unterbauchs</li><li>Rezeptfreie Schmerzmittel wie Ibuprofen – Packungsbeilage beachten und im Zweifel in der Apotheke nachfragen</li></ul>
<h3>Ärztlich abklären lassen, wenn …</h3><ul><li>die Schmerzen so stark sind, dass du deinen Alltag nicht bewältigen kannst</li><li>sie stärker werden oder neu auftreten</li><li>du auch außerhalb der Periode, beim Sex oder beim Stuhlgang Schmerzen hast</li></ul>`,
    sources: ['nhsPain', 'fin'],
  },
  {
    id: 'blutung', title: 'Wann ist eine Blutung zu stark?', tag: 'Beschwerden', mins: 2,
    body: `<p>Wie stark „normal“ ist, ist schwer zu schätzen. Als Hinweise auf eine <b>zu starke Periode</b> gelten zum Beispiel:</p>
<ul><li>Binde oder Tampon müssen alle 1–2 Stunden gewechselt werden</li><li>Zusätzlicher Schutz ist nötig oder du musst nachts aufstehen, um zu wechseln</li><li>Blutgerinnsel, die größer als etwa 2,5 cm sind</li><li>Die Blutung dauert länger als 7 Tage</li><li>Du fühlst dich müde, schwach oder kurzatmig (möglicher Eisenmangel)</li></ul>
<p>Starke Blutungen sind häufig und gut behandelbar. Sprich mit deiner Frauenärztin, wenn sie dein Leben beeinträchtigen. Sehr starke Blutungen mit Schwindel oder Kreislaufproblemen sind ein Notfall.</p>`,
    sources: ['nhsHeavy'],
  },
  {
    id: 'unregelmaessig', title: 'Unregelmäßige Zyklen', tag: 'Zyklus', mins: 2,
    body: `<p>Kleine Schwankungen von Zyklus zu Zyklus sind normal. Als unregelmäßig gilt ein Zyklus meist dann, wenn sich die Länge von Monat zu Monat stark unterscheidet – etwa um mehr als 7 bis 9 Tage.</p>
<h3>Häufige Gründe</h3><ul><li>Pubertät und die Jahre vor den Wechseljahren</li><li>Stress, starke Gewichtsveränderungen, intensiver Sport</li><li>Hormonelle Verhütung (ab- oder umsetzen)</li><li>Schwangerschaft und Stillzeit</li><li>Erkrankungen wie PCOS oder Schilddrüsenstörungen</li></ul>
<p>Sprich ärztlich darüber, wenn deine Periode für mehr als drei Monate ausbleibt (ohne Schwangerschaft), Blutungen zwischen den Perioden oder nach dem Sex auftreten oder dein Zyklus regelmäßig kürzer als 21 oder länger als 35 Tage ist.</p>
<p>In dieser App werden Vorhersagen bei unregelmäßigen Zyklen mit einem breiteren Zeitraum angezeigt – ehrlicher als ein einzelnes Datum.</p>`,
    sources: ['nhsIrregular', 'acogCycle'],
  },
  {
    id: 'koerperzeichen', title: 'Basaltemperatur & Zervixschleim', tag: 'Zyklus', mins: 3,
    body: `<p><b>Basaltemperatur</b> ist die Körpertemperatur in Ruhe, gemessen direkt nach dem Aufwachen, vor dem Aufstehen, möglichst immer zur gleichen Zeit. Nach dem Eisprung steigt sie durch Progesteron um etwa 0,2–0,5 °C und bleibt bis zur nächsten Periode erhöht.</p>
<p>Die App sucht in deinen Werten nach einem Anstieg nach der „3-über-6“-Regel: drei Messungen höher als die sechs davor. Wird er gefunden, wird der Eisprung rückblickend geschätzt. Fieber, Alkohol, wenig Schlaf oder späte Messungen verfälschen die Werte.</p>
<p><b>Zervixschleim</b> verändert sich im Zyklus: nach der Periode eher trocken oder klebrig, dann cremig und um den Eisprung klar, dehnbar und „eiweißartig“.</p>
<p><b>Wichtig:</b> Natürliche Familienplanung kann als Verhütungsmethode nur mit genauer Anleitung, konsequenter Anwendung und meist mehreren Körperzeichen zuverlässig sein. Diese App ist <b>kein</b> Verhütungsmittel.</p>`,
    sources: ['nhsNfp'],
  },
  {
    id: 'endometriose', title: 'Endometriose', tag: 'Erkrankungen', mins: 2,
    body: `<p>Bei Endometriose wächst Gewebe, das der Gebärmutterschleimhaut ähnelt, außerhalb der Gebärmutter. Nach Angaben der WHO betrifft das etwa 10 % der Frauen und Mädchen im fortpflanzungsfähigen Alter. Bis zur Diagnose vergehen oft Jahre.</p>
<h3>Mögliche Anzeichen</h3><ul><li>Sehr starke Regelschmerzen, die den Alltag einschränken</li><li>Schmerzen beim oder nach dem Sex</li><li>Schmerzen beim Stuhlgang oder Wasserlassen während der Periode</li><li>Chronische Unterleibsschmerzen, Erschöpfung</li><li>Schwierigkeiten, schwanger zu werden</li></ul>
<p>Wenn dir das bekannt vorkommt, ist ein Gespräch mit deiner Frauenärztin sinnvoll. Ein Symptom-Tagebuch – zum Beispiel der Bericht aus dieser App – kann dabei helfen.</p>`,
    sources: ['whoEndo', 'nhsEndo'],
  },
  {
    id: 'pcos', title: 'PCOS – Polyzystisches Ovarialsyndrom', tag: 'Erkrankungen', mins: 2,
    body: `<p>PCOS ist eine häufige hormonelle Störung. Nach Angaben des NHS betrifft sie etwa jede zehnte Frau.</p>
<h3>Mögliche Anzeichen</h3><ul><li>Unregelmäßige oder ausbleibende Perioden</li><li>Vermehrter Haarwuchs im Gesicht oder am Körper, Haarausfall am Kopf</li><li>Fettige Haut oder Akne</li><li>Gewichtszunahme, Schwierigkeiten schwanger zu werden</li></ul>
<p>PCOS lässt sich nicht mit einer App feststellen. Bei solchen Anzeichen hilft eine ärztliche Untersuchung, oft mit Blutwerten und Ultraschall. Die Beschwerden lassen sich behandeln.</p>`,
    sources: ['nhsPcos'],
  },
  {
    id: 'pille', title: 'Pille & Zyklus', tag: 'Verhütung', mins: 2,
    body: `<p>Bei der kombinierten Pille findet in der Regel kein Eisprung statt. Die Blutung in der Pillenpause ist eine <b>Abbruchblutung</b> durch das Absetzen der Hormone – keine „echte“ Periode wie im natürlichen Zyklus.</p>
<p>Vorhersagen zu Eisprung und fruchtbarem Fenster sind deshalb bei hormoneller Verhütung nicht aussagekräftig. Die App eignet sich dann vor allem, um Blutungen, Symptome, Stimmung und die Einnahme festzuhalten.</p>
<p>Fragen zur Einnahme, vergessenen Pillen oder Nebenwirkungen beantworten die Packungsbeilage, die Apotheke oder deine Frauenärztin.</p>`,
    sources: ['fin'],
  },
  {
    id: 'arzt', title: 'Wann zur Frauenärztin?', tag: 'Gesundheit', mins: 1,
    body: `<p>Diese App ersetzt keine ärztliche Beratung. Ein Termin ist besonders sinnvoll bei:</p>
<ul><li>Periode bleibt über drei Monate aus (ohne Schwangerschaft) oder der Zyklus ist regelmäßig kürzer als 21 bzw. länger als 35 Tage</li><li>Blutungen länger als 7 Tage oder sehr stark</li><li>Blutungen zwischen den Perioden, nach dem Sex oder nach den Wechseljahren</li><li>Starke Schmerzen, die den Alltag einschränken</li><li>Ungewöhnlicher Ausfluss, Juckreiz oder Brennen</li><li>Starke seelische Beschwerden vor der Periode</li></ul>
<p><b>Tipp:</b> Unter „Mehr → Gesundheitsbericht“ kannst du einen Bericht als PDF erstellen und zum Termin mitnehmen.</p>`,
    sources: ['nhsPeriods', 'nhsIrregular', 'fin'],
  },
];
