// App: navegación por hash (el <audio> vive fuera de las vistas, así que la
// radio no se corta al cambiar de página), capítulos de la página y contacto.
// Scripts clásicos (no módulos) para que funcione con doble clic en index.html:
// Vue, CLASSIC_CONFIG, CLASSIC_DATA, lib.js y player.js ya están cargados.
const { createApp, ref, reactive, computed, watch, nextTick } = Vue;
const cfg = CLASSIC_CONFIG;

const NAV = [
  { id: '', label: 'Inicio' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'programacion', label: 'Programación' },
  { id: 'contacto', label: 'Contacto' },
];
// Color del primer capítulo de cada página: la barra superior lo continúa.
const HEADER_TONE = { '': 'paper', nosotros: 'ink', programacion: 'paper', contacto: 'red' };

// TEXTO DE EJEMPLO: lo que suena de cada década (confirmar con la radio)
const DECADES = [
  { id: '60', fact: 'Baladas, twist y la invasión británica' },
  { id: '70', fact: 'Soul, disco y los grandes cantautores' },
  { id: '80', fact: 'Pop, new wave y baladas en español' },
  { id: '90', fact: 'Los éxitos que cerraron el siglo' },
];

// Tira de fotos de "Pide tu canción" (se repite dos veces para el desplazamiento continuo)
const STRIP = [
  ['buscando-discos', 'l'], ['rockola-wurlitzer-600a', 'p'], ['radio-sony-tr730', 'q'],
  ['disqueria-1963', 'l'], ['tocadiscos-philips', 'p'], ['microfonos-estudio', 'l'],
  ['rockola-wurlitzer-1100', 'q'], ['tocadiscos-zenith', 'l'], ['estudio-radio-1950s', 'p'],
].map(([name, shape]) => ({ src: `assets/archivo/${name}.webp`, shape }));

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const player = createPlayer(cfg);
const p = player.state;

// ── Estado compartido por la app y sus componentes ──
const hosts = CLASSIC_DATA.conductores ?? [];
const shows = CLASSIC_DATA.programas ?? [];
const liveDecade = computed(() => (p.playing || p.metaReady) ? decadeOf(p.year) : null);

