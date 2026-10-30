// 台灣點陣地圖（Natural Earth 輪廓）
(function () {
  const canvas = document.getElementById('taiwan-map-canvas');
  const inner = document.querySelector('.taiwan-map-inner');
  const markersEl = document.getElementById('taiwan-map-markers');
  if (!canvas || !inner || !markersEl) return;

  const PAD = 20;
  const DOT_STEP = 0.012;
  function getLocations() {
    const t = window.i18n ? window.i18n.t : () => '';
    return [
      { lon: 121.15, lat: 22.76, label: t('map.birth'), cls: 'taiwan-marker-birth' },
      { lon: 120.96, lat: 23.91, label: t('map.home'), cls: 'taiwan-marker-home' },
    ];
  }

  let multiPoly = null;
  let project = null;
  let mapW = 0;
  let mapH = 0;

  function pointInRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi))
        inside = !inside;
    }
    return inside;
  }

  function pointInPolygon(lon, lat, rings) {
    if (!pointInRing(lon, lat, rings[0])) return false;
    for (let h = 1; h < rings.length; h++) {
      if (pointInRing(lon, lat, rings[h])) return false;
    }
    return true;
  }

  function pointInMulti(lon, lat, multi) {
    for (let i = 0; i < multi.length; i++) {
      if (pointInPolygon(lon, lat, multi[i])) return true;
    }
    return false;
  }

  function getMultiBounds(multi) {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    multi.forEach(poly => {
      poly[0].forEach(([lon, lat]) => {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });
    });
    return { minLon, maxLon, minLat, maxLat };
  }

  function makeProjection(multi, w, h, pad) {
    const b = getMultiBounds(multi);
    const scale = Math.min(
      (w - pad * 2) / (b.maxLon - b.minLon),
      (h - pad * 2) / (b.maxLat - b.minLat)
    );
    const cx = (b.minLon + b.maxLon) / 2;
    const cy = (b.minLat + b.maxLat) / 2;
    return function (lon, lat) {
      return {
        x: w / 2 + (lon - cx) * scale,
        y: h / 2 - (lat - cy) * scale,
      };
    };
  }

  function buildDots(multi, proj, bounds) {
    const dots = [];
    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += DOT_STEP) {
      for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += DOT_STEP) {
        if (pointInMulti(lon, lat, multi)) dots.push(proj(lon, lat));
      }
    }
    return dots;
  }

  function draw(dots) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = mapW * dpr;
    canvas.height = mapH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, mapW, mapH);

    const a = project(0, 0), b = project(DOT_STEP, 0);
    const r = Math.min(1.4, Math.abs(b.x - a.x) * 0.42);
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(236, 230, 218, 0.3)';
      ctx.fill();
    }

    const [from, to] = getLocations().map(l => project(l.lon, l.lat));
    const cx = (from.x + to.x) / 2 + Math.abs(to.y - from.y) * 0.45;
    const cy = (from.y + to.y) / 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(cx, cy, to.x, to.y);
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f0662b';
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function placeMarkers() {
    markersEl.innerHTML = '';
    getLocations().forEach(loc => {
      const p = project(loc.lon, loc.lat);
      const el = document.createElement('div');
      el.className = 'taiwan-marker ' + loc.cls;
      el.style.left = (p.x / mapW * 100) + '%';
      el.style.top = (p.y / mapH * 100) + '%';
      el.innerHTML = `
        <span class="taiwan-marker-pulse"></span>
        <span class="taiwan-marker-dot"></span>
        <span class="taiwan-marker-label">${loc.label}</span>
      `;
      markersEl.appendChild(el);
    });
  }

  function render() {
    if (!multiPoly) return;
    mapW = inner.clientWidth;
    mapH = inner.clientHeight;
    if (mapW < 10 || mapH < 10) return;

    project = makeProjection(multiPoly, mapW, mapH, PAD);
    const bounds = getMultiBounds(multiPoly);
    const dots = buildDots(multiPoly, project, bounds);
    draw(dots);
    placeMarkers();
  }

  fetch('data/taiwan.json')
    .then(r => r.json())
    .then(data => {
      multiPoly = data.coordinates;
      render();
      new ResizeObserver(() => render()).observe(inner);
    })
    .catch(err => console.error('台灣地圖載入失敗', err));

  document.addEventListener('langchange', () => render());
  document.addEventListener('i18nready', () => render());
})();
