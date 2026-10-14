// Reproductor del stream Icecast. Lógica portada de radio-expres-reloaded:
// stop real (corta la descarga), reconexión con backoff, anti buffer-bloat,
// metadata por status-json.xsl y carátula vía iTunes.
// Usa: Vue (global) y cleanTitle / pickSource / splitTitle de lib.js.

const META_INTERVAL = 12_000;   // polling de "ahora suena"
const MAX_BUFFER_AHEAD = 8;     // s de buffer por encima de esto → recarga silenciosa
const MAX_RECONNECT = 6;        // reintentos: 2s·4s·6s·8s·10s·10s
const STALL_GRACE = 6_000;      // tiempo que se tolera un 'stalled' antes de reconectar
const VOL_KEY = 'classic:volume';

function createPlayer(cfg) {
  const mountPath = new URL(cfg.streamUrl).pathname;
  const audio = new Audio();
  audio.preload = 'none';

  // Visualizador real (Web Audio) solo en equipos con mouse. En celulares el
  // audio que pasa por un AudioContext se corta con la pantalla bloqueada (iOS),
  // y ahí importa más que siga sonando: se usa la animación simulada.
  const realViz = cfg.visualizer !== false && matchMedia('(pointer: fine)').matches;
  if (realViz) audio.crossOrigin = 'anonymous'; // requiere CORS en Icecast (ver README)

  // iOS no deja cambiar el volumen desde la web (manda el botón del teléfono):
  // ahí audio.volume no cambia al asignarlo, y solo se ofrece silenciar.
  const probe = new Audio();
  probe.volume = 0.5;
  const canSetVolume = probe.volume === 0.5;

  const saved = readVolume();
  const state = Vue.reactive({
    playing: false,
    loading: false,
    status: '',          // mensaje para el usuario (reconexión, errores)
    volume: saved.volume, // 0–100
    muted: saved.muted,
    title: '',
    artist: '',
    artwork: null,
    year: null,           // año de la canción si viene en el título
    metaReady: false,     // false → la UI muestra skeleton
    realViz,
    canSetVolume,
  });
  const player = { state, analyser: null, toggle, start, stop, setVolume, toggleMute };

  let userStopped = true;  // true = el usuario detuvo; no reconectar
  let attempts = 0;
  let retryTimer = null;
  let stallTimer = null;
  let bufferTimer = null;
  let lastRaw = null;
  let ctx = null;
  const artCache = new Map();

  applyVolume();

  // ── Eventos del <audio> ──────────────────────────────────────────
  audio.addEventListener('playing', () => {
    Object.assign(state, { playing: true, loading: false, status: '' });
    attempts = 0;
    clearTimeout(stallTimer);
    setSessionState('playing');
  });
  audio.addEventListener('waiting', () => { if (!userStopped) state.loading = true; });
  audio.addEventListener('error', () => { if (!userStopped) scheduleReconnect(); });
  audio.addEventListener('ended', () => { if (!userStopped) scheduleReconnect(); });
  audio.addEventListener('stalled', () => {
    if (userStopped) return;
    state.loading = true;
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => { if (!userStopped && state.loading) scheduleReconnect(); }, STALL_GRACE);
  });
  // Volvió la red: no esperar al próximo reintento.
  addEventListener('online', () => {
    if (userStopped || state.playing) return;
    clearTimeout(retryTimer); retryTimer = null; attempts = 0;
    connect();
  });

  // ── Control ──────────────────────────────────────────────────────
  function toggle() { (state.playing || state.loading) ? stop() : start(); }

  function start() {
    userStopped = false;
    attempts = 0;
    state.status = '';
    setupAnalyser();
    connect();
  }

  function stop() {
    userStopped = true;
    clearTimeout(retryTimer); retryTimer = null;
    clearTimeout(stallTimer);
    clearInterval(bufferTimer);
    // En vivo no se "pausa": se suelta la conexión para no acumular buffer.
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    Object.assign(state, { playing: false, loading: false, status: '' });
    setSessionState('paused');
  }

  async function connect() {
    state.loading = true;
    audio.src = `${cfg.streamUrl}?t=${Date.now()}`; // evita caché / reanuda en vivo
    applyVolume();
    ctx?.resume();
    try {
      await audio.play();
      startBufferMonitor();
    } catch (e) {
      if (userStopped) return;
      if (e.name === 'NotAllowedError') { // el navegador exige un toque del usuario
        Object.assign(state, { loading: false, status: 'Toca reproducir para escuchar.' });
        userStopped = true;
        return;
      }
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (userStopped || retryTimer) return; // 'error' y play() rechazado llegan juntos
    state.playing = false;
    if (attempts >= MAX_RECONNECT) {
      stop();
      state.status = 'Sin conexión con la emisora. Toca reproducir para reintentar.';
      return;
    }
    attempts++;
    state.loading = true;
    state.status = `Se cortó la señal. Reconectando… (${attempts}/${MAX_RECONNECT})`;
    retryTimer = setTimeout(() => { retryTimer = null; if (!userStopped) connect(); },
      Math.min(2000 * attempts, 10_000));
  }

  // El navegador acumula buffer de un stream en vivo y termina desfasado o con
  // cortes; si va muy adelantado, se recarga sin tocar la UI.
  function startBufferMonitor() {
    clearInterval(bufferTimer);
    bufferTimer = setInterval(() => {
      if (!state.playing || !audio.buffered.length) return;
      const ahead = audio.buffered.end(audio.buffered.length - 1) - audio.currentTime;
      if (ahead > MAX_BUFFER_AHEAD) {
        audio.src = `${cfg.streamUrl}?t=${Date.now()}`;
        audio.play().catch(() => {});
      }
    }, 15_000);
  }

  // ── Volumen ──────────────────────────────────────────────────────
  function setVolume(v) {
    state.volume = Math.max(0, Math.min(100, Number(v)));
    state.muted = state.volume === 0;
    applyVolume();
  }
  function toggleMute() {
    state.muted = !state.muted;
    if (!state.muted && state.volume === 0) state.volume = 60;
    applyVolume();
  }
  function applyVolume() {
    audio.volume = state.volume / 100; // iOS lo ignora: ahí manda el volumen del equipo
    audio.muted = state.muted;
    try { localStorage.setItem(VOL_KEY, JSON.stringify({ volume: state.volume, muted: state.muted })); } catch {}
  }
  function readVolume() {
    try {
      const v = JSON.parse(localStorage.getItem(VOL_KEY));
      if (Number.isFinite(v?.volume)) return { volume: v.volume, muted: !!v.muted };
    } catch {}
    return { volume: 80, muted: false };
  }

  // ── Visualizador (Web Audio) ─────────────────────────────────────
  // Se crea en el primer play: el AudioContext necesita un gesto del usuario.
  function setupAnalyser() {
    if (!state.realViz || ctx) return;
    try {
      ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      ctx.createMediaElementSource(audio).connect(analyser).connect(ctx.destination);
      player.analyser = analyser;
    } catch {
      state.realViz = false;
    }
  }

  // ── "Ahora suena" ────────────────────────────────────────────────
  async function fetchMeta() {
    if (document.hidden && !state.playing) return;
    try {
      const res = await fetch(cfg.statusUrl, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(res.status);
      const raw = cleanTitle(pickSource(await res.json(), mountPath)?.title);
      if (raw === lastRaw) return;
      lastRaw = raw;
      state.year = yearOf(raw);
      if (!raw) {
        Object.assign(state, { title: cfg.name, artist: cfg.slogan, artwork: null });
      } else {
        Object.assign(state, splitTitle(raw));
        fetchArtwork(raw);
      }
    } catch {
      // Sin metadata: se conserva lo último; si nunca llegó, se muestra la emisora.
      if (!state.title) Object.assign(state, { title: cfg.name, artist: cfg.slogan });
    }
    state.metaReady = true;
    updateSession();
  }

  async function fetchArtwork(raw) {
    if (!artCache.has(raw)) {
      let url = null;
      try {
        const term = state.artist ? `${state.artist} ${state.title}` : raw;
        const res = await fetch(`https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent(term)}`,
          { signal: AbortSignal.timeout(4000) });
        const hit = (await res.json()).results?.[0];
        url = hit?.artworkUrl100?.replace('100x100', '600x600') ?? null;
      } catch {}
      artCache.set(raw, url);
    }
    if (raw === lastRaw) { state.artwork = artCache.get(raw); updateSession(); }
  }

  fetchMeta();
  setInterval(fetchMeta, META_INTERVAL);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fetchMeta(); });

  // ── Media Session (pantalla de bloqueo / notificación) ───────────
  const ms = navigator.mediaSession;
  if (ms) {
    ms.setActionHandler('play', start);
    ms.setActionHandler('pause', stop);
    try { ms.setActionHandler('stop', stop); } catch {}
  }
  function setSessionState(s) { if (ms) ms.playbackState = s; }
  function updateSession() {
    if (!ms || !window.MediaMetadata) return;
    const art = state.artwork
      ? [{ src: state.artwork, sizes: '600x600', type: 'image/jpeg' }]
      : cfg.artwork;
    ms.metadata = new MediaMetadata({
      title: state.title || cfg.name,
      artist: state.artist || cfg.slogan,
      album: `${cfg.name} · En vivo`,
      artwork: art,
    });
  }
  updateSession();

  return player;
}
