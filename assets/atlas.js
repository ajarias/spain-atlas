/* Spain atlas map. Geometry comes from vector tiles (tiles/{level}), values from
   data/{level}/{metric}.bin (Float32, years x areas). Colours are applied as feature state, so
   switching metric or year never reloads geometry. Basemap, streets and neighbourhood names:
   OpenFreeMap / OpenStreetMap (non-INE); without them the map still works, without labels. */
'use strict';

const $ = s => document.querySelector(s);
const BASEMAP = 'https://tiles.openfreemap.org/styles/positron';
const PHOTON = 'https://photon.komoot.io/api/';
const BASE = location.href.split(/[?#]/)[0].replace(/[^/]*$/, '');
let LEVELS = ['mun', 'dist', 'sec', 'bar'];  // 'bar' (OSM barrios) only when tiles exist
const AUTO_Z = [8.5, 10.5];                        // auto level: towns < 8.5 < districts < 10.5
const MIN_POP = {mun: 1000, dist: 500, sec: 250, bar: 500};   // floor for rankings and examples
const FLY_Z = {mun: 11, dist: 13, sec: 14.6, bar: 13.6};
const AUTO_FLY_Z = {mun: 8.2, dist: 10.1, sec: 14.2, bar: 13.6};  // stays inside each level's auto range
const Q = [0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9];    // class breaks: 8 classes
const PAL = {
  up: ['#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac'],
  seq: ['#fbf4c9', '#ecdf8f', '#c4dc96', '#86c7a5', '#4aa9ad', '#2f82ac', '#2c579e', '#272f78'],
};
PAL.down = PAL.up.slice().reverse();
const CAT_COL = {
  'Marruecos': '#D55E00', 'Rumanía': '#0072B2', 'Colombia': '#E69F00', 'Reino Unido': '#CC79A7',
  'Venezuela': '#F0E442', 'China': '#009E73', 'Ucrania': '#56B4E9', 'Ecuador': '#8C564B',
  'Perú': '#9467BD', 'Argentina': '#17BECF', 'Bolivia': '#BCBD22', 'Cuba': '#E377C2',
  'Francia': '#1F3A93', 'República Dominicana': '#FF9896',
  // Aggregates INE does not split by country: muted but distinguishable tones.
  'Otros países de Europa': '#9FA8C9', 'Otros países de África': '#B59A7A',
  'Otros países de América': '#D8C38E', 'Otros países de Asia': '#8FB59A', 'Oceanía': '#C9C9C9',
};
const NODATA = 'rgba(190,186,178,0.45)';

const T = {
  es: {
    brand: 'Atlas de España', sub: 'datos del INE', show: 'Indicador', detail: 'Detalle',
    auto: 'Auto', mun: 'Municipios', dist: 'Distritos', sec: 'Secciones', bar: 'Barrios',
    barrio: 'Barrio (OSM):', buyCard: 'Ficha para comprar →',
    search: 'Busca tu municipio o calle', examples: 'Descubre ejemplos de…',
    top: 'Valores más altos', bottom: 'Valores más bajos', rise: 'Mayor subida',
    fall: 'Mayor bajada', border: 'Fronteras desiguales', island: 'Islas', pocket: 'Bolsas',
    more: 'Ejemplos', district: 'Distrito', section: 'Sección', prov: 'Provincia de',
    inhab: 'habitantes', since: 'desde', pp: 'p. p.', higher: 'Supera al',
    ofSpain: 'de España', of: 'de', nodata: 'Sin datos', near: 'Barrio cercano (OSM):',
    profile: 'Perfil', vsSpain: 'posición en España', closeHint: 'Cerrar',
    zoomIn: 'Acércate para ver', onlyLevel: 'Este indicador solo existe por', streets: 'Calles',
    noMatch: 'Sin resultados', median: 'Mediana', p10: '10% más bajo, por debajo de',
    p90: '10% más alto, por encima de', areas: 'áreas con datos', topList: 'Más altos',
    bottomList: 'Más bajos', byRegion: 'Por comunidad autónoma (mediana de las áreas)',
    source: 'Fuente', years: 'Años', notes: 'Notas', changeYears: 'Cambio',
    breaksNote: 'Clases fijas según la distribución de', example: 'Ejemplo', vs: 'frente a',
    neighbours: 'vecinos', minPop: 'Áreas con al menos', people: 'habitantes',
    spainMedian: 'mediana de España', canarias: 'Canarias', peninsula: 'Península',
    cat_share: 'de los extranjeros', fewForeign: 'Menos de 20 extranjeros',
    unitsAreas: {mun: 'municipios', dist: 'distritos', sec: 'secciones', bar: 'barrios'},
    ofThe: {mun: 'de los', dist: 'de los', sec: 'de las', bar: 'de los'},
    ofThose: {mun: 'de los de', dist: 'de los de', sec: 'de las de', bar: 'de los de'},
  },
  en: {
    brand: 'Spain Atlas', sub: 'INE data', show: 'Indicator', detail: 'Detail',
    auto: 'Auto', mun: 'Towns', dist: 'Districts', sec: 'Sections', bar: 'Barrios',
    barrio: 'Neighbourhood (OSM):', buyCard: 'Buyer scorecard →',
    search: 'Find your town or street', examples: 'Discover examples of…',
    top: 'Highest values', bottom: 'Lowest values', rise: 'Biggest rise', fall: 'Biggest fall',
    border: 'Unequal borders', island: 'Islands', pocket: 'Pockets', more: 'Examples',
    district: 'District', section: 'Section', prov: 'Province of', inhab: 'inhabitants',
    since: 'since', pp: 'pp', higher: 'Higher than', ofSpain: 'in Spain', of: 'in',
    nodata: 'No data', near: 'Nearby neighbourhood (OSM):', profile: 'Profile',
    vsSpain: 'position in Spain', closeHint: 'Close', zoomIn: 'Zoom in to see',
    onlyLevel: 'This indicator only exists by', streets: 'Streets', noMatch: 'No results',
    median: 'Median', p10: 'Bottom 10% below', p90: 'Top 10% above', areas: 'areas with data',
    topList: 'Highest', bottomList: 'Lowest',
    byRegion: 'By region (median of areas)', source: 'Source', years: 'Years', notes: 'Notes',
    changeYears: 'Change', breaksNote: 'Fixed classes from the distribution in',
    example: 'Example', vs: 'vs', neighbours: 'neighbours', minPop: 'Areas with at least',
    people: 'residents', spainMedian: 'Spain median', canarias: 'Canary Islands',
    peninsula: 'Mainland', cat_share: 'of foreign nationals',
    fewForeign: 'Fewer than 20 foreign nationals',
    unitsAreas: {mun: 'towns', dist: 'districts', sec: 'sections', bar: 'neighbourhoods'},
    ofThe: {mun: 'of', dist: 'of', sec: 'of', bar: 'of'},
    ofThose: {mun: 'of those in', dist: 'of those in', sec: 'of those in', bar: 'of those in'},
  },
};

const S = {lang: 'es', metric: null, level: 'auto', lvl: 'mun', year: null, sel: null,
           pair: null, ex: {}, play: null};
const cache = {codes: {}, vals: {}, adj: {}, prof: {}};
let META, MK, TILES, map, hasLabels = false;
const t = k => T[S.lang][k];
const L = obj => (obj && (obj[S.lang] ?? obj.es)) || '';

/* ---------- formatting ---------- */
function fmt(x, m, signed = false) {
  if (!Number.isFinite(x)) return t('nodata');
  const dec = m ? m.dec : 0;
  const u = m ? m.unit : '';
  if (u === 'year') return String(Math.round(x));
  const s = num(x, dec, signed);
  if (!u) return s;
  if (u === '€') return S.lang === 'es' ? `${s} €` : `€${s.replace(/^([−+]?)/, '$1')}`;
  if (u === '%' || u === '‰' || u === '×') return s + u;
  if (u === '2015=100') return s;
  return `${s} ${unitWord(u)}`;
}
function num(x, dec, signed = false) {
  // useGrouping 'always': es-ES otherwise writes 4-digit numbers without a separator.
  return new Intl.NumberFormat(S.lang === 'es' ? 'es-ES' : 'en-GB',
    {minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always',
     signDisplay: signed ? 'exceptZero' : 'auto'}).format(x).replace('-', '−');
}
function tick(x, m) {  // compact legend labels
  if (m.unit === 'year') return String(Math.round(x));
  const dec = Math.abs(x) >= 100 ? 0 : m.dec;
  return num(x, dec) + (m.unit === '%' || m.unit === '‰' ? m.unit : '');
}
function unitWord(u) {
  if (S.lang === 'es') return u;
  return {'hab.': 'res.', 'hab./km²': 'per km²', 'años': 'yrs', 'pers.': 'pers.'}[u] || u;
}
const fmtInt = x => num(x, 0);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- data ---------- */
async function getJSON(u) {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${u}: ${r.status}`);
  return r.json();
}
async function getF32(u) {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${u}: ${r.status}`);
  return new Float32Array(await r.arrayBuffer());
}
async function codes(lvl) {
  if (!cache.codes[lvl]) {
    const d = await getJSON(`data/${lvl}/codes.json`);
    d.idx = new Map(d.c.map((c, i) => [c, i]));
    cache.codes[lvl] = d;
  }
  return cache.codes[lvl];
}
async function values(lvl, key) {
  if (MK[key] && MK[key].kind === 'score') return HS.values(lvl);  // housing.js
  const id = `${lvl}/${key}`;
  if (!cache.vals[id]) {
    cache.vals[id] = (async () => {
      const m = MK[key], n = META.levels[lvl].n, years = m.years[lvl];
      const a = await getF32(`data/${lvl}/${key}.bin`);
      const v = {years, n, a, sorted: {}, med: {}};
      v.at = y => { const k = years.indexOf(y); return k < 0 ? null : a.subarray(k * n, (k + 1) * n); };
      if (m.kind === 'cat') v.share = await getF32(`data/${lvl}/${key}__share.bin`);
      return v;
    })();
  }
  return cache.vals[id];
}
async function adjacency(lvl) {
  if (!cache.adj[lvl]) {
    cache.adj[lvl] = fetch(`data/${lvl}/adjacency.bin`).then(r => r.arrayBuffer())
      .then(b => new Int32Array(b));
  }
  return cache.adj[lvl];
}
async function profile(lvl) {
  if (!cache.prof[lvl]) {
    cache.prof[lvl] = getF32(`data/${lvl}/profile.bin`).then(a => {
      const keys = META.profile_years[lvl] ? Object.keys(META.profile_years[lvl]) : [];
      const n = META.levels[lvl].n, out = {};
      keys.forEach((k, j) => {
        const arr = a.subarray(j * n, (j + 1) * n);
        out[k] = {arr, sorted: Float32Array.from(arr.filter(Number.isFinite)).sort()};
      });
      return out;
    });
  }
  return cache.prof[lvl];
}
function sortedOf(v, y) {
  if (!v.sorted[y]) v.sorted[y] = Float32Array.from(v.at(y).filter(Number.isFinite)).sort();
  return v.sorted[y];
}
function quantile(sorted, q) {
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
}
function rankShare(sorted, x) {  // share of values strictly below x
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < x) lo = mid + 1; else hi = mid; }
  return sorted.length ? lo / sorted.length : NaN;
}
function breaksFor(v) {
  if (!v.br) {
    const s = sortedOf(v, v.years[v.years.length - 1]);
    v.br = Q.map(q => quantile(s, q));
  }
  return v.br;
}
const classOf = (x, br) => {
  if (!Number.isFinite(x)) return -1;
  let k = 0;
  while (k < br.length && x >= br[k]) k++;
  return k;
};
function palette(m) {
  if (m.kind === 'cat') return META.categories[m.key].map(c => CAT_COL[c.key] || '#999');
  return m.good > 0 ? PAL.up : m.good < 0 ? PAL.down : PAL.seq;
}
function pickYear(years, y) {
  if (y == null || !years.length) return years[years.length - 1];
  if (years.includes(y)) return y;
  return years.reduce((b, c) => (Math.abs(c - y) < Math.abs(b - y) || (Math.abs(c - y) ===
    Math.abs(b - y) && c > b)) ? c : b);
}

