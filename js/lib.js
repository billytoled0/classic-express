// Funciones puras (sin DOM ni Vue) para poder testearlas con Node: tests/lib.test.mjs
// Script clásico: sus constantes quedan globales para player.js y app.js.

// ── Metadata Icecast ───────────────────────────────────────────────

// Icecast a veces manda el título con BOM (\uFEFF) y espacios sobrantes.
const cleanTitle = (t) => (t ?? '').replace(/\uFEFF/g, '').trim();

// status-json.xsl devuelve `source` como objeto (1 mount) o array (varios).
// Se elige el mount por el final de `listenurl`, porque Icecast reporta su URL
// interna (http://host:8238/live2), no la pública (https://host:7118/live2).
function pickSource(status, mountPath) {
  const src = status?.icestats?.source;
  if (!Array.isArray(src)) return src ?? null;
  return src.find((s) => s.listenurl?.endsWith(mountPath)) ?? null;
}

// "Artista - Título" → { artist, title }. Si no hay " - ", todo es título.
function splitTitle(raw) {
  const i = raw.indexOf(' - ');
  if (i === -1) return { artist: '', title: raw };
  return { artist: raw.slice(0, i).trim(), title: raw.slice(i + 3).trim() };
}

// Año de la canción si viene en el título ("Overkill (1983)", "Mull Of Kintyre - 1977").
function yearOf(raw) {
  const m = (raw ?? '').match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  return m ? Number(m[1]) : null;
}

// Década que CLASSIC programa (60–90) o null si cae fuera.
function decadeOf(year) {
  return year >= 1960 && year < 2000 ? String(Math.floor(year / 10) % 10 * 10) : null;
}

// ── Programación ───────────────────────────────────────────────────

const DAYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const DAY_LABELS = {
  lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves',
  vie: 'Viernes', sab: 'Sábado', dom: 'Domingo',
};

function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Día y minuto actuales en la zona horaria de la emisora, no la del oyente.
function nowIn(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday);
  return { day: DAYS[wd], min: Number(p.hour) * 60 + Number(p.minute) };
}

const showsFor = (shows, day) =>
  shows.filter((s) => s.dias.includes(day)).sort((a, b) => toMin(a.inicio) - toMin(b.inicio));

// ponytail: no hay programas que crucen la medianoche; se cargan como dos
// entradas (p. ej. 22:00–24:00 y 00:00–02:00). "24:00" es válido como fin.
const onAir = (show, now) =>
  show.dias.includes(now.day) && toMin(show.inicio) <= now.min && now.min < toMin(show.fin);

if (typeof module === 'object') module.exports = { cleanTitle, pickSource, splitTitle, yearOf, decadeOf, DAYS, DAY_LABELS, toMin, nowIn, showsFor, onAir };
