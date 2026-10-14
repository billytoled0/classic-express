# CLASSIC — notas del rediseño v2

## Lo real
- Sujeto: radio online de clásicos (oldies 60s–90s), stream Icecast /live2, 24 h, música continua (sin programas aún).
- Audiencia: oyentes adultos, mayoría desde el celular, Perú (America/Lima).
- Acción única: darle play (Escuchar en vivo). Secundaria: pedir canción por WhatsApp.
- Stack: estático, Vue 3 global (scripts clásicos, funciona con doble clic), hash routes.
- Marca fija: rojo #FF0000, negro, blanco; logo vinilo cromado + ecualizador rojo degradado + wordmark CLASSIC.
- Imágenes propias: solo logos. Ninguna foto propia. Locutores sin foto (genérico pedido por el cliente).

## Inventario (solo de CLASSIC)
1. El nombre CLASSIC y el dominio classicforever.com ("forever" = siempre contigo).
2. El lema: "Los clásicos de siempre... siempre contigo."
3. El vinilo cromado del logo, girando a 33⅓ rpm.
4. Las barras del ecualizador del logo: rojo arriba, blanco abajo.
5. Lo que suena AHORA en /live2 (artista, título, año, carátula) — cambia con cada canción.
6. Las décadas que programa: 60s, 70s, 80s, 90s.
7. Las voces: Willy Toledo y Jaime Valencia.
8. Hora de Lima; transmite las 24 h sin cortes.
9. Pedidos por WhatsApp.
10. Los aparatos de su mundo: tocadiscos, rockola, radio de válvulas, el dial.

## Argumento (claims → prueba)
1. CLASSIC está sonando ahora mismo; dale play.            → la canción en vivo, enorme, + vinilo + botón
2. Es una radio de clásicos, sin cortes, las 24 horas.      → statement + décadas con lo que suena de cada una
3. Suena como sonaba: discos, rockolas, la radio de la casa. → imágenes de archivo del mundo (tocadiscos, rockola, radio)
4. Hay gente detrás del micrófono.                          → Willy Toledo, Jaime Valencia
5. Pide tu canción.                                          → WhatsApp, botón
6. Cierre: el nombre y el lema.                              → footer con CLASSIC a todo el ancho

## Dirección: colour-chapters (seed 391521427)
Por qué: una radio es una sucesión de canciones y décadas; cada sección es un póster a pantalla
completa en los colores reales de la marca (blanco, rojo #FF0000, negro). Las otras dos (contact-sheet,
dense-tiles) necesitaban decenas de fotos propias o un tablero recargado.
Redraw: section:list → list-poster-lines (el menú de 6–10 ítems por categoría obligaba a inventar;
CLASSIC tiene 4 décadas, que son justo un póster de 4 líneas).

## La idea
"En esta página, la canción que suena ahora en /live2 se vuelve la etiqueta roja del disco:
el campo rojo del hero (el rojo del logo) lleva impreso título y artista en vivo, y la década
de esa canción se enciende en rojo en el póster de décadas."
Test del competidor: otra radio tiene "ahora suena", pero no el rojo exacto de esta etiqueta,
el lema "siempre contigo" en el hero ni su propia programación por décadas → se queda.

## Lo vivo
Ahora suena (Icecast, real) + la década de la canción encendida en el póster (año leído del título).
Fallback sin JS/metadata: nombre de la radio y el póster sin resaltar.

## Ajustes al blueprint (house rules ganan)
- Hero: titular "Clásicos / en vivo" (16 car.) responde "qué es"; el lema va en la frase de apoyo.
  La acción no va arriba a la derecha: el play es un botón cuadrado negro en el campo rojo.
  Texto en campo rojo en tinta negra (blanco sobre #FF0000 = 4:1, no llega a AA en texto normal).
- Intro: el statement no lleva fotos encima (regla: nada sobre statements); el clip va al costado.
- Galería: las fotos no tapan el titular (regla del inspector); van al costado, inclinadas.
- Esquinas cuadradas en todo; botones cuadrados.
- Barras del ecualizador del reproductor: degradado rojo→blanco lo pidió el cliente (marca); excepción.
- Reducir movimiento: se apagan entradas, marquesina y video; vinilo y ecualizador siguen (los
  dispara el usuario con play y paran con pausa).

## Imágenes (todas B/N, una sola familia)
disqueria-1963 (PD), rockola-wurlitzer-1100 (CC0), rockola-wurlitzer-600a (CC0), tocadiscos-philips (CC0),
tocadiscos-zenith (CC BY), buscando-discos (CC0), microfonos-estudio (CC BY), estudio-radio-1950s (CC BY),
radio-sony-tr730 (CC BY-SA), clip disco-78-girando (CC BY-SA). Créditos en el footer.