/* ---------- names ---------- */
function provOf(code) { return META.prov[code.slice(0, 2)] || {n: code.slice(0, 2), ccaa: ''}; }
function munOf(lvl, i) {  // municipality code of an area
  return lvl === 'bar' ? cache.codes.bar.m[i] : cache.codes[lvl].c[i].slice(0, 5);
}
function areaName(lvl, i) {
  if (lvl === 'bar') {
    const b = cache.codes.bar, mc = b.m[i], mi = cache.codes.mun.idx.get(mc);
    const town = mi === undefined ? mc : cache.codes.mun.n[mi];
    return {title: b.n[i], sub: `${town} · ${provOf(mc).n}`, short: `${b.n[i]} · ${town}`};
  }
  const code = cache.codes[lvl].c[i];
  const mun = cache.codes.mun, mi = mun.idx.get(code.slice(0, 5));
  const title = mi === undefined ? code.slice(0, 5) : mun.n[mi];
  const p = provOf(code);
  const place = p.n === title ? META.ccaa[p.ccaa] : p.n;
  if (lvl === 'mun') return {title, sub: place, short: title};
  const d = `${t('district')} ${code.slice(5, 7)}`;
  if (lvl === 'dist') return {title, sub: `${d} · ${place}`, short: `${title} · ${d}`};
  const s = `${t('section')} ${code.slice(7)}`;
  return {title, sub: `${d} · ${s} · ${place}`, short: `${title} · ${code.slice(5, 7)}-${code.slice(7)}`};
}

