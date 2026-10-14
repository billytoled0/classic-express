# CLASSIC — sitio web de la radio

> Los clásicos de siempre... siempre contigo.

Sitio estático (HTML + CSS + Vue 3 por CDN, con scripts clásicos sin módulos). No hay build, `npm install` ni backend.

## Correrlo en local

Abre `index.html` con doble clic y listo. Lo único que no carga desde un archivo local es la carátula de la canción (iTunes bloquea `file://`). Para verlo exactamente como en producción:

```sh
python3 -m http.server 8080      # o: npx serve .
# abrir http://localhost:8080
```

Test de la lógica (metadata y horarios): `node tests/lib.test.mjs`

## Estructura

```
index.html               ← páginas, reproductor, SEO / Open Graph
config.js                ← stream, textos, redes, contacto  ← EDITAR AQUÍ
data/programacion.js     ← programas y conductores          ← EDITAR AQUÍ
css/style.css            ← estilos (colores en :root)
js/player.js             ← reproductor (stream, reconexión, metadata, Media Session)
js/app.js                ← navegación, programación, contacto, visualizador
js/lib.js                ← funciones puras (testeadas)
assets/logos/            ← logos originales de la marca
assets/img/              ← versiones web de los logos
assets/archivo/          ← fotos y video de archivo (créditos en credits.json y en el footer)
.taste-skill/            ← notas y capturas del rediseño (no se publica; se puede borrar)
```

## Diseño

Dirección "capítulos de color": cada sección es un campo plano a pantalla completa en los tres colores de la marca (blanco, rojo `#FF0000` y negro). Tipografía Stack Sans (Headline 300 para los títulos y Text para el resto), cinco tamaños y esquinas cuadradas. No hay líneas finas, sombras, degradados ni efecto vidrio. La única excepción son las barras del ecualizador, que llevan el degradado del logo.

- **Hero:** "Clásicos en vivo" cortado por la costura blanco/rojo. En el campo rojo aparecen el play y lo que suena ahora (Icecast, en vivo).
- **Décadas:** si el título de la canción trae el año (p. ej. "Overkill (1983)"), esa década se enciende en rojo con "Sonando ahora".
- **Fotos de archivo:** rock clásico (conciertos de 1970, guitarras, Marshall, batería) más tocadiscos, rockolas y discos, en blanco y negro como tratamiento único. Para cambiar una, reemplaza el `.webp` en `assets/archivo/` y actualiza su crédito en el footer de `index.html`.
- **Movimiento:** los títulos suben desde su línea, las secciones entran al hacer scroll, la tira de fotos se desplaza y el clip del disco gira en loop. Con "Reducir movimiento" activado en el sistema, todo eso se apaga; el vinilo y el ecualizador siguen, porque solo se mueven al dar play.
- **Revisión de calidad:** `node ~/.claude/skills/design-taste-frontend/scripts/inspect.mjs index.html --allow covered-text`. La regla `covered-text` se permite porque el inspector cuenta como "tapado" el texto que pasa por detrás de la barra fija del reproductor.

## Configurar el stream

En `config.js`:

| Clave | Qué es |
|---|---|
| `streamUrl` | URL del mount de Icecast2, p. ej. `https://servidor:7118/live2` |
| `statusUrl` | `https://servidor:7118/status-json.xsl` |
| `visualizer` | `true` = ecualizador real con Web Audio (en equipos con mouse); `false` = siempre simulado |
| `timezone` | Zona horaria de la programación (`America/Lima`, `America/Bogota`, …) |

"Ahora suena" busca en `status-json.xsl` el mount cuya `listenurl` termina en el mismo path que `streamUrl` (`/live2`). Si no hay título, muestra el nombre y el eslogan de la radio.

### Dos problemas típicos

**1. Mixed content.** Si el sitio va en HTTPS (que es lo normal) y el stream en `http://`, el navegador bloquea el audio. El stream y el status **tienen que ser HTTPS**. El servidor actual (`sonic.sistemahost.es:7118`) ya lo es. Si algún día cambia a HTTP, hay dos salidas: activar SSL en Icecast (`<listen-socket>` con `<ssl>1</ssl>` y un certificado) o ponerle delante un proxy HTTPS (nginx/Caddy).

**2. CORS.** Para leer `status-json.xsl` desde el navegador y para usar el visualizador real, Icecast tiene que enviar `Access-Control-Allow-Origin`. **El servidor actual ya lo envía** (verificado). Si lo pierde:
- La metadata falla y se muestra el nombre de la radio.
- El audio **también falla** en escritorio, porque el visualizador pide el stream en modo CORS. Solución inmediata: `visualizer: false` en `config.js`.
- Solución de fondo, en `icecast.xml`:
  ```xml
  <http-headers>
    <header name="Access-Control-Allow-Origin" value="*" />
  </http-headers>
  ```

## Blog

La página `#/blog` pide los artículos a tu backend la primera vez que alguien entra. Configúralo en `config.js`:

```js
blogUrl: 'https://api.classicforever.com/posts',   // null = muestra "Pronto"
```

El backend responde JSON, como una lista o como `{ "posts": [...] }`:

```json
{ "posts": [
  { "titulo": "Por qué 1971 fue el mejor año del rock",
    "fecha": "2026-10-10",
    "resumen": "Una línea o dos.",
    "imagen": "https://api.classicforever.com/img/1971.jpg",
    "url": "https://classicforever.com/blog/1971" }
] }
```

