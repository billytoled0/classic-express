// ─────────────────────────────────────────────────────────────────────
//  Configuración de CLASSIC. Es el único archivo que hay que editar para
//  cambiar el stream, los textos de marca, las redes o el contacto.
//  (Sitio estático = sin variables de entorno; este archivo cumple ese rol.)
//  Ojo: el título y las etiquetas Open Graph están escritos en index.html
//  porque WhatsApp/Google no ejecutan JS. Si cambias el nombre, cámbialos allá.
// ─────────────────────────────────────────────────────────────────────
const CLASSIC_CONFIG = {
  name: 'CLASSIC',
  slogan: 'Los clásicos de siempre.',

  // Mount de Icecast2 y su endpoint de estado. Ambos deben ser HTTPS (ver README).
  streamUrl: 'https://sonic.sistemahost.es:7118/live2',
  statusUrl: 'https://sonic.sistemahost.es:7118/status-json.xsl',

  // false = siempre animación simulada (úsalo si Icecast deja de enviar CORS).
  visualizer: true,

  // Blog: URL del backend que devuelve los artículos en JSON (ver README, "Blog").
  // null = la página /blog muestra "Pronto".
  blogUrl: null,

  // Zona horaria de la emisora: define qué programa está "Al aire".
  timezone: 'America/Lima',

  // Logos web (derivados de assets/logos/, que guarda los originales).
  logos: {
    header: 'assets/img/logo-header.webp', // horizontal texto blanco, sin lema
    icon: 'assets/img/icon.webp',          // círculo rojo con C blanca
  },

  // Carátula para la pantalla de bloqueo cuando la canción no tiene portada.
  artwork: [
    { src: 'assets/logos/icono-circular-rojo-cromado.png', sizes: '195x195', type: 'image/png' },
  ],

  contact: {
    whatsapp: '51900000000',          // solo dígitos, con código de país. PENDIENTE
    whatsappLabel: '+51 900 000 000', // como se muestra en pantalla. PENDIENTE
    email: 'contacto@classicforever.com', // PENDIENTE confirmar
    city: 'Perú',                     // PENDIENTE
  },

  // type: facebook | instagram | youtube | tiktok | x  (cualquier otro → ícono de enlace)
  socials: [
    { type: 'facebook', label: 'Facebook', url: 'https://facebook.com/' },   // PENDIENTE
    { type: 'instagram', label: 'Instagram', url: 'https://instagram.com/' }, // PENDIENTE
  ],
};