/* ---------- map ---------- */
async function baseStyle() {
  try {
    const st = await getJSON(BASEMAP);
    const drop = /^(building|label_(other|village|town|city|city_capital|state|country)|airport|highway-shield|road_shield|aeroway)/;
    st.layers = st.layers.filter(l => !drop.test(l.id));
    hasLabels = true;
    return st;
  } catch (e) {
    console.warn('basemap unavailable, using a plain background', e);
    return {version: 8, sources: {}, layers: [{id: 'background', type: 'background',
      paint: {'background-color': '#e8eaec'}}]};
  }
}

function addLayers() {
  const layers = map.getStyle().layers;
  const roads = layers.find(l => /^(tunnel|highway|road|railway|aeroway)/.test(l.id));
  const symbols = layers.find(l => l.type === 'symbol');
  const beforeRoads = roads ? roads.id : undefined;
  const beforeLabels = symbols ? symbols.id : undefined;
  const bounds = [-18.4, 27.4, 4.6, 44.0];
  for (const lvl of LEVELS) {
    map.addSource(lvl, {type: 'vector', tiles: [`${BASE}tiles/${lvl}/{z}/{x}/{y}.pbf`],
      minzoom: TILES[lvl].minzoom, maxzoom: TILES[lvl].maxzoom, bounds, promoteId: 'c'});
    map.addLayer({id: `${lvl}-fill`, type: 'fill', source: lvl, 'source-layer': lvl,
      layout: {visibility: 'none'},
      paint: {'fill-color': NODATA, 'fill-opacity': ['interpolate', ['linear'], ['zoom'],
        5, 0.92, 13, 0.86, 16, 0.72]}}, beforeRoads);
    map.addLayer({id: `${lvl}-line`, type: 'line', source: lvl, 'source-layer': lvl,
      layout: {visibility: 'none'},
      paint: {'line-color': '#ffffff', 'line-opacity': ['interpolate', ['linear'], ['zoom'],
        5, 0.15, 9, 0.35, 13, 0.6], 'line-width': ['interpolate', ['linear'], ['zoom'],
        5, 0.15, 10, 0.4, 15, 1]}}, beforeRoads);
  }
  map.addLayer({id: 'mun-outline', type: 'line', source: 'mun', 'source-layer': 'mun',
    minzoom: 8, paint: {'line-color': '#3a3a3a', 'line-opacity': 0.45,
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 14, 1.4]}}, beforeLabels);
  for (const lvl of LEVELS) {
    map.addLayer({id: `${lvl}-hover`, type: 'line', source: lvl, 'source-layer': lvl,
      layout: {visibility: 'none'},
      paint: {'line-color': '#111', 'line-width': ['case',
        ['boolean', ['feature-state', 'hover'], false], 1.6, 0]}}, beforeLabels);
    map.addLayer({id: `${lvl}-sel`, type: 'line', source: lvl, 'source-layer': lvl,
      layout: {visibility: 'none'},
      paint: {'line-color': '#111', 'line-width': ['case',
        ['boolean', ['feature-state', 'sel'], false], 3.2, 0]}}, beforeLabels);
  }
  if (!hasLabels) return;
  const halo = {'text-color': '#232323', 'text-halo-color': 'rgba(255,255,255,0.92)',
    'text-halo-width': 1.6};
  // Neighbourhood names from OpenStreetMap: suburbs first, finer names only when close.
  const nb = (id, classes, minzoom, size) => map.addLayer({id, type: 'symbol',
    source: 'openmaptiles', 'source-layer': 'place', minzoom,
    filter: ['match', ['get', 'class'], classes, true, false],
    layout: {'text-field': ['coalesce', ['get', 'name'], ['get', 'name:latin']],
      'text-font': ['Noto Sans Bold'], 'text-transform': 'uppercase',
      'text-letter-spacing': 0.08, 'text-max-width': 8,
      'text-size': ['interpolate', ['linear'], ['zoom'], minzoom, size, 16, size + 3]},
    paint: {...halo, 'text-color': '#333'}});
  nb('nbhd-suburb', ['suburb'], 11.5, 10.5);
  nb('nbhd-quarter', ['quarter', 'neighbourhood'], 13.5, 10);
  // Town names from INE, larger towns first.
  const mun = cache.codes.mun;
  const feats = mun.c.map((c, i) => ({type: 'Feature', id: i,
    properties: {n: mun.n[i], p: mun.p[i] || 0},
    geometry: {type: 'Point', coordinates: [mun.x[i], mun.y[i]]}}));
  map.addSource('towns', {type: 'geojson', data: {type: 'FeatureCollection', features: feats}});
  const tiers = [[250000, 1e9, 4.5, 14], [50000, 250000, 6.5, 13], [10000, 50000, 8, 12.5],
                 [2000, 10000, 9.5, 12], [0, 2000, 10.5, 11.5]];
  tiers.forEach(([lo, hi, z, size], k) => map.addLayer({id: `towns-${k}`, type: 'symbol',
    source: 'towns', minzoom: z, filter: ['all', ['>=', ['get', 'p'], lo], ['<', ['get', 'p'], hi]],
    layout: {'text-field': ['get', 'n'], 'text-font': [k < 2 ? 'Noto Sans Bold' : 'Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], z, size, 14, size + 4],
      'symbol-sort-key': ['-', 0, ['get', 'p']], 'text-max-width': 9,
      'text-padding': 3},
    paint: halo}));
}

function setVisibility(lvl) {
  for (const l of LEVELS) {
    const v = l === lvl ? 'visible' : 'none';
    for (const s of ['fill', 'line', 'hover']) map.setLayoutProperty(`${l}-${s}`, 'visibility', v);
    // Keep the selected outline visible even when another level is painted (e.g. a barrio).
    const sel = l === lvl || (S.sel && S.sel.lvl === l) ? 'visible' : 'none';
    map.setLayoutProperty(`${l}-sel`, 'visibility', sel);
  }
  map.setLayoutProperty('mun-outline', 'visibility', lvl === 'mun' ? 'none' : 'visible');
}

function effLevel() {
  const m = MK[S.metric], avail = LEVELS.filter(l => m.years[l]);
  const z = map.getZoom();
  const want = S.level !== 'auto' ? S.level : z < AUTO_Z[0] ? 'mun' : z < AUTO_Z[1] ? 'dist' : 'sec';
  if (avail.includes(want)) return want;
  for (let i = LEVELS.indexOf(want); i >= 0; i--) if (avail.includes(LEVELS[i])) return LEVELS[i];
  return avail[0];
}