- **Campos:** `titulo` y `url` son obligatorios; sin ellos el artículo no se muestra. `fecha` (ISO), `resumen` e `imagen` son opcionales. Se ordenan del más nuevo al más viejo.
- **Enlaces:** solo se aceptan `https://`, `http://` o rutas que empiecen con `/`. Cualquier otra cosa (`javascript:`, `data:`) se descarta (`normalizePosts` en `js/lib.js`, con tests).
- **Artículo completo:** cada artículo enlaza a su `url`, así que la página del artículo la sirve el backend. Si prefieres mostrarlo dentro del sitio, se puede agregar `#/blog/<slug>` más adelante.
- **CORS:** si el backend está en otro dominio, tiene que responder con `Access-Control-Allow-Origin` (por ejemplo `https://classicforever.com`).
- **Ruta:** como el sitio es estático, la ruta es `#/blog`. Si más adelante quieres `/blog` "de verdad" servido por el backend, cambia el enlace del menú en `js/app.js` (`NAV`).

## Programación

Se edita en `data/programacion.js`:

```json
{ "nombre": "Lado A", "conductor": "", "descripcion": "…",
  "dias": ["lun","mar","mie","jue","vie"], "inicio": "09:00", "fin": "13:00" }
```

- `dias`: `lun mar mie jue vie sab dom`.
- Las horas van en la zona horaria de `config.js`. `fin` puede ser `24:00`.
- Un programa que cruza la medianoche se carga como dos entradas.
- Si un día no tiene programas, se muestra "Música continua". Con la lista vacía (como ahora), Programación muestra solo ese mensaje e Inicio oculta "Lo que suena hoy".

## Logos

`assets/logos/` guarda los **originales** (PNG), renombrados por variante:

| Archivo | Variante | Uso en el sitio |
|---|---|---|
| `classic-horizontal-texto-blanco.png` | horizontal, texto blanco | header y footer (vía `assets/img/logo-header.webp`, sin el lema) |
| `classic-horizontal-texto-negro.png` | horizontal, texto negro | — (para fondos claros / impresos) |
| `icono-circular-rojo-blanco.png` | círculo rojo, C blanca | favicon y etiqueta del vinilo (`assets/img/icon.*`) |
| `icono-circular-rojo-cromado.png` | círculo rojo, vinilo cromado | carátula en la pantalla de bloqueo |
| `icono-cuadrado-negro-rojo.png` | cuadrado negro/rojo/blanco | ícono al guardar en el inicio del iPhone |
| `icono-cuadrado-negro-rojo-texto.png` | ídem con "CLASSIC" | — |
| `icono-cuadrado-blanco-negro-texto.png` | blanco y negro con "CLASSIC" | — |

`assets/img/` tiene las versiones web derivadas (webp). `assets/og.png` (1200×630) es la imagen para compartir.

Los originales son chicos (~200 px los íconos, 819 px el horizontal) y no hay SVG: en pantallas retina el vinilo grande del inicio se ve algo suave. **Si consigues el logo en SVG o PNG de 1000 px o más**, reemplaza los archivos y regenera los de `assets/img/`.

Color: el rojo de los logos es `#FF0000` exacto y el sitio usa ese. Con texto blanco encima el contraste es 4:1, que solo cumple AA en texto grande, así que los botones rojos llevan texto de 19 px o más en negrita, o solo un ícono.

## Conductores

Van en `data/programacion.js` → `conductores` (nombre y `descripcion`; las actuales son texto de ejemplo). Se muestran en el panel "Las voces de CLASSIC" (Inicio y Nosotros), junto a una foto de archivo de un concierto de rock de 1970 recortada en forma de disco.

## SEO / compartir en WhatsApp

El título, la descripción y las etiquetas Open Graph están escritas en el `<head>` de `index.html`, porque WhatsApp y Google no ejecutan JavaScript. Usan el dominio `https://classicforever.com/` (también en `canonical`). Si el dominio cambia, actualiza esas tres URLs: tienen que ser absolutas.

## Desplegar

Se puede subir a cualquier hosting estático; no hay nada que compilar.

- **GitHub Pages** (como radio-expres-reloaded): sube el repo, ve a Settings → Pages → rama `main`, carpeta `/`. Para el dominio propio, crea un archivo `CNAME` con el dominio y en el DNS un registro CNAME a `<usuario>.github.io`.
- **Netlify / Cloudflare Pages**: arrastra la carpeta o conecta el repo. Build command vacío, directorio publicado `/`.
- **Servidor propio** (nginx/Apache): copia los archivos a la raíz web. Tiene que ir en HTTPS.

## Detalles del reproductor

- No se corta al navegar: el `<audio>` vive fuera de las vistas y las páginas cambian por `#/ruta`.
- Pausar suelta la conexión. Al volver a dar play entra al vivo, no a lo que quedó en el buffer.
- Reconexión automática: 6 intentos, esperando 2, 4, 6, 8, 10 y 10 s entre uno y otro. Muestra el mensaje "Reconectando… (n/6)" y reintenta apenas vuelve la red.
- Si el buffer se adelanta más de 8 s, recarga en silencio para no desfasarse del vivo.
- Media Session: controles, título y carátula en la pantalla de bloqueo.
- El volumen se guarda en `localStorage`. En celular, el parlante abre un panel con el control deslizante. En iPhone solo hay silenciar, porque iOS no deja que una web cambie el volumen (se detecta solo).
- En celulares el ecualizador es simulado: en iOS, el audio que pasa por Web Audio se corta al bloquear la pantalla.
