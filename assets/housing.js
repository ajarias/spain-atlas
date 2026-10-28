/* Housing buyer scorecard for the Spain atlas (loaded after atlas.js; uses its globals).
   Every indicator becomes a percentile within the comparison set (same city, province or
   Spain); pillars average their indicators; the Housing Score is the weighted mean of pillars
   for the chosen buyer profile. Nationality and origin are never inputs. */
'use strict';

const HT = {
  es: {
    title: 'Ficha para comprar', score: 'Housing Score', compare: 'Comparado con',
    city: 'Su ciudad', prov: 'Provincia', es: 'España', profiles: 'Perfil',
    balanced: 'Equilibrado', family: 'Familia', young: 'Joven profesional', retiree: 'Jubilado',
    investor: 'Inversor', tabs: ['Puntuación', 'Vivienda', 'Servicios', 'Gente', 'Todo'],
    pillars: {affordability: 'Asequibilidad', daily: 'Vida diaria a pie', safety: 'Seguridad y riesgos',
      neighbourhood: 'Barrio', buildings: 'Edificios', outlook: 'Perspectivas'},
    levels: ['muy bien', 'bien', 'regular', 'mal'], missing: 'Sin datos para:',
    weights: 'Ajustar pesos', reset: 'Restablecer', percentile: 'percentil',
    fairness: 'La puntuación no usa nacionalidad ni origen. Los datos de barrio solo incluyen renta, paro y estudios.',
    sources: 'Fuentes: INE; Ministerio de Vivienda (SERPAVI, valor tasado, notarios); Ministerio del Interior; MITECO; OpenStreetMap; Catastro.',
    info: 'Información, no puntúa', vsArea: 'mejor que el', ofAreas: 'de las áreas comparadas',
    noScore: 'No hay datos suficientes para puntuar esta zona.', open: 'Ver todos los indicadores',
  },
  en: {
    title: 'Buyer scorecard', score: 'Housing Score', compare: 'Compared with',
    city: 'Its city', prov: 'Province', es: 'Spain', profiles: 'Profile',
    balanced: 'Balanced', family: 'Family', young: 'Young professional', retiree: 'Retiree',
    investor: 'Investor', tabs: ['Score', 'Housing', 'Services', 'People', 'All'],
    pillars: {affordability: 'Affordability', daily: 'Daily life on foot', safety: 'Safety and risks',
      neighbourhood: 'Neighbourhood', buildings: 'Buildings', outlook: 'Outlook'},
    levels: ['great', 'good', 'okay', 'bad'], missing: 'No data for:',
    weights: 'Adjust weights', reset: 'Reset', percentile: 'percentile',
    fairness: 'The score never uses nationality or origin. Neighbourhood data cover only income, unemployment and education.',
    sources: 'Sources: INE; Ministry of Housing (SERPAVI, appraisals, notaries); Ministry of the Interior; MITECO; OpenStreetMap; Catastro.',
    info: 'For information, not scored', vsArea: 'better than', ofAreas: 'of compared areas',
    noScore: 'Not enough data to score this area.', open: 'See every indicator',
  },
};
const ROWS = {
  score: ['price_m2', 'rent_m2', 'rent_to_income', 'crime_rate', 'flood_t100_pct', 'essentials_15min',
    'walk_transit', 'walk_school', 'income_net_pp', 'unemployment_rate', 'year_built_median', 'pop_change_5y'],
  housing: ['price_m2', 'price_to_income', 'rent_m2', 'rent_to_income', 'gross_yield', 'rent_change_5y',
    'sales_per_1000', 'pct_rented', 'pct_non_main', 'year_built_median', 'pct_pre1980', 'm2_per_dwelling'],
  services: ['essentials_15min', 'walk_supermarket', 'walk_school', 'walk_health_centre', 'walk_pharmacy',
    'walk_transit', 'walk_park', 'amenity_density'],
  people: ['pop', 'mean_age', 'pct_under18', 'pct_65plus', 'household_size', 'pct_single_households',
    'pct_foreign_nat', 'pct_tertiary'],
};
const BAND = ['#4caf50', '#9ccc65', '#f6c544', '#ef5350'];  // great, good, okay, bad
const band = p => (p >= 75 ? 0 : p >= 55 ? 1 : p >= 35 ? 2 : 3);