const painted = {};
let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  const lvl = effLevel(), m = MK[S.metric];
  const [cd, v] = await Promise.all([codes(lvl), values(lvl, S.metric)]);
  if (seq !== renderSeq) return;
  S.lvl = lvl;
  S.year = pickYear(v.years, S.year);
  const cur = v.at(S.year);
  const br = m.kind === 'cat' ? null : breaksFor(v);
  const ks = new Int8Array(cd.c.length);
  for (let i = 0; i < ks.length; i++) {
    ks[i] = m.kind === 'cat' ? (Number.isFinite(cur[i]) ? cur[i] : -1) : classOf(cur[i], br);
  }
  const prev = painted[lvl];
  for (let i = 0; i < ks.length; i++) {
    if (!prev || prev[i] !== ks[i]) {
      map.setFeatureState({source: lvl, sourceLayer: lvl, id: cd.c[i]}, {k: ks[i]});
    }
  }
  painted[lvl] = ks;
  const pal = palette(m), expr = ['match', ['coalesce', ['feature-state', 'k'], -1]];
  pal.forEach((c, k) => expr.push(k, c));
  expr.push(NODATA);
  map.setPaintProperty(`${lvl}-fill`, 'fill-color', expr);
  setVisibility(lvl);
  drawControls(v);
  drawLegend(m, v, ks);
  drawHint(lvl);
  writeHash();
  drawBelow(m, v, lvl);
  computeExamples(m, v, lvl);
  if (S.sel) drawCard();
}

/* ---------- controls ---------- */
function buildMetricSelect() {
  const sel = $('#metric');
  sel.innerHTML = '';
  for (const [g, lab] of Object.entries(META.groups)) {
    const og = document.createElement('optgroup');
    og.label = L(lab);
    META.metrics.filter(m => m.group === g).forEach(m => {
      const o = document.createElement('option');
      o.value = m.key; o.textContent = L(m);
      og.appendChild(o);
    });
    if (og.children.length) sel.appendChild(og);
  }
  sel.value = S.metric;
}
function drawControls(v) {
  const r = $('#year');
  r.min = 0; r.max = v.years.length - 1; r.step = 1;
  r.value = v.years.indexOf(S.year);
  r.disabled = v.years.length < 2;
  $('#play').disabled = v.years.length < 2;
  $('#yearLabel').textContent = S.year;
  const m = MK[S.metric];
  document.querySelectorAll('#levels button').forEach(b => {
    const l = b.dataset.l;
    b.classList.toggle('on', l === S.level);
    b.disabled = l !== 'auto' && !m.years[l];
    b.textContent = t(l);
  });
}
function drawHint(lvl) {
  const h = $('#hint'), m = MK[S.metric];
  const avail = LEVELS.filter(l => m.years[l]);
  let msg = '';
  if (avail.length === 1) msg = `${t('onlyLevel')} ${t('unitsAreas')[avail[0]]}.`;
  else if (map.getZoom() < TILES[lvl].minzoom) msg = `${t('zoomIn')} ${t('unitsAreas')[lvl]}.`;
  h.hidden = !msg;
  h.textContent = msg;
}

function drawLegend(m, v, ks) {
  const pal = palette(m), el = $('#legend');
  const lvlName = t('unitsAreas')[S.lvl];
  let h = `<div class="lt">${L(m)} · ${S.year}</div>`;
  if (m.kind === 'cat') {
    const counts = new Map();
    ks.forEach(k => { if (k >= 0) counts.set(k, (counts.get(k) || 0) + 1); });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const cats = META.categories[m.key];
    h += `<div class="ls">${t('cat_share')} · ${lvlName}</div><div class="cats">` +
      top.map(([k, n]) => `<span><i style="background:${pal[k]}"></i>${L(cats[k])} <small>${fmtInt(n)}</small></span>`).join('') +
      `<span style="grid-column:1/3"><i style="background:${NODATA}"></i>${t('fewForeign')}</span></div>`;
  } else {
    const br = breaksFor(v), counts = new Array(8).fill(0);
    ks.forEach(k => { if (k >= 0) counts[k]++; });
    const mx = Math.max(...counts, 1);
    h += `<div class="ls">${lvlName} · ${t('breaksNote')} ${v.years[v.years.length - 1]}</div>`;
    h += '<div class="hist">' + counts.map((c, k) =>
      `<div title="${fmtInt(c)}" style="height:${Math.max(2, 34 * c / mx)}px;background:${pal[k]}"></div>`).join('') + '</div>';
    h += '<div class="ramp">' + pal.map(c => `<div style="background:${c}"></div>`).join('') + '</div>';
    h += '<div class="ticks">' + br.map((b, k) => (k % 2 === 0 || br.length < 6) ?
      `<span style="left:${(k + 1) * 12.5}%">${tick(b, m)}</span>` : '').join('') + '</div>';
  }
  el.innerHTML = h;
}

/* ---------- hover and selection ---------- */
let hover = null;
function setHover(lvl, id) {
  if (hover && (hover.lvl !== lvl || hover.id !== id)) {
    map.setFeatureState({source: hover.lvl, sourceLayer: hover.lvl, id: hover.id}, {hover: false});
  }
  hover = id == null ? null : {lvl, id};
  if (hover) map.setFeatureState({source: lvl, sourceLayer: lvl, id}, {hover: true});
}
function bindPointer() {
  const tip = $('#tip');
  for (const lvl of LEVELS) {
    map.on('mousemove', `${lvl}-fill`, async e => {
      const f = e.features[0];
      if (!f) return;
      map.getCanvas().style.cursor = 'pointer';
      setHover(lvl, f.id);
      const cd = cache.codes[lvl], i = cd && cd.idx.get(f.id);
      if (i === undefined) return;
      const v = await values(lvl, S.metric), m = MK[S.metric];
      const cur = v.at(S.year);
      const nm = areaName(lvl, i);
      tip.innerHTML = `<b>${nm.short}</b><br>${valueText(m, v, i, cur)}`;
      tip.hidden = false;
      const r = map.getContainer().getBoundingClientRect();
      const x = Math.min(e.point.x + 14, r.width - tip.offsetWidth - 6);
      tip.style.left = `${x}px`;
      tip.style.top = `${e.point.y + 14}px`;
    });
    map.on('mouseleave', `${lvl}-fill`, () => {
      map.getCanvas().style.cursor = '';
      setHover(null, null);
      tip.hidden = true;
    });
    map.on('click', `${lvl}-fill`, e => {
      const f = e.features[0];
      const i = f && cache.codes[lvl].idx.get(f.id);
      if (i !== undefined) select(lvl, i, false);
    });
  }
}
function valueText(m, v, i, cur) {
  if (m.kind === 'cat') {
    const k = cur[i];
    if (!Number.isFinite(k)) return t('fewForeign');
    const share = v.share[v.years.indexOf(S.year) * v.n + i];
    return `${L(META.categories[m.key][k])} · ${fmt(share, {unit: '%', dec: 0})} ${t('cat_share')}`;
  }
  return `${L(m)}: <b>${fmt(cur[i], m)}</b>`;
}
function clearSel() {
  for (const s of [S.sel, ...(S.pair || [])]) {
    if (s) map.setFeatureState({source: s.lvl, sourceLayer: s.lvl, id: cache.codes[s.lvl].c[s.i]}, {sel: false});
  }
}
function select(lvl, i, fly = true, pair = null, label = '') {
  if (!map.isStyleLoaded()) {  // still loading: try again once the map is ready
    map.once('idle', () => select(lvl, i, fly, pair, label));
    return;
  }
  clearSel();
  S.sel = {lvl, i, label};
  S.pair = pair;
  for (const s of [S.sel, ...(pair || [])]) {
    map.setFeatureState({source: s.lvl, sourceLayer: s.lvl, id: cache.codes[s.lvl].c[s.i]}, {sel: true});
  }
  if (fly) {
    const cd = cache.codes[lvl];
    let center = [cd.x[i], cd.y[i]];
    if (pair && pair.length) center = [(cd.x[i] + cd.x[pair[0].i]) / 2, (cd.y[i] + cd.y[pair[0].i]) / 2];
    const z = S.level === 'auto' ? AUTO_FLY_Z[lvl] : Math.max(map.getZoom(), FLY_Z[lvl] - 1);
    map.flyTo({center, zoom: z, speed: 1.6});
  }
  drawCard();
}

