/* Spain atlas analysis pages: renders window.CHARTS (ECharts options per language) and keeps
   the ES/EN toggle, number formats and dark mode in step. */
'use strict';
(function () {
  const qs = new URLSearchParams(location.search);
  let lang = qs.get('lang') === 'en' ? 'en' : 'es';
  const charts = [];

  function num(x, dec) {
    return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-GB',
      {minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always'})
      .format(x).replace('-', '−');
  }
  function fmt(x, f) {
    if (x == null || Number.isNaN(+x)) return '—';
    const s = num(+x, f.dec || 0);
    if (f.unit === '€') return lang === 'es' ? `${s} €` : `€${s}`;
    if (f.unit === '%' || f.unit === '×') return s + f.unit;
    return s;
  }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  function prepare(src, f) {
    const o = JSON.parse(JSON.stringify(src));
    const fg = css('--fg'), muted = css('--muted');
    o.backgroundColor = 'transparent';
    o.textStyle = {...(o.textStyle || {}), color: fg};
    if (o.legend && o.legend.show !== false) o.legend.textStyle = {color: fg};
    const val = v => fmt(Array.isArray(v) ? v[v.length - 1] : v, f);
    o.tooltip = {...(o.tooltip || {}), valueFormatter: val,
      backgroundColor: css('--card') || '#fff', textStyle: {color: fg}, borderColor: css('--line')};
    for (const ax of ['xAxis', 'yAxis']) {
      const list = Array.isArray(o[ax]) ? o[ax] : o[ax] ? [o[ax]] : [];
      for (const a of list) {
        a.axisLabel = {...(a.axisLabel || {}), color: muted};
        a.nameTextStyle = {...(a.nameTextStyle || {}), color: muted};
        if (a.type === 'value') a.axisLabel.formatter = v => (f.unit === '€' ? num(v, 0) : fmt(v, {...f, dec: Number.isInteger(v) ? 0 : f.dec}));
      }
    }
    for (const s of o.series || []) {
      if (s.label && s.label._fmt) {
        s.label.formatter = p => fmt(Array.isArray(p.value) ? p.value[p.value.length - 1] : (p.value && p.value.value !== undefined ? p.value.value : p.value), f);
        if (s.type !== 'heatmap' && s.label.color !== '#fff') s.label.color = muted;
      }
      if (s.type === 'scatter' && s.label && s.label.show) s.label.color = fg;
      if (s.type === 'heatmap') s.label.color = '#1d1d1b';
      if (s.type === 'scatter' && !s.label) {
        s.tooltip = {formatter: p => `${num(p.value[0], 1)} · ${fmt(p.value[1], f)}`};
      }
    }
    if (o.visualMap) o.visualMap.textStyle = {color: muted};
    return o;
  }

  function draw() {
    for (const c of charts) c.inst.setOption(prepare(c.spec.opt[lang], c.spec.fmt), true);
  }
  function text() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-es]').forEach(n => {
      const v = n.dataset[lang];
      if (n.hasAttribute('data-raw')) n.innerHTML = v; else n.textContent = v;
    });
    document.querySelectorAll('[data-t]').forEach(n => {
      n.textContent = {brand: lang === 'es' ? 'Atlas de España' : 'Spain Atlas',
        sub: lang === 'es' ? 'datos del INE' : 'INE data'}[n.dataset.t] || n.textContent;
    });
    document.querySelectorAll('nav.pages a').forEach(a => {
      a.href = a.getAttribute('href').split('?')[0].split('#')[0] + `?lang=${lang}`;
    });
    document.querySelectorAll('.exhibit a[href^="index.html"]').forEach(a => {
      a.href = a.getAttribute('href').replace(/&lang=\w+/, '') + `&lang=${lang}`;
    });
  }
  function init() {
    for (const spec of window.CHARTS || []) {
      const el = document.getElementById(spec.id);
      if (!el) continue;
      charts.push({spec, inst: echarts.init(el, null, {renderer: 'canvas'})});
    }
    text();
    draw();
    document.getElementById('lang').onclick = () => { lang = lang === 'es' ? 'en' : 'es'; text(); draw(); };
    let tm;
    addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => charts.forEach(c => c.inst.resize()), 120); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
  }
  init();
})();
