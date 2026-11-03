// Tech Kadak home: scroll chapters, 3D stage (lazy), tilt card, wave, "apna kit banao".
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const apps = JSON.parse($('#featured-data').textContent);
const stage = $('#stage'), sticky = $('.stage-sticky'), canvas = $('#hero3d');
const pointsEl = $('#points'), selName = $('#selName'), selCat = $('#selCat'), selLink = $('#selLink');
const tiles = $$('.cf-tile');
let sel = 0, three = null, P = 0;

function renderPoints() {
  const a = apps[sel];
  pointsEl.innerHTML = `<li class="pt-name">${esc(a.name)}</li>` + a.points.map((p) => `<li><b>${esc(p.k)}</b>${esc(p.v)}</li>`).join('');
  update();
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function setSel(i, from3d) {
  sel = (i + apps.length) % apps.length;
  const a = apps[sel]; selName.textContent = a.name; selCat.textContent = a.cat; selLink.href = `apps/${a.slug}.html`;
  tiles.forEach((t, k) => t.classList.toggle('on', k === sel));
  if (three && !from3d) three.select(sel);
  renderPoints();
}
$('#prevBtn').addEventListener('click', () => setSel(sel - 1));
$('#nextBtn').addEventListener('click', () => setSel(sel + 1));
addEventListener('keydown', (e) => { if (P > 0.24 && P < 0.52 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) setSel(sel + (e.key === 'ArrowRight' ? 1 : -1)); });

const chapters = $$('.chapters a'); const chapNav = $('.chapters');
function update() {
  const r = stage.getBoundingClientRect(); const total = stage.offsetHeight - innerHeight;
  P = clamp01(-r.top / total);
  const s = sticky.style;
  s.setProperty('--introOp', (1 - seg(P, 0.1, 0.2)).toFixed(3));
  const selOp = seg(P, 0.25, 0.3) * (1 - seg(P, 0.47, 0.52));
  s.setProperty('--selOp', selOp.toFixed(3)); s.setProperty('--selPE', selOp > 0.5 ? 'auto' : 'none');
  s.setProperty('--glow', seg(P, 0.5, 0.6).toFixed(3));
  s.setProperty('--giantOp', (seg(P, 0.56, 0.66) * 0.9).toFixed(3));
  s.setProperty('--giantBlur', lerp(18, 1.5, seg(P, 0.78, 0.97)).toFixed(2));
  s.setProperty('--giantS', lerp(1.18, 1, seg(P, 0.6, 0.97)).toFixed(3));
  $$('li', pointsEl).forEach((li, k) => li.classList.toggle('on', P > 0.6 + k * 0.065 && P < 0.985));
  if (three) three.setProgress(P);
  // chapter nav
  let ch = P < 0.22 ? 1 : 2;
  const today = $('#aaj-ka-app').getBoundingClientRect().top, qa = $('#qa').getBoundingClientRect().top;
  if (today < innerHeight * 0.6) ch = 3; if (qa < innerHeight * 0.6) ch = 4;
  chapters.forEach((a) => a.classList.toggle('on', +a.dataset.ch === ch));
  chapNav.classList.toggle('hide', $('#follow').getBoundingClientRect().top < innerHeight * 0.7);
}
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } }, { passive: true });
addEventListener('resize', update);
chapters.forEach((a) => { if (a.dataset.p) a.addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: stage.offsetTop + (stage.offsetHeight - innerHeight) * +a.dataset.p, behavior: reduced ? 'auto' : 'smooth' }); }); });
renderPoints();

// 3D: only with WebGL, not on save-data, loaded after first paint
function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
const saveData = navigator.connection && navigator.connection.saveData;
if (webgl() && !saveData) {
  const go = () => import('./js/hero3d.js').then((m) => m.start({ canvas, apps, reduced, onSelect: (i) => setSel(i, true) }))
    .then((t) => { three = t; document.body.classList.add('has3d'); three.select(sel); update(); })
    .catch((e) => { console.warn('3D off:', e); });
  ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 300);
}

// reveal on scroll
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
$$('.reveal').forEach((el) => io.observe(el));

// tilt card
$$('[data-tilt]').forEach((el) => {
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 22 + 'deg'); el.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 16 + 'deg'); });
  el.addEventListener('pointerleave', () => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
});

// apna kit banao
const picked = [];
const chips = $$('.kit-chip'), slots = $$('.slot'), msg = $('#kitMsg'), share = $('#kitShare');
function drawKit() {
  chips.forEach((c) => c.setAttribute('aria-pressed', picked.includes(c.dataset.slug) ? 'true' : 'false'));
  slots.forEach((s, i) => { const slug = picked[i]; const chip = chips.find((c) => c.dataset.slug === slug); s.classList.toggle('full', !!slug);
    s.innerHTML = slug ? (chip.querySelector('img') ? `<img src="${chip.querySelector('img').getAttribute('src')}" alt="">` : esc(chip.dataset.name.slice(0, 2))) : String(i + 1); });
  share.disabled = picked.length < 3;
  msg.textContent = picked.length < 3 ? `${3 - picked.length} aur chuno 👆` : 'Kit ready 🔥 ' + picked.map((s) => chips.find((c) => c.dataset.slug === s).dataset.name).join(' + ');
}
chips.forEach((c) => c.addEventListener('click', () => {
  const i = picked.indexOf(c.dataset.slug);
  if (i > -1) picked.splice(i, 1); else { if (picked.length === 3) picked.shift(); picked.push(c.dataset.slug); }
  drawKit();
}));
share.addEventListener('click', async () => {
  const url = new URL('apps.html', location.href); url.searchParams.set('kit', picked.join(','));
  try { await navigator.clipboard.writeText(url.href); msg.textContent = 'Link copy ho gaya ✅ dosto ko bhejo'; } catch { prompt('Ye link copy karo:', url.href); }
});
const kitParam = new URLSearchParams(location.search).get('kit');
if (kitParam) { kitParam.split(',').slice(0, 3).forEach((s) => { if (chips.some((c) => c.dataset.slug === s)) picked.push(s); }); drawKit(); }