async function drawCard() {
  const card = $('#card');
  if (!S.sel) { card.hidden = true; card.classList.remove('wide'); return; }
  if (S.metric === 'housing_score') { await HS.drawScorecard(); return; }
  card.classList.remove('wide');
  const {lvl, i, label} = S.sel, m = MK[S.metric];
  const nm = areaName(lvl, i), cd = cache.codes[lvl];
  let h = `<button class="x" aria-label="${t('closeHint')}">×</button>`;
  if (label) h += `<div class="nb">${label}</div>`;
  h += `<h3>${nm.title}</h3><p class="meta">${nm.sub}</p>`;
  const bi = lvl === 'sec' && cd.b ? cd.b[i] : -1;
  if (bi >= 0 && cache.codes.bar) {
    h += `<div class="nb">${t('barrio')} <a href="#" data-bar="${bi}">${cache.codes.bar.n[bi]}</a></div>`;
  } else {
    const nbName = lvl !== 'mun' && lvl !== 'bar' ? nearestNeighbourhood(cd.x[i], cd.y[i]) : null;
    if (nbName) h += `<div class="nb">${t('near')} ${nbName}</div>`;
  }
  h += `<p class="meta"><a href="#" data-buy="1">${t('buyCard')}</a></p>`;
  if (cd.p[i]) h += `<p class="meta">${fmtInt(cd.p[i])} ${t('inhab')}</p>`;
  if (m.years[lvl]) {
    const v = await values(lvl, S.metric);
    const y = pickYear(v.years, S.year), cur = v.at(y);
    if (m.kind === 'cat') {
      h += `<div class="boxes"><div class="box" style="grid-column:1/3">${L(m)} · ${y}<b>${valueText(m, v, i, cur)}</b></div></div>`;
    } else {
      const x = cur[i], br = breaksFor(v), k = classOf(x, br), pal = palette(m);
      const bg = k >= 0 ? pal[k] : 'transparent';
      const dark = k >= 0 && (k <= 1 || k >= 6);
      const y0 = v.years[0], x0 = v.at(y0)[i];
      let chg = '';
      if (y0 !== y && Number.isFinite(x0) && Number.isFinite(x)) {
        chg = m.unit === '%' ? `${fmt(x - x0, {dec: 1, unit: ''}, true)} ${t('pp')}`
          : x0 !== 0 ? fmt(100 * (x - x0) / Math.abs(x0), {dec: 1, unit: '%'}, true) : '';
      }
      h += `<div class="boxes"><div class="box" style="background:${bg};color:${dark ? '#fff' : 'inherit'};border-style:solid;border-color:${bg}">${L(m)}<b>${fmt(x, m)}</b>${y}</div>` +
        `<div class="box">${t('changeYears')}<b>${chg || '—'}</b>${chg ? `${t('since')} ${y0}` : ''}</div></div>`;
      if (Number.isFinite(x)) {
        const sp = rankShare(sortedOf(v, y), x);
        const ccaa = provOf(cd.c[i]).ccaa;
        const reg = [];
        for (let j = 0; j < cur.length; j++) if (Number.isFinite(cur[j]) && provOf(cd.c[j]).ccaa === ccaa) reg.push(cur[j]);
        reg.sort((a, b) => a - b);
        const rp = rankShare(reg, x);
        const unitN = t('unitsAreas')[lvl];
        h += pbar(`${t('higher')} ${Math.floor(100 * sp)}% ${t('ofThe')[lvl]} ${unitN} ${t('ofSpain')}`, sp);
        h += pbar(`${t('higher')} ${Math.floor(100 * rp)}% ${t('ofThose')[lvl]} ${META.ccaa[ccaa]}`, rp);
        h += spark(v, i, m);
      }
    }
  } else {
    h += `<p class="meta">${t('onlyLevel')} ${LEVELS.filter(l => m.years[l]).map(l => t('unitsAreas')[l]).join(', ')}.</p>`;
  }
  if (S.pair && S.pair.length && m.years[lvl]) {
    const v = await values(lvl, S.metric), cur = v.at(pickYear(v.years, S.year));
    const o = S.pair[0].i;
    h += `<p class="meta">${t('vs')} <b>${areaName(lvl, o).short}</b>: ${fmt(cur[o], m)}</p>`;
  }
  h += await profileHtml(lvl, i);
  card.innerHTML = h;
  card.hidden = false;
  card.querySelector('.x').onclick = () => { clearSel(); S.sel = null; S.pair = null; card.hidden = true; };
  card.querySelectorAll('.row[data-k]').forEach(r => r.onclick = () => setMetric(r.dataset.k));
  bindCardLinks(card);
}
function bindCardLinks(card) {
  card.querySelectorAll('a[data-bar]').forEach(a => a.onclick = e => {
    e.preventDefault(); select('bar', +a.dataset.bar, true);
  });
  card.querySelectorAll('a[data-buy]').forEach(a => a.onclick = e => {
    e.preventDefault(); setMetric('housing_score');
  });
}
function pbar(text, share) {
  return `<div class="pct">${text}<div class="pbar"><i style="left:calc(${(100 * share).toFixed(1)}% - 1px)"></i></div></div>`;
}
function spark(v, i, m) {
  if (v.years.length < 2) return '';
  const W = 300, H = 54, P = 4;
  const own = v.years.map(y => v.at(y)[i]);
  const med = v.years.map(y => { v.med[y] ??= quantile(sortedOf(v, y), 0.5); return v.med[y]; });
  const all = own.concat(med).filter(Number.isFinite);
  const lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const X = k => P + k * (W - 2 * P) / (v.years.length - 1);
  const Y = x => H - P - (x - lo) * (H - 2 * P) / span;
  const path = arr => arr.map((x, k) => Number.isFinite(x) ? `${k && Number.isFinite(arr[k - 1]) ? 'L' : 'M'}${X(k).toFixed(1)},${Y(x).toFixed(1)}` : '').join('');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img">
    <path d="${path(med)}" fill="none" stroke="#9a978f" stroke-width="1.5" stroke-dasharray="3 3"/>
    <path d="${path(own)}" fill="none" stroke="var(--fg)" stroke-width="2"/>
    </svg><div class="nb">${v.years[0]}–${v.years[v.years.length - 1]} · — ${S.lang === 'es' ? 'esta área' : 'this area'} · - - ${t('spainMedian')}</div>`;
}
async function profileHtml(lvl, i) {
  const pr = await profile(lvl).catch(() => ({}));
  const rows = Object.entries(pr).filter(([k]) => k !== S.metric).map(([k, p]) => {
    const m = MK[k], x = p.arr[i];
    if (!m || !Number.isFinite(x)) return '';
    const sh = rankShare(p.sorted, x);
    return `<div class="row" data-k="${k}"><span>${L(m)} <small style="color:var(--muted)">${META.profile_years[lvl][k]}</small></span><b>${fmt(x, m)}</b><div class="mini" title="${t('vsSpain')}"><i style="left:calc(${(100 * sh).toFixed(0)}% - 1px)"></i></div></div>`;
  }).join('');
  return rows ? `<div class="prof"><div class="pct"><span class="k">${t('profile')}</span> · <small>${t('vsSpain')}</small></div>${rows}</div>` : '';
}
function nearestNeighbourhood(x, y) {
  if (!hasLabels || map.getZoom() < 11) return null;
  let best = null, bd = 1.6;  // km
  const feats = map.querySourceFeatures('openmaptiles', {sourceLayer: 'place',
    filter: ['match', ['get', 'class'], ['suburb', 'quarter', 'neighbourhood'], true, false]});
  for (const f of feats) {
    const [fx, fy] = f.geometry.coordinates;
    const d = Math.hypot((fx - x) * 111.32 * Math.cos(y * Math.PI / 180), (fy - y) * 110.57);
    if (d < bd) { bd = d; best = f.properties.name; }
  }
  return best;
}

/* ---------- examples ("Descubre ejemplos de…") ---------- */
async function computeExamples(m, v, lvl) {
  const box = $('#chips');
  const cd = cache.codes[lvl], cur = v.at(S.year), n = cur.length;
  const ok = i => Number.isFinite(cur[i]) && (cd.p[i] || 0) >= MIN_POP[lvl];
  const lists = {};
  if (m.kind !== 'cat') {
    const idx = [];
    for (let i = 0; i < n; i++) if (ok(i)) idx.push(i);
    idx.sort((a, b) => cur[b] - cur[a]);
    lists.top = idx.slice(0, 10).map(i => ({i}));
    lists.bottom = idx.slice(-10).reverse().map(i => ({i}));
    const y0 = v.years[0];
    if (y0 !== S.year) {
      const base = v.at(y0), ch = [];
      for (const i of idx) {
        if (!Number.isFinite(base[i])) continue;
        const d = m.unit === '%' || m.unit === '‰' || base[i] <= 0 ? cur[i] - base[i] : (cur[i] - base[i]) / base[i];
        ch.push([i, d]);
      }
      ch.sort((a, b) => b[1] - a[1]);
      lists.rise = ch.slice(0, 10).map(([i]) => ({i, note: `${y0}–${S.year}`}));
      lists.fall = ch.slice(-10).reverse().map(([i]) => ({i, note: `${y0}–${S.year}`}));
    }
    const adj = await adjacency(lvl);
    const pairs = [], nbMax = new Float64Array(n).fill(-Infinity), nbMin = new Float64Array(n).fill(Infinity);
    const deg = new Int32Array(n);
    for (let k = 0; k < adj.length; k += 2) {
      const a = adj[k], b = adj[k + 1];
      if (Number.isFinite(cur[a]) && Number.isFinite(cur[b])) {
        nbMax[a] = Math.max(nbMax[a], cur[b]); nbMax[b] = Math.max(nbMax[b], cur[a]);
        nbMin[a] = Math.min(nbMin[a], cur[b]); nbMin[b] = Math.min(nbMin[b], cur[a]);
        deg[a]++; deg[b]++;
        if (ok(a) && ok(b)) pairs.push([a, b, Math.abs(cur[a] - cur[b])]);
      }
    }
    pairs.sort((p, q) => q[2] - p[2]);
    const seen = new Set();
    lists.border = [];
    for (const [a, b] of pairs) {
      if (seen.has(a) || seen.has(b)) continue;
      seen.add(a); seen.add(b);
      const [hi, lo] = cur[a] >= cur[b] ? [a, b] : [b, a];
      lists.border.push({i: hi, pair: [{lvl, i: lo}]});
      if (lists.border.length >= 10) break;
    }
    const isl = [], poc = [];
    for (const i of idx) {
      if (deg[i] < 3) continue;
      if (cur[i] > nbMax[i]) isl.push([i, cur[i] - nbMax[i]]);
      if (cur[i] < nbMin[i]) poc.push([i, nbMin[i] - cur[i]]);
    }
    isl.sort((a, b) => b[1] - a[1]); poc.sort((a, b) => b[1] - a[1]);
    lists.island = isl.slice(0, 10).map(([i]) => ({i}));
    lists.pocket = poc.slice(0, 10).map(([i]) => ({i}));
  }
  S.ex = {lvl, lists, pos: {}};
  const order = ['top', 'bottom', 'rise', 'fall', 'border', 'island', 'pocket'];
  box.innerHTML = order.filter(k => lists[k] && lists[k].length)
    .map(k => `<button data-k="${k}">${t(k)}</button>`).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = () => showExample(b.dataset.k, b));
  $('#exTitle').hidden = !box.children.length;
}
function showExample(k, btn) {
  const list = S.ex.lists[k];
  const p = S.ex.pos[k] = ((S.ex.pos[k] ?? -1) + 1) % list.length;
  const e = list[p];
  btn.innerHTML = `${t(k)}<span class="n">${p + 1}/${list.length}</span>`;
  $('.search').classList.remove('open');  // phones: give the map back
  select(S.ex.lvl, e.i, true, e.pair || null, `${t('example')} ${p + 1}/${list.length} · ${t(k)}${e.note ? ' · ' + e.note : ''}`);
}

/* ---------- below the map ---------- */
function drawBelow(m, v, lvl) {
  const cur = v.at(S.year), cd = cache.codes[lvl];
  $('#mTitle').textContent = `${L(m)} · ${t('unitsAreas')[lvl]} · ${S.year}`;
  $('#mDesc').textContent = L(m.desc);
  const src = [`<b>${t('source')}:</b> ${m.source}`,
    `<b>${t('years')}:</b> ${LEVELS.filter(l => m.years[l]).map(l => `${t('unitsAreas')[l]} ${m.years[l][0]}–${m.years[l][m.years[l].length - 1]}`).join(' · ')}`];
  if (m.notes && L(m.notes)) src.push(`<b>${t('notes')}:</b> ${L(m.notes)}`);
  if (lvl === 'sec') src.push(L(META.harmonised_note));
  $('#mSrc').innerHTML = src.join('<br>');
  if (m.kind === 'cat') { drawBelowCat(m, v, lvl, cur); return; }
  const s = sortedOf(v, S.year);
  const facts = [[fmt(quantile(s, 0.5), m), `${t('median')} (${t('unitsAreas')[lvl]})`],
    [fmt(quantile(s, 0.1), m), t('p10')], [fmt(quantile(s, 0.9), m), t('p90')],
    [fmtInt(s.length), t('areas')]];
  $('#facts').innerHTML = facts.map(([a, b]) => `<div class="fact"><div class="v">${a}</div><div class="l">${b}</div></div>`).join('');
  const idx = [];
  for (let i = 0; i < cur.length; i++) if (Number.isFinite(cur[i]) && (cd.p[i] || 0) >= MIN_POP[lvl]) idx.push(i);
  idx.sort((a, b) => cur[b] - cur[a]);
  const li = i => `<li data-i="${i}"><span></span><span>${areaName(lvl, i).short} <small style="color:var(--muted)">${provOf(cd.c[i]).n}</small></span><span>${fmt(cur[i], m)}</span></li>`;
  const numbered = arr => arr.map((i, k) => li(i).replace('<span></span>', `<span>${k + 1}</span>`)).join('');
  $('#topList').innerHTML = numbered(idx.slice(0, 10));
  $('#bottomList').innerHTML = numbered(idx.slice(-10).reverse());
  $('#rankNote').textContent = `${t('minPop')} ${fmtInt(MIN_POP[lvl])} ${t('people')}.`;
  document.querySelectorAll('.rank li').forEach(x => x.onclick = () => {
    select(lvl, +x.dataset.i, true);
    window.scrollTo({top: 0, behavior: 'smooth'});
  });
  // Regions: median of areas per CCAA.
  const by = {};
  for (let i = 0; i < cur.length; i++) {
    if (!Number.isFinite(cur[i])) continue;
    const c = provOf(cd.c[i]).ccaa;
    (by[c] ||= []).push(cur[i]);
  }
  const rows = Object.entries(by).map(([c, a]) => [c, quantile(Float32Array.from(a).sort(), 0.5)])
    .sort((a, b) => b[1] - a[1]);
  const br = breaksFor(v), pal = palette(m);
  const lo = Math.min(0, ...rows.map(r => r[1])), hi = Math.max(...rows.map(r => r[1]));
  $('#regions').innerHTML = rows.map(([c, x]) =>
    `<div class="r"><span>${META.ccaa[c]}</span><div class="b" style="width:${(100 * (x - lo) / (hi - lo || 1)).toFixed(1)}%;background:${pal[Math.max(0, classOf(x, br))]}"></div><span>${fmt(x, m)}</span></div>`).join('');
  $('#regionsTitle').textContent = t('byRegion');
}
function drawBelowCat(m, v, lvl, cur) {
  const cats = META.categories[m.key], counts = new Map(), pop = new Map();
  const cd = cache.codes[lvl];
  for (let i = 0; i < cur.length; i++) {
    if (!Number.isFinite(cur[i])) continue;
    counts.set(cur[i], (counts.get(cur[i]) || 0) + 1);
    pop.set(cur[i], (pop.get(cur[i]) || 0) + (cd.p[i] || 0));
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const tot = rows.reduce((s, r) => s + r[1], 0);
  $('#facts').innerHTML = rows.slice(0, 4).map(([k, n]) =>
    `<div class="fact"><div class="v">${fmt(100 * n / tot, {unit: '%', dec: 0})}</div><div class="l">${L(cats[k])}: ${fmtInt(n)} ${t('unitsAreas')[lvl]}</div></div>`).join('');
  $('#topList').innerHTML = ''; $('#bottomList').innerHTML = ''; $('#rankNote').textContent = '';
  const mx = rows.length ? rows[0][1] : 1;
  $('#regionsTitle').textContent = t('unitsAreas')[lvl];
  $('#regions').innerHTML = rows.map(([k, n]) =>
    `<div class="r"><span>${L(cats[k])}</span><div class="b" style="width:${(100 * n / mx).toFixed(1)}%;background:${CAT_COL[cats[k].key]}"></div><span>${fmtInt(n)}</span></div>`).join('');
}

/* ---------- search ---------- */
function bindSearch() {
  const inp = $('#q'), ul = $('#sugg');
  let items = [], on = -1;
  const names = cache.codes.mun.n.map((n, i) => ({i, n, k: norm(n), p: cache.codes.mun.p[i] || 0}));
  const bars = cache.codes.bar ? cache.codes.bar.n.map((n, i) => ({i, n, k: norm(n || ''),
    p: cache.codes.bar.p[i] || 0})) : [];
  const show = list => {
    items = list; on = -1;
    ul.innerHTML = list.map((it, k) => `<li data-k="${k}">${it.label}${it.sub ? ` <small>${it.sub}</small>` : ''}</li>`).join('');
    ul.querySelectorAll('li').forEach(li => li.onclick = () => choose(items[+li.dataset.k]));
  };
  const choose = it => {
    if (!it) return;
    ul.innerHTML = ''; inp.value = it.label;
    if (it.bar !== undefined) { select('bar', it.bar, true); return; }
    if (it.mun !== undefined) select('mun', it.mun, false);
    if (it.mun !== undefined) {
      map.flyTo({center: [cache.codes.mun.x[it.mun], cache.codes.mun.y[it.mun]], zoom: 11.5, speed: 1.6});
    } else {
      map.flyTo({center: it.ll, zoom: 15.5, speed: 1.6});
      map.once('idle', () => {
        const f = map.queryRenderedFeatures(map.project(it.ll), {layers: [`${S.lvl}-fill`]})[0];
        const i = f && cache.codes[S.lvl] && cache.codes[S.lvl].idx.get(f.id);
        if (i !== undefined) select(S.lvl, i, false, null, it.label);
      });
    }
  };
  inp.addEventListener('input', () => {
    const q = norm(inp.value.trim());
    if (q.length < 2) { show([]); return; }
    const hits = names.filter(x => x.k.includes(q))
      .sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || b.p - a.p).slice(0, 8)
      .map(x => ({label: x.n, sub: provOf(cache.codes.mun.c[x.i]).n, mun: x.i}));
    const bh = bars.filter(x => x.k.includes(q))
      .sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || b.p - a.p).slice(0, 5)
      .map(x => ({label: x.n, sub: areaName('bar', x.i).sub, bar: x.i}));
    show([...bh, ...hits].slice(0, 9));
  });
  inp.addEventListener('keydown', async e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      on = Math.max(0, Math.min(items.length - 1, on + (e.key === 'ArrowDown' ? 1 : -1)));
      ul.querySelectorAll('li').forEach((li, k) => li.classList.toggle('on', k === on));
    } else if (e.key === 'Enter') {
      if (on >= 0) { choose(items[on]); return; }
      const q = inp.value.trim();
      if (q.length < 3) return;
      // Streets: Photon geocoder (OpenStreetMap), restricted to Spain. Only on Enter.
      try {
        const r = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&limit=6&bbox=-18.4,27.4,4.6,44.0`);
        const js = await r.json();
        const list = js.features.map(f => ({label: [f.properties.name, f.properties.street].filter(Boolean).join(', ') || q,
          sub: [f.properties.city || f.properties.county, f.properties.state].filter(Boolean).join(', '),
          ll: f.geometry.coordinates}));
        show(list.length ? list : [{label: t('noMatch'), sub: ''}]);
      } catch (err) { show([{label: t('noMatch'), sub: ''}]); }
    } else if (e.key === 'Escape') { show([]); }
  });
}

