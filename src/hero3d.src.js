// Tech Kadak 3D stage — source. Bundled (tree-shaken) into assets/js/hero3d.js with:
//   npx esbuild src/hero3d.src.js --bundle --minify --format=esm --outfile=assets/js/hero3d.js
// (only needed if you edit this file; the site itself has no build step)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from './unbounded-black.typeface.json';

const LIME = 0x9bff2e;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (p, a, b) => clamp01((p - a) / (b - a));

function loadImg(src) {
  return new Promise((res) => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function screenTexture(app, img, maxAniso) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 768; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 768); grd.addColorStop(0, '#111'); grd.addColorStop(1, '#030303');
  g.fillStyle = grd; g.fillRect(0, 0, 384, 768);
  const rg = g.createRadialGradient(192, 330, 10, 192, 330, 230); rg.addColorStop(0, 'rgba(155,255,46,.55)'); rg.addColorStop(1, 'rgba(155,255,46,0)');
  g.fillStyle = rg; g.fillRect(0, 60, 384, 560);
  g.fillStyle = '#9BFF2E'; g.font = '900 22px Unbounded, sans-serif'; g.textAlign = 'center'; g.fillText('TECH KADAK', 192, 70);
  // icon tile
  g.save(); rr(g, 92, 230, 200, 200, 46); g.fillStyle = '#fff'; g.fill(); g.clip();
  if (img) g.drawImage(img, 108, 246, 168, 168); else { g.fillStyle = '#000'; g.fillRect(92, 230, 200, 200); g.fillStyle = '#9BFF2E'; g.font = '900 72px Unbounded, sans-serif'; g.fillText(app.initials, 192, 355); }
  g.restore();
  g.fillStyle = '#fff'; g.font = '900 30px Unbounded, sans-serif';
  const name = app.name.length > 16 ? app.name.slice(0, 15) + '…' : app.name; g.fillText(name.toUpperCase(), 192, 500);
  g.fillStyle = '#9BFF2E'; rr(g, 117, 540, 150, 50, 25); g.fill(); g.fillStyle = '#000'; g.font = '900 22px Unbounded, sans-serif'; g.fillText(app.pricing.toUpperCase(), 192, 573);
  g.fillStyle = 'rgba(255,255,255,.25)'; rr(g, 152, 720, 80, 8, 4); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(190,255,110,1)'); rg.addColorStop(.35, 'rgba(155,255,46,.55)'); rg.addColorStop(1, 'rgba(155,255,46,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function start({ canvas, apps, onSelect, reduced }) {
  const small = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.fog = new THREE.Fog(0x050505, 9, 30);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x223311, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 6); scene.add(key);
  const rim = new THREE.PointLight(LIME, 30, 14, 1.6); rim.position.set(-3, 1, -2); scene.add(rim);
  const glowTex = glowTexture();

  // ---------- CHAPTER 01: giant letters in a layered scene ----------
  const intro = new THREE.Group(); scene.add(intro);
  const font = new FontLoader().parse(fontJson);
  const mk = (txt, size, mat) => {
    const geo = new TextGeometry(txt, { font, size, depth: size * 0.42, curveSegments: small ? 4 : 7, bevelEnabled: true, bevelThickness: size * 0.05, bevelSize: size * 0.035, bevelSegments: small ? 2 : 3 });
    geo.computeBoundingBox(); const bb = geo.boundingBox; geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -(bb.max.z + bb.min.z) / 2);
    return new THREE.Mesh(geo, mat);
  };
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf4f4f4, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15 });
  const limeMat = new THREE.MeshPhysicalMaterial({ color: LIME, roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0x2a5a00, emissiveIntensity: 0.35 });
  const tech = mk('TECH', 1.3, white); tech.position.set(0, 1.0, 0);
  const kadak = mk('KADAK', 1.3, limeMat); kadak.position.set(0, -0.75, 0.35);
  intro.add(tech, kadak);
  // moon (behind) + halo
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.MeshBasicMaterial({ color: LIME, fog: false }));
  moon.position.set(2.6, 1.6, -11); intro.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
  halo.scale.set(13, 13, 1); halo.position.copy(moon.position).add(new THREE.Vector3(0, 0, -0.1)); intro.add(halo);
  // ground grid
  const grid = new THREE.GridHelper(60, 60, LIME, 0x1d2b10); grid.position.y = -2.4; grid.material.transparent = true; grid.material.opacity = 0.35; intro.add(grid);
  // particles
  const N = small ? 260 : 600; const pg = new THREE.BufferGeometry(); const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 26; pos[i * 3 + 1] = Math.random() * 9 - 2.2; pos[i * 3 + 2] = Math.random() * -24 + 8; }
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: LIME, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false })); intro.add(dots);

  // ---------- app tiles (used as floating depth layers) ----------
  const imgs = await Promise.all(apps.map((a) => loadImg(a.icon)));
  const tileGeo = new RoundedBoxGeometry(1, 1, 0.22, 4, 0.2);
  const tileMats = apps.map((a, i) => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = i % 3 === 1 ? '#9BFF2E' : (i % 3 === 2 ? '#ffffff' : '#0b0b0b'); g.fillRect(0, 0, 256, 256);
    if (imgs[i]) { g.save(); rr(g, 40, 40, 176, 176, 40); g.fillStyle = '#fff'; g.fill(); g.clip(); g.drawImage(imgs[i], 48, 48, 160, 160); g.restore(); }
    else { g.fillStyle = i % 3 === 0 ? '#9BFF2E' : '#000'; g.font = '900 90px Unbounded, sans-serif'; g.textAlign = 'center'; g.fillText(a.initials, 128, 160); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const side = new THREE.MeshPhysicalMaterial({ color: i % 3 === 1 ? LIME : (i % 3 === 2 ? 0xffffff : 0x111111), roughness: 0.3, clearcoat: 1 });
    const face = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.2 });
    return [side, side, side, side, face, side];
  });
  const floaters = [];
  const layout = [[-4.4, -0.9, 3.0, 0.85], [4.4, -1.4, 3.6, 1.0], [-3.2, -1.9, 1.6, 0.7], [3.4, 2.4, 1.2, 0.65], [-6.5, 0.2, -3, 1.3], [6.2, 0.8, -4, 1.4], [-1.8, 3.2, -6, 1.1], [5.4, -2.3, 3.8, 0.6], [0.4, 3.4, 2.4, 0.5], [-5, 3, -8, 1.6]];
  layout.forEach(([x, y, z, s], i) => {
    const m = new THREE.Mesh(tileGeo, tileMats[i % tileMats.length]); m.position.set(x, y, z); m.scale.setScalar(s);
    m.rotation.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.5);
    m.userData = { base: m.position.clone(), r: m.rotation.clone(), ph: Math.random() * 6.28 }; intro.add(m); floaters.push(m);
  });

  // ---------- CHAPTER 02: phone carousel on a pedestal ----------
  const car = new THREE.Group(); scene.add(car); car.position.set(0, 0.55, -40);
  const phoneGeo = new RoundedBoxGeometry(1.25, 2.5, 0.16, 5, 0.15);
  const screenGeo = new THREE.PlaneGeometry(1.12, 2.24);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0c, metalness: 0.55, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const phones = apps.map((a, i) => {
    const grp = new THREE.Group(); const body = new THREE.Mesh(phoneGeo, bodyMat);
    const scr = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: screenTexture(a, imgs[i], maxAniso), toneMapped: false, transparent: true }));
    scr.position.z = 0.085; grp.add(body, scr);
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false })); back.position.set(0, 0.7, -0.085); back.rotation.y = Math.PI; grp.add(back);
    grp.userData = { i, scr }; car.add(grp); return grp;
  });
  const pedestal = new THREE.Group(); car.add(pedestal); pedestal.position.y = -1.85;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.75, 0.32, 64), new THREE.MeshPhysicalMaterial({ color: 0x0d0d0d, metalness: 0.6, roughness: 0.3, clearcoat: 1 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.035, 12, 96), new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.17;
  const pglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.85 })); pglow.scale.set(6, 2.2, 1); pglow.position.y = 0.05;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 3.2, 48, 1, true), new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 1.7; pedestal.add(ped, ring, pglow, beam);
  const spot = new THREE.SpotLight(0xffffff, 60, 12, 0.5, 0.6, 1.2); spot.position.set(0, 5, 2); car.add(spot); spot.target = phones[0];

  // ---------- state ----------
  let sel = 0, progress = 0, visible = true, raf = 0, last = performance.now(), t = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const select = (i) => { sel = (i + apps.length) % apps.length; spot.target = phones[sel]; onSelect && onSelect(sel); };
  addEventListener('pointermove', (e) => { pointer.tx = (e.clientX / innerWidth - 0.5) * 2; pointer.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  const ray = new THREE.Raycaster(); const v2 = new THREE.Vector2();
  canvas.addEventListener('click', (e) => {
    if (progress < 0.26 || progress > 0.52) return;
    const r = canvas.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, camera); const hit = ray.intersectObjects(phones, true)[0];
    if (hit) { let o = hit.object; while (o && o.userData.i === undefined) o = o.parent; if (o) select(o.userData.i); }
  });
  let sx = null; canvas.addEventListener('pointerdown', (e) => { sx = e.clientX; }, { passive: true });
  canvas.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 45 && progress > 0.26 && progress < 0.52) select(sel + (e.clientX < sx ? 1 : -1)); sx = null; }, { passive: true });

  kadak.geometry.computeBoundingBox(); const wordW = kadak.geometry.boundingBox.max.x - kadak.geometry.boundingBox.min.x;
  let letterS = 1;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect; // half-width per unit distance
    letterS = Math.min(1, (halfH * 10.6 * 2 * 0.86) / wordW);
    tech.scale.setScalar(letterS); kadak.scale.setScalar(letterS);
    const spread = camera.aspect < 0.8 ? 0.5 : 1;
    floaters.forEach((m) => { m.position.x = m.userData.base.x * spread; m.position.z = Math.min(m.userData.base.z, camera.aspect < 0.8 ? 2.2 : 9); });
  }
  addEventListener('resize', resize); resize();

  const tmpV = new THREE.Vector3();
  function frame(now) {
    raf = 0; if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!reduced) t += dt;
    pointer.x = lerp(pointer.x, pointer.tx, 0.06); pointer.y = lerp(pointer.y, pointer.ty, 0.06);
    const P = progress; const portrait = camera.aspect < 0.8; const fit = portrait ? Math.min(1, camera.aspect / 0.75) : 1;

    // --- chapter 01 camera: push through the letters ---
    const a = ease(seg(P, 0, 0.26));
    const introZ = lerp(11, -2, a);
    tech.position.x = lerp(0, -9, ease(seg(P, 0.12, 0.27))); tech.position.y = lerp(1.0 * letterS + (portrait ? 0.5 : 0), 2.2, a);
    kadak.position.x = lerp(0, 9, ease(seg(P, 0.12, 0.27))); kadak.position.y = lerp(-0.75 * letterS + (portrait ? 0.5 : 0), -2.0, a);
    tech.rotation.y = pointer.x * 0.12 + Math.sin(t * 0.5) * 0.04; kadak.rotation.y = pointer.x * 0.16 + Math.sin(t * 0.5 + 1) * 0.04;
    floaters.forEach((m, i) => { const u = m.userData; m.position.y = u.base.y * (portrait ? 1.4 : 1) + Math.sin(t * 0.8 + u.ph) * 0.18; m.rotation.x = u.r.x + Math.sin(t * 0.6 + u.ph) * 0.12; m.rotation.y = u.r.y + t * 0.15 * (i % 2 ? 1 : -1); });
    dots.rotation.y = t * 0.01;
    intro.visible = P < 0.3;

    // --- chapter 02: carousel → glow feature ---
    const enter = ease(seg(P, 0.2, 0.3));
    const feat = ease(seg(P, 0.5, 0.6));
    const exit = ease(seg(P, 0.92, 1));
    car.visible = P > 0.18;
    const spacing = portrait ? 1.75 : 2.0;
    phones.forEach((ph, i) => {
      let d = i - sel; if (d > apps.length / 2) d -= apps.length; if (d < -apps.length / 2) d += apps.length;
      const isSel = d === 0;
      let tx = d * spacing, ty = 0.1 + Math.sin(t * 1.2 + i) * 0.06, tz = -Math.abs(d) * 0.9, ry = -d * 0.32 + (isSel ? pointer.x * 0.25 + Math.sin(t * 0.7) * 0.12 : 0), s = isSel ? 1.18 : 0.92;
      if (feat > 0) {
        if (isSel) { tx = lerp(tx, portrait ? 0 : 2.0, feat); ty = lerp(ty, portrait ? 1.05 : -0.3, feat); tz = lerp(tz, portrait ? 0.2 : -0.2, feat); s = lerp(s, portrait ? 1.45 : 0.95, feat);
          ry = lerp(ry, -0.45 + Math.sin(seg(P, 0.55, 0.97) * Math.PI * 2.5) * 0.8 + pointer.x * 0.3, feat); }
        else { tx = lerp(tx, tx * 3.2, feat); ty = lerp(ty, -3.5, feat); }
      }
      if (exit > 0 && isSel) { tx = lerp(tx, portrait ? 0 : 3.2, exit); ty = lerp(ty, 3.6, exit); s = lerp(s, 0.5, exit); }
      ph.position.x = lerp(ph.position.x, tx, 0.12); ph.position.y = lerp(ph.position.y, ty - (1 - enter) * 4, 0.12); ph.position.z = lerp(ph.position.z, tz, 0.12);
      ph.rotation.y = lerp(ph.rotation.y, ry, 0.12); ph.rotation.x = lerp(ph.rotation.x, isSel ? -pointer.y * 0.12 : 0, 0.1);
      const sc = lerp(ph.scale.x, s, 0.12); ph.scale.setScalar(sc);
      ph.userData.scr.material.opacity = isSel ? 1 : lerp(0.55, 0.15, feat);
      ph.visible = !(feat > 0.98 && !isSel);
    });
    pedestal.position.y = lerp(-1.85, -5.5, feat) - (1 - enter) * 4; pedestal.visible = feat < 0.99;
    scene.fog.near = lerp(9, 40, feat); scene.fog.far = lerp(30, 80, feat);

    // camera path
    if (P < 0.26) camera.position.set(pointer.x * 0.5, 0.3 - pointer.y * 0.3, introZ);
    else { const cz = lerp(-2, portrait ? -40 + 9.5 / Math.max(fit, 0.55) : -40 + 7.6, enter); camera.position.set(pointer.x * 0.3, lerp(0.3, 0.35, enter) - pointer.y * 0.2, cz); }
    tmpV.set(0, P < 0.26 ? 0 : 0, P < 0.26 ? introZ - 10 : -40); camera.lookAt(tmpV);

    renderer.render(scene, camera);
    if (!reduced || needs) { needs = false; raf = requestAnimationFrame(frame); }
  }
  let needs = true;
  const kick = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting && !document.hidden; kick(); });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; kick(); });
  kick();
  return {
    setProgress(p) { progress = p; needs = true; kick(); },
    select(i) { select(i); needs = true; kick(); },
    get selected() { return sel; },
  };
}