const HS = {
  profile: 'balanced', compare: 'city', weights: null, tab: 0, open: false,
  inputs: {}, results: {}, raw: {},
  tt(k) { return HT[S.lang][k]; },

  def() { return META.housing; },
  profileDef() { return this.def().profiles[this.profile]; },
  currentWeights() { return this.weights || {...this.profileDef().weights}; },
  invalidate() { this.results = {}; },

  async load(lvl) {
    if (!this.inputs[lvl]) {
      this.inputs[lvl] = getF32(`data/${lvl}/housing.bin`).then(a => {
        const keys = Object.keys((this.def().years || {})[lvl] || {});
        const n = META.levels[lvl].n, out = {};
        keys.forEach((k, j) => { out[k] = a.subarray(j * n, (j + 1) * n); });
        return out;
      });
    }
    return this.inputs[lvl];
  },

  groups(lvl) {  // comparison-group id per area
    const cd = cache.codes[lvl], n = cd.c.length, g = new Array(n);
    if (this.compare === 'es') return g.fill('es');
    const mun = Array.from({length: n}, (_, i) => munOf(lvl, i));
    if (this.compare === 'prov' || lvl === 'mun') return mun.map(m => m.slice(0, 2));
    const count = {};
    mun.forEach(m => { count[m] = (count[m] || 0) + 1; });
    return mun.map(m => (count[m] >= 8 ? m : m.slice(0, 2)));  // small towns: province
  },

  indicators() {  // pillar -> {key: direction * emphasis}
    const d = this.def(), prof = this.profileDef(), out = {};
    for (const [p, inds] of Object.entries(d.pillars)) {
      out[p] = {...inds, ...((prof.extra || {})[p] || {})};
      for (const k of Object.keys(out[p])) {
        const flip = (prof.flip || {})[k] ? -1 : 1;
        out[p][k] = Math.sign(out[p][k]) * flip * ((prof.emphasis || {})[k] || 1);
      }
    }
    return out;
  },

  async compute(lvl) {
    const key = `${lvl}|${this.profile}|${this.compare}|${JSON.stringify(this.weights)}`;
    if (this.results[key]) return this.results[key];
    const [inp] = await Promise.all([this.load(lvl), codes(lvl)]);
    const n = META.levels[lvl].n, grp = this.groups(lvl), ind = this.indicators();
    const pct = {};
    const pctOf = (k, dir) => {
      const id = `${k}|${dir > 0 ? 1 : -1}`;
      if (pct[id]) return pct[id];
      const v = inp[k], out = new Float32Array(n).fill(NaN);
      if (!v) return (pct[id] = out);
      const by = {};
      for (let i = 0; i < n; i++) if (Number.isFinite(v[i])) (by[grp[i]] ||= []).push(i);
      for (const idx of Object.values(by)) {
        if (idx.length < 3) continue;
        idx.sort((a, b) => v[a] - v[b]);
        // A value shared by the whole group (a town-level figure compared within the town)
        // says nothing about the area: leave it unscored.
        if (v[idx[0]] === v[idx[idx.length - 1]]) continue;
        // average rank for ties, scaled 0..100
        for (let s = 0; s < idx.length;) {
          let e = s;
          while (e + 1 < idx.length && v[idx[e + 1]] === v[idx[s]]) e++;
          const r = 100 * ((s + e) / 2) / (idx.length - 1);
          for (let q = s; q <= e; q++) out[idx[q]] = dir > 0 ? r : 100 - r;
          s = e + 1;
        }
      }
      return (pct[id] = out);
    };
    const W = this.currentWeights(), pillar = {}, score = new Float32Array(n).fill(NaN);
    for (const [p, inds] of Object.entries(ind)) {
      const arr = new Float32Array(n).fill(NaN);
      const parts = Object.entries(inds).map(([k, w]) => [pctOf(k, w), Math.abs(w)]);
      for (let i = 0; i < n; i++) {
        let s = 0, ws = 0;
        for (const [a, w] of parts) if (Number.isFinite(a[i])) { s += a[i] * w; ws += w; }
        if (ws) arr[i] = s / ws;
      }
      pillar[p] = arr;
    }
    for (let i = 0; i < n; i++) {
      let s = 0, ws = 0, have = 0;
      for (const [p, w] of Object.entries(W)) {
        if (!w) continue;
        const x = pillar[p][i];
        if (Number.isFinite(x)) { s += x * w; ws += w; have++; }
      }
      if (have >= 3) score[i] = s / ws;  // at least three pillars to score an area
    }
    const res = {pct: pctOf, pillar, score, inp, ind};
    this.results[key] = res;
    return res;
  },

  async values(lvl) {  // atlas.js metric interface for 'housing_score'
    const r = await this.compute(lvl);
    const years = [2025];
    return {years, n: r.score.length, a: r.score, sorted: {}, med: {},
      at: y => (y === 2025 ? r.score : null)};
  },

  refresh() {
    this.invalidate();
    if (S.metric === 'housing_score') render(); else if (S.sel) drawCard();
  },

  rowHtml(k, r, i, lvl, scored) {
    const m = MK[k];
    if (!m) return '';
    let x = r.inp[k] ? r.inp[k][i] : NaN, p = NaN;
    let dir = 0;
    for (const inds of Object.values(r.ind)) if (inds[k]) dir = inds[k];
    if (!Number.isFinite(x)) {
      // not a scored input: read the metric's own latest value from the profile/values cache
      x = this.raw[`${lvl}|${k}|${i}`];
    }
    if (dir && Number.isFinite(x)) p = r.pct(k, dir)[i];
    const known = Number.isFinite(x);
    const txt = known ? fmt(x, m) : t('nodata');
    const w = Number.isFinite(p) ? Math.max(8, p) : 100;
    const col = Number.isFinite(p) ? BAND[band(p)] : 'var(--chip)';
    const tip = Number.isFinite(p) ? `${this.tt('percentile')} ${Math.round(p)}` : (scored ? '' : this.tt('info'));
    return `<div class="srow" data-k="${k}" title="${tip}"><span class="sl">${L(m)}</span>` +
      `<div class="sbar"><i style="width:${w}%;background:${col}"></i><b class="${Number.isFinite(p) && band(p) === 3 ? 'w' : ''}">${txt}</b></div></div>`;
  },

  async fillRaw(lvl, i, keys) {  // non-scored rows: latest value from each metric file
    await Promise.all(keys.map(async k => {
      const m = MK[k];
      if (!m || !m.years[lvl] || m.kind !== 'num') return;
      const id = `${lvl}|${k}|${i}`;
      if (id in this.raw) return;
      const v = await values(lvl, k);
      const arr = v.at(v.years[v.years.length - 1]);
      this.raw[id] = arr ? arr[i] : NaN;
    }));
  },

  async drawScorecard() {
    const card = $('#card');
    const {lvl, i, label} = S.sel;
    const r = await this.compute(lvl);
    const nm = areaName(lvl, i), cd = cache.codes[lvl], T2 = HT[S.lang];
    const sc = r.score[i];
    const tabKeys = ['score', 'housing', 'services', 'people', 'all'];
    const tabKey = tabKeys[this.tab];
    let rows = tabKey === 'all' ? [] : ROWS[tabKey];
    if (tabKey === 'all') rows = META.metrics.filter(m => m.years[lvl] && m.kind === 'num').map(m => m.key);
    await this.fillRaw(lvl, i, rows);
    let h = `<button class="x" aria-label="${t('closeHint')}">×</button>`;
    if (label) h += `<div class="nb">${label}</div>`;
    h += `<div class="shead"><div><h3>${nm.title}</h3><p class="meta">${nm.sub}</p>`;
    if (cd.p[i]) h += `<p class="meta">${fmtInt(cd.p[i])} ${t('inhab')}</p>`;
    const bi = lvl === 'sec' && cd.b ? cd.b[i] : -1;
    if (bi >= 0) h += `<div class="nb">${t('barrio')} <a href="#" data-bar="${bi}">${cache.codes.bar.n[bi]}</a></div>`;
    h += '</div>';
    if (Number.isFinite(sc)) {
      h += `<div class="sbadge" style="background:${BAND[band(sc)]}"><b>${Math.round(sc)}</b><span>/100</span><small>${T2.levels[band(sc)]}</small></div>`;
    }
    h += '</div>';
    h += `<div class="chips sc">${Object.keys(this.def().profiles).map(p =>
      `<button data-prof="${p}" class="${p === this.profile ? 'on' : ''}">${T2[p]}</button>`).join('')}</div>`;
    h += `<div class="cmp"><span>${T2.compare}</span><div class="seg">${['city', 'prov', 'es'].map(c =>
      `<button data-cmp="${c}" class="${c === this.compare ? 'on' : ''}">${T2[c]}</button>`).join('')}</div></div>`;
    if (!Number.isFinite(sc)) h += `<p class="meta">${T2.noScore}</p>`;
    // Pillars
    const W = this.currentWeights(), missing = [];
    h += '<div class="pillars">' + Object.keys(this.def().pillars).map(p => {
      const x = r.pillar[p][i];
      if (!Number.isFinite(x)) missing.push(T2.pillars[p]);
      const w = Number.isFinite(x) ? Math.max(6, x) : 0;
      return `<div class="pill"><span>${T2.pillars[p]} <small>${W[p] || 0}%</small></span><div class="sbar"><i style="width:${w}%;background:${Number.isFinite(x) ? BAND[band(x)] : 'transparent'}"></i><b>${Number.isFinite(x) ? Math.round(x) : '—'}</b></div></div>`;
    }).join('') + '</div>';
    if (missing.length) h += `<p class="nb">${T2.missing} ${missing.join(', ')}</p>`;
    h += `<details class="wts"${this.open ? ' open' : ''}><summary>${T2.weights}</summary>` +
      Object.keys(this.def().pillars).map(p => `<label><span>${T2.pillars[p]}</span><input type="range" min="0" max="50" step="5" value="${W[p] || 0}" data-w="${p}"><b>${W[p] || 0}</b></label>`).join('') +
      `<button data-reset="1">${T2.reset}</button></details>`;
    // Tabs
    h += `<div class="stabs">${T2.tabs.map((x, k) => `<button data-tab="${k}" class="${k === this.tab ? 'on' : ''}">${x}</button>`).join('')}</div>`;
    const scoredKeys = new Set(Object.values(r.ind).flatMap(o => Object.keys(o)));
    h += '<div class="srows">' + rows.map(k => this.rowHtml(k, r, i, lvl, scoredKeys.has(k))).join('') + '</div>';
    if (tabKey === 'people') h += `<p class="nb">${T2.info}.</p>`;
    h += `<p class="nb">${T2.fairness}</p><p class="nb">${T2.sources}</p>`;
    card.innerHTML = h;
    card.classList.add('wide');
    card.hidden = false;
    card.querySelector('.x').onclick = () => { clearSel(); S.sel = null; S.pair = null; card.hidden = true; card.classList.remove('wide'); };
    card.querySelectorAll('[data-prof]').forEach(b => b.onclick = () => {
      this.profile = b.dataset.prof; this.weights = null; this.refresh();
    });
    card.querySelectorAll('[data-cmp]').forEach(b => b.onclick = () => { this.compare = b.dataset.cmp; this.refresh(); });
    card.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { this.tab = +b.dataset.tab; this.drawScorecard(); });
    card.querySelectorAll('.srow[data-k]').forEach(row => row.onclick = () => setMetric(row.dataset.k));
    const det = card.querySelector('details.wts');
    det.ontoggle = () => { this.open = det.open; };
    let tm;
    card.querySelectorAll('input[data-w]').forEach(inp => inp.oninput = () => {
      const w = {...this.currentWeights(), [inp.dataset.w]: +inp.value};
      inp.nextElementSibling.textContent = inp.value;
      clearTimeout(tm);
      tm = setTimeout(() => { this.weights = w; this.refresh(); }, 250);
    });
    card.querySelector('[data-reset]').onclick = () => { this.weights = null; this.refresh(); };
    bindCardLinks(card);
  },
};