/* ---------- state, language, play ---------- */
function writeHash() {
  const c = map.getCenter();
  const h = `m=${S.metric}&l=${S.level}&y=${S.year}&v=${map.getZoom().toFixed(2)}/${c.lat.toFixed(4)}/${c.lng.toFixed(4)}&lang=${S.lang}`;
  history.replaceState(null, '', `#${h}`);
}
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const q = new URLSearchParams(location.search);
  if (MK[h.get('m')]) S.metric = h.get('m');
  if (['auto', ...LEVELS].includes(h.get('l'))) S.level = h.get('l');
  if (h.get('y')) S.year = +h.get('y');
  const lang = h.get('lang') || q.get('lang');
  if (lang === 'es' || lang === 'en') S.lang = lang;
  const v = (h.get('v') || '').split('/').map(Number);
  return v.length === 3 && v.every(Number.isFinite) ? {zoom: v[0], center: [v[2], v[1]]} : null;
}
function setMetric(k) {
  S.metric = k;
  $('#metric').value = k;
  stopPlay();
  render();
}
function stopPlay() {
  if (S.play) { clearInterval(S.play); S.play = null; $('#play').textContent = '▶'; }
}
function bindControls() {
  $('#metric').onchange = e => setMetric(e.target.value);
  document.querySelectorAll('#levels button').forEach(b => b.onclick = () => {
    S.level = b.dataset.l;
    render();
  });
  $('#year').oninput = async e => {
    const v = await values(S.lvl, S.metric);
    S.year = v.years[+e.target.value];
    render();
  };
  $('#play').onclick = async () => {
    if (S.play) { stopPlay(); return; }
    const v = await values(S.lvl, S.metric);
    if (S.year === v.years[v.years.length - 1]) S.year = v.years[0];
    $('#play').textContent = '❚❚';
    render();
    S.play = setInterval(async () => {
      const vv = await values(S.lvl, S.metric);
      const k = vv.years.indexOf(S.year);
      if (k >= vv.years.length - 1) { stopPlay(); return; }
      S.year = vv.years[k + 1];
      render();
    }, 1100);
  };
  $('#lang').onclick = () => { S.lang = S.lang === 'es' ? 'en' : 'es'; applyLang(); render(); };
  $('#canarias').onclick = () => {
    const inCan = map.getCenter().lat < 31;
    map.flyTo(inCan ? {center: [-3.4, 40.0], zoom: 5.2} : {center: [-15.7, 28.45], zoom: 7.1});
    $('#canarias').textContent = inCan ? t('canarias') : t('peninsula');
  };
  $('#more').onclick = () => $('.search').classList.toggle('open');
}
function applyLang() {
  document.documentElement.lang = S.lang;
  document.title = `${t('brand')} · INE`;
  document.querySelectorAll('[data-t]').forEach(n => { n.textContent = t(n.dataset.t); });
  document.querySelectorAll('footer[data-es]').forEach(f => { f.textContent = f.dataset[S.lang]; });
  $('#q').placeholder = t('search');
  document.querySelectorAll('nav.pages a').forEach(a => {
    a.textContent = a.dataset[S.lang];
    a.href = a.href.split('?')[0].split('#')[0] + `?lang=${S.lang}`;
  });
  buildMetricSelect();
  $('#canarias').textContent = map && map.getCenter().lat < 31 ? t('peninsula') : t('canarias');
}

