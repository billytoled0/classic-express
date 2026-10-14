// Programación y conductores. (Las descripciones de los conductores son TEXTO DE EJEMPLO.) Se edita aquí (es JS para que el sitio funcione
// también abriendo index.html con doble clic, sin servidor).
//
// programas: dias = lun mar mie jue vie sab dom. Horas HH:MM en la zona horaria
// de config.js; fin puede ser "24:00". Un programa que cruza la medianoche va en
// dos entradas. Sin programas, el sitio muestra "Música continua". Ejemplo:
//   { "nombre": "Lado A", "conductor": "Willy Toledo", "descripcion": "...",
//     "dias": ["sab", "dom"], "inicio": "08:00", "fin": "10:00" }
const CLASSIC_DATA = {
  "conductores": [
    {
      "nombre": "Willy Toledo",
      "descripcion": "Al micrófono de CLASSIC. Presenta los clásicos con la historia que hay detrás de cada canción."
    },
    {
      "nombre": "Jaime Valencia",
      "descripcion": "Al micrófono de CLASSIC. Recibe los pedidos de los oyentes y los hace sonar."
    }
  ],
  "programas": []
};
