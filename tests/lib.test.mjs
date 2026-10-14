// Ejecutar: node tests/lib.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { cleanTitle, pickSource, splitTitle, nowIn, showsFor, onAir } = createRequire(import.meta.url)('../js/lib.js');

// Metadata
assert.equal(cleanTitle('﻿ Men At Work - Overkill (1983) '), 'Men At Work - Overkill (1983)');
assert.equal(cleanTitle(undefined), '');
assert.deepEqual(splitTitle('Men At Work - Overkill (1983)'), { artist: 'Men At Work', title: 'Overkill (1983)' });
assert.deepEqual(splitTitle('Solo título'), { artist: '', title: 'Solo título' });

const status = { icestats: { source: [
  { listenurl: 'http://h:8238/live', title: 'A - otro mount' },
  { listenurl: 'http://h:8238/live2', title: 'B - el nuestro' },
] } };
assert.equal(pickSource(status, '/live2').title, 'B - el nuestro');
assert.equal(pickSource(status, '/live'), status.icestats.source[0]);
assert.equal(pickSource(status, '/otro'), null); // nunca muestra la canción de otro mount
assert.equal(pickSource({ icestats: { source: { title: 'único' } } }, '/x').title, 'único');
assert.equal(pickSource({}, '/x'), null);

// Programación — 2026-10-14 15:30 UTC es miércoles 10:30 en Lima (UTC-5)
const now = nowIn('America/Lima', new Date('2026-10-14T15:30:00Z'));
assert.deepEqual(now, { day: 'mie', min: 630 });
assert.deepEqual(nowIn('America/Lima', new Date('2026-10-12T05:00:00Z')), { day: 'lun', min: 0 });

const shows = [
  { nombre: 'B', dias: ['mie'], inicio: '10:00', fin: '12:00' },
  { nombre: 'A', dias: ['mie', 'jue'], inicio: '06:00', fin: '10:00' },
  { nombre: 'C', dias: ['mie'], inicio: '22:00', fin: '24:00' },
];
assert.deepEqual(showsFor(shows, 'mie').map((s) => s.nombre), ['A', 'B', 'C']);
assert.equal(onAir(shows[0], now), true);
assert.equal(onAir(shows[1], now), false);
assert.equal(onAir(shows[0], { day: 'mie', min: 720 }), false); // fin exclusivo
assert.equal(onAir(shows[2], { day: 'mie', min: 1439 }), true);

console.log('ok');
