// App: navegación por hash (el <audio> vive fuera de las vistas, así que la
// radio no se corta al cambiar de página), programación y contacto.
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
const ICONS = ['facebook', 'instagram', 'youtube', 'tiktok', 'x'];

const player = createPlayer(cfg);

// Barras del ecualizador: alturas y tiempos fijos pero distintos entre sí,
// para que la animación simulada no se vea mecánica.
const makeBars = (n) => Array.from({ length: n }, (_, i) => ({
  '--h': (0.3 + 0.65 * Math.abs(Math.sin(i * 1.7 + 0.4))).toFixed(2),
  '--d': `${(0.42 + (i % 5) * 0.11).toFixed(2)}s`,
  '--delay': `${(-i * 0.137).toFixed(2)}s`,
}));

const ShowList = {
  props: ['shows', 'now'],
  setup: () => ({ onAir }),
  template: `
    <ol v-if="shows.length" class="shows">
      <li v-for="s in shows" :key="s.nombre + s.inicio" :class="{ onair: onAir(s, now) }">
        <time class="mono">{{ s.inicio }}–{{ s.fin }}</time>
        <div>
          <h3>{{ s.nombre }}</h3>
          <p v-if="s.conductor" class="host">Con {{ s.conductor }}</p>
          <p class="desc">{{ s.descripcion }}</p>
        </div>
        <span v-if="onAir(s, now)" class="badge"><span class="live-dot on"></span>Al aire</span>
      </li>
    </ol>
    <div v-else class="empty">
      <strong>Música continua</strong>
      <p>No hay programas este día: suenan los clásicos de siempre, sin interrupciones.</p>
    </div>`,
};

const HostList = {
  props: ['hosts'],
  template: `
    <ul class="hosts">
      <li v-for="h in hosts" :key="h.nombre">
        <img :src="h.foto" alt="" loading="lazy" width="480" height="600" />
        <h3>{{ h.nombre }}</h3>
        <p v-if="h.descripcion" class="muted">{{ h.descripcion }}</p>
      </li>
    </ul>`,
};

createApp({
  setup() {
    // ── Rutas ──
    const readRoute = () => {
      const r = location.hash.replace(/^#\/?/, '');
      return NAV.some((n) => n.id === r) ? r : '';
    };
    const route = ref(readRoute());
    const setTitle = () => {
      const n = NAV.find((x) => x.id === route.value);
      document.title = route.value ? `${n.label} · ${cfg.name}` : `${cfg.name} — ${cfg.slogan}`;
    };
    const focusMain = () => document.querySelector('main h1')?.focus();
    addEventListener('hashchange', async () => {
      if (location.hash === '#main') return;
      route.value = readRoute();
      volOpen.value = false;
      setTitle();
      scrollTo(0, 0);
      await nextTick();
      focusMain(); // lectores de pantalla anuncian la nueva página
    });
    setTitle();

    // ── Programación ──
    const shows = CLASSIC_DATA.programas ?? [];
    const hosts = CLASSIC_DATA.conductores ?? [];

    const now = ref(nowIn(cfg.timezone));
    setInterval(() => { now.value = nowIn(cfg.timezone); }, 30_000);
    const day = ref(now.value.day);
    const dayShows = computed(() => showsFor(shows, day.value));
    const todayShows = computed(() => showsFor(shows, now.value.day));
    const current = computed(() => shows.find((s) => onAir(s, now.value)));
    const hasShows = computed(() => shows.length > 0);
    const tzLabel = cfg.timezone.split('/').pop().replace(/_/g, ' ');

    // ── Ecualizador ──
    const p = player.state;
    const eqClass = computed(() => ({ 'is-on': p.playing, 'is-sim': !p.realViz }));

    // Con visualizador real, cada frame escala las barras según el espectro.
    let raf = 0;
    let deadFrames = 0;
    let lastSum = -1;
    const freq = new Uint8Array(64);
    const resetBars = () => document.querySelectorAll('.eq > span').forEach((s) => { s.style.transform = ''; });
    function draw() {
      player.analyser.getByteFrequencyData(freq);
      // Brave (Shields anti-fingerprinting) y Safari con streams en vivo pueden
      // entregar el espectro vacío o congelado aunque el audio suene. Si pasa
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

    // ── Contacto ──
    const waLink = (text = '') =>
      `https://wa.me/${cfg.contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    const form = reactive({ name: '', message: '', errors: {} });
    function sendForm() {
      const errors = {};
      if (!form.name.trim()) errors.name = 'Cuéntanos tu nombre.';
      if (form.message.trim().length < 5) errors.message = 'Escribe tu mensaje (mínimo 5 caracteres).';
      form.errors = errors;
      if (Object.keys(errors).length) {
        document.getElementById(errors.name ? 'f-name' : 'f-msg').focus();
        return;
      }
      window.open(waLink(`Hola ${cfg.name}, soy ${form.name.trim()}. ${form.message.trim()}`), '_blank', 'noopener');
    }

    return {
      cfg, NAV, DAYS, DAY_LABELS, route, focusMain,
      player, p,
      now, day, dayShows, todayShows, current, tzLabel, hasShows, hosts,
      volPanel, volOpen,
      eqClass, bars24: makeBars(24), bars16: makeBars(16),
      form, sendForm, waLink,
      icon: (t) => (ICONS.includes(t) ? t : 'link'),
      year: new Date().getFullYear(),
    };
  },
})
  .component('show-list', ShowList)
  .component('host-list', HostList)
  .mount('#app');