const waLink = (text = '') =>
  `https://wa.me/${cfg.contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
const form = reactive({ name: '', message: '', errors: {} });
function sendForm() {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Cuéntanos tu nombre.';
  if (form.message.trim().length < 3) errors.message = 'Dinos qué canción quieres escuchar.';
  form.errors = errors;
  if (Object.keys(errors).length) {
    document.getElementById(errors.name ? 'f-name' : 'f-song').focus();
    return;
  }
  window.open(waLink(`Hola ${cfg.name}, soy ${form.name.trim()}. Quiero pedir: ${form.message.trim()}`), '_blank', 'noopener');
}

const shared = { cfg, p, player, hosts, DECADES, STRIP, liveDecade, form, sendForm, waLink };

// ── Entradas al hacer scroll: una vez por elemento, nunca se repiten ──
// Sin JS o sin IntersectionObserver todo queda visible (las clases de CSS dependen de html.js).
const io = 'IntersectionObserver' in window && new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
function watchReveals() {
  const els = document.querySelectorAll('[data-reveal]:not(.is-in), .prints-title:not(.is-in)');
  els.forEach((el) => (io ? io.observe(el) : el.classList.add('is-in')));
}

// Barras del ecualizador: alturas y tiempos fijos pero distintos entre sí,
// para que la animación simulada no se vea mecánica.
const makeBars = (n) => Array.from({ length: n }, (_, i) => ({
  '--h': (0.3 + 0.65 * Math.abs(Math.sin(i * 1.7 + 0.4))).toFixed(2),
  '--d': `${(0.42 + (i % 5) * 0.11).toFixed(2)}s`,
  '--delay': `${(-i * 0.137).toFixed(2)}s`,
}));

createApp({
  setup() {
    // ── Rutas ──
    const readRoute = () => {
      const r = location.hash.replace(/^#\/?/, '');
      return NAV.some((n) => n.id === r) ? r : '';
    };
    const route = ref(readRoute());
    const headerTone = computed(() => HEADER_TONE[route.value]);
    const setTitle = () => {
      const n = NAV.find((x) => x.id === route.value);
      document.title = route.value ? `${n.label} · ${cfg.name}` : `${cfg.name} — ${cfg.slogan}`;
    };
    const focusMain = () => document.querySelector('main h1')?.focus();
    const afterRender = () => {
      watchReveals();
      // El clip de archivo es decorativo: quieto si el sistema pide reducir movimiento.
      if (reduceMotion.matches) document.querySelectorAll('video[autoplay]').forEach((v) => v.pause());
    };
    addEventListener('hashchange', async () => {
      if (location.hash === '#main') return;
      route.value = readRoute();
      volOpen.value = false;
      setTitle();
      scrollTo(0, 0);
      await nextTick();
      afterRender();
      focusMain(); // lectores de pantalla anuncian la nueva página
    });
    setTitle();
    nextTick(afterRender);

    // ── Programación y reloj de la emisora ──
    const now = ref(nowIn(cfg.timezone));
    setInterval(() => { now.value = nowIn(cfg.timezone); }, 30_000);
    const day = ref(now.value.day);
    const dayShows = computed(() => showsFor(shows, day.value));
    const hasShows = shows.length > 0;
    const tzLabel = cfg.timezone.split('/').pop().replace(/_/g, ' ');
    const clock = computed(() => {
      const m = now.value.min;
      return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    });

    // ── Ecualizador ──
    const eqClass = computed(() => ({ 'is-on': p.playing, 'is-sim': !p.realViz }));

    // Con visualizador real, cada frame escala las barras según el espectro.
    let raf = 0;
    let deadFrames = 0;
    let lastSum = -1;
    const freq = new Uint8Array(64);
    const resetBars = () => document.querySelectorAll('.eq > span').forEach((s) => { s.style.transform = ''; });
    function draw() {
      player.analyser.getByteFrequencyData(freq);
      // Algunos navegadores (Safari con streams en vivo, bloqueos anti-fingerprinting)
      // entregan el espectro vacío o congelado aunque el audio suene. Si pasa
      // ~2 s seguidos, se cambia a la animación simulada.
      const sum = freq.reduce((a, b) => a + b, 0);
      deadFrames = (sum < 64 || sum === lastSum) ? deadFrames + 1 : 0;
      lastSum = sum;
      if (deadFrames > 120) { p.realViz = false; resetBars(); return; }
      for (const eq of document.querySelectorAll('.eq')) {
        const bars = eq.children;
        for (let i = 0; i < bars.length; i++) {
          // ~44 de 64 bins: por encima de ~15 kHz casi no hay señal
          const v = freq[Math.floor((i * 44) / bars.length)] / 255;
          bars[i].style.transform = `scaleY(${Math.min(1, Math.max(0.06, v * v * 0.92)).toFixed(3)})`;
        }
      }
      raf = requestAnimationFrame(draw);
    }
    watch(() => p.playing, (on) => {
      cancelAnimationFrame(raf);
      deadFrames = 0;
      if (on && p.realViz && player.analyser) raf = requestAnimationFrame(draw);
      else resetBars();
    });

    // ── Volumen en celular ──
    const mobile = matchMedia('(max-width: 767px)');
    const isMobile = ref(mobile.matches);
    mobile.addEventListener('change', (e) => { isMobile.value = e.matches; });
    const volPanel = computed(() => isMobile.value && p.canSetVolume);
    const volOpen = ref(false);
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.pb-vol')) volOpen.value = false; });

    return {
      ...shared,
      NAV, DAYS, DAY_LABELS, route, headerTone, focusMain,
      now, day, dayShows, hasShows, tzLabel, clock, onAir,
      volPanel, volOpen,
      eqClass, bars24: makeBars(24), bars16: makeBars(16),
      year: new Date().getFullYear(),
    };
  },
})
  .component('decade-list', { template: '#tpl-decades', setup: () => shared })
  .component('print-wall', { template: '#tpl-prints' })
  .component('voices-panel', { template: '#tpl-voices', setup: () => shared })
  .component('song-request', { template: '#tpl-request', props: { level: { default: 'h2' } }, setup: () => shared })
  .mount('#app');