/* ---------- boot ---------- */
async function main() {
  [META, TILES] = await Promise.all([getJSON('data/meta.json'), getJSON('tiles/index.json')]);
  MK = Object.fromEntries(META.metrics.map(m => [m.key, m]));
  S.metric = META.default;
  const view = readHash();
  LEVELS = LEVELS.filter(l => TILES[l]);
  await codes('mun');
  if (TILES.bar) await codes('bar');
  if (!TILES.bar) document.querySelector('#levels button[data-l="bar"]')?.remove();
  applyLang();
  const style = await baseStyle();
  map = new maplibregl.Map({container: 'map', style, minZoom: 3.5, maxZoom: 17.5,
    attributionControl: false, dragRotate: false, pitchWithRotate: false,
    ...(view || {bounds: [[-9.6, 35.7], [4.6, 43.9]], fitBoundsOptions: {padding: 20}})});
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right');
  map.addControl(new maplibregl.AttributionControl({compact: true,
    customAttribution: 'Datos: <a href="https://www.ine.es">INE</a>'}));
  map.on('load', () => {
    addLayers();
    bindPointer();
    bindSearch();
    bindControls();
    render();
  });
  let lastLvl = null;
  map.on('zoomend', () => { const l = effLevel(); if (l !== lastLvl) { lastLvl = l; render(); } else { drawHint(S.lvl); writeHash(); } });
  map.on('moveend', writeHash);
}
main().catch(e => { console.error(e); $('#hint').hidden = false; $('#hint').textContent = String(e); });
