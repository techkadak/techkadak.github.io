#!/usr/bin/env node
// Tech Kadak static site generator — no npm packages needed (Node 18+).
// Reads config.json + data/apps.json and writes every HTML page, sitemap.xml, robots.txt, feed.xml.
// Usage: node scripts/build.mjs            (writes into the repo root)
//        node scripts/build.mjs --out DIR  (writes a full copy of the site into DIR)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Cache-busting version for CSS/JS + the service worker cache name (hash of the shell files).
let ASSET_V = '1';
const SHELL = ['assets/style.css', 'assets/ui.js', 'assets/apps.js'];

export const CATEGORY_SLUGS = {
  'Android Apps': 'android-apps',
  'AI Tools': 'ai-tools',
  'Open Source/GitHub': 'open-source-github',
  'Paid ka FREE Jawab': 'paid-ka-free-jawab',
  'Student Tech': 'student-tech',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d) => { const [y, m, dd] = String(d).split('-').map(Number); return `${dd} ${MONTHS[m - 1]} ${y}`; };
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const initials = (name) => String(name).replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'TK';

export function loadData(root = ROOT) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'apps.json'), 'utf8'));
  const apps = data.apps.map((a, i) => ({ ...a, _i: i }));
  apps.sort((a, b) => (b.added || '').localeCompare(a.added || '') || a._i - b._i);
  return { config, apps };
}

export function siteUrlFrom(config) {
  let u = (config.siteUrl || process.env.SITE_URL || '').trim();
  if (!u) u = 'https://example.github.io/techkadak';
  return u.replace(/\/+$/, '');
}

function pointsFor(a) {
  const pts = [{ k: 'Kya karta hai', v: a.what }];
  pts.push({ k: 'Paisa', v: a.priceNote || a.pricing });
  if (a.platforms) pts.push({ k: 'Kahan chalega', v: a.platforms });
  if (a.limit) pts.push({ k: 'Limit', v: a.limit });
  else if (a.replaces) pts.push({ k: 'Kiska free jawab', v: a.replaces });
  return pts.slice(0, 4);
}

// ---------- shared layout ----------
const ICON_SUN = '<svg class="i-sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g></svg>';
const ICON_MOON = '<svg class="i-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a8.5 8.5 0 1 0 10.8 10.8Z"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

function head({ config, site, title, desc, canonical, base, ogType = 'website', extraHead = '', jsonld = [] }) {
  const ads = config.ads && config.ads.enabled && config.ads.adsenseClient
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.ads.adsenseClient)}" crossorigin="anonymous"></script>` : '';
  const verify = config.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(config.googleSiteVerification)}">` : '';
  return `<!doctype html>
<html lang="${esc(config.language || 'hi-IN')}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<script>try{var t=localStorage.getItem('tk-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}document.documentElement.classList.add('js')</script>
<meta name="theme-color" content="#060806">
<meta name="color-scheme" content="dark light">
<meta name="robots" content="index,follow,max-image-preview:large">
${verify}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(config.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(site)}/og.png">
<meta property="og:locale" content="hi_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(site)}/og.png">
<link rel="manifest" href="${base}manifest.webmanifest">
<meta name="application-name" content="Tech Kadak">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Tech Kadak">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="icon" href="${base}assets/favicon-32.png" sizes="32x32">
<link rel="icon" href="${base}assets/icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="${base}assets/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Tech Kadak — naye free apps" href="${base}feed.xml">
<link rel="preload" href="${base}assets/fonts/dmsans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/style.css?v=${ASSET_V}">
${extraHead}
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
${ads}
</head>`;
}

function bg() {
  return '<div class="bg" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span></div>';
}

function header(base, active = '') {
  const nav = [['apps.html', 'Apps'], ['index.html#aaj-ka-app', 'Aaj ka App'], ['about.html', 'About'], ['contact.html', 'Contact']];
  return `<a class="skip" href="#main">Content pe jao</a>
${bg()}
<header class="site-header glass">
  <a class="brand" href="${base}index.html" aria-label="Tech Kadak home"><img src="${base}assets/logo-64.png" width="34" height="34" alt="Tech Kadak logo"><span>TECH<b>KADAK</b></span></a>
  <nav aria-label="Main"><ul>${nav.map(([h, t]) => `<li><a href="${base}${h}"${active === t ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></nav>
  <button class="icon-btn" id="themeBtn" type="button" aria-label="Light / dark mode badlo" title="Light / dark">${ICON_SUN}${ICON_MOON}</button>
</header>`;
}

function footer(base, config) {
  const s = config.social;
  return `<footer class="site-footer" id="footer">
  <div class="wrap foot-in">
    <a class="brand" href="${base}index.html"><img src="${base}assets/logo-64.png" width="30" height="30" alt="" loading="lazy"><span>TECH<b>KADAK</b></span></a>
    <ul class="foot-links">
      <li><a href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram</a></li>
      <li><a href="${esc(s.youtube)}" target="_blank" rel="noopener">YouTube</a></li>
      <li><a href="${esc(s.telegram)}" target="_blank" rel="noopener">Telegram</a></li>
      <li><a href="${esc(s.pinterest)}" target="_blank" rel="noopener">Pinterest</a></li>
    </ul>
    <ul class="foot-links small">
      <li><a href="${base}apps.html">Saare apps</a></li><li><a href="${base}about.html">About</a></li>
      <li><a href="${base}contact.html">Contact</a></li><li><a href="${base}privacy.html">Privacy Policy</a></li>
      <li><a href="${base}disclaimer.html">Disclaimer</a></li><li><a href="${base}feed.xml">RSS feed</a></li>
    </ul>
    <p class="foot-note">Sirf official download links. Free/paid status badal sakta hai — install se pehle official page check karo. © ${new Date().getFullYear()} Tech Kadak</p>
  </div>
</footer>
<div class="install-toast glass" id="installToast" role="dialog" aria-label="Tech Kadak app install karo" hidden>
  <img src="${base}assets/logo-64.png" width="44" height="44" alt="">
  <div class="it-text"><b>Tech Kadak ko app banao</b><span id="installMsg">Home screen pe icon, full screen, ek tap mein.</span></div>
  <button class="btn btn-lime btn-sm" id="installBtn" type="button">Install</button>
  <button class="icon-btn it-x" id="installX" type="button" aria-label="Band karo">✕</button>
</div>
<script src="${base}assets/ui.js?v=${ASSET_V}" defer></script>`;
}

function adSlot(config, name) {
  if (config.ads && config.ads.enabled && config.ads.adsenseClient) {
    return `<div class="ad-slot" data-slot="${name}"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(config.ads.adsenseClient)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
  }
  return `<div class="ad-slot" data-slot="${name}" hidden></div>`;
}

function icon(a, base, size = 56, lazy = true) {
  if (a.icon) return `<img class="app-icon" src="${base}${esc(a.icon)}" width="${size}" height="${size}" alt="${esc(a.name)} logo"${lazy ? ' loading="lazy" decoding="async"' : ''}>`;
  return `<span class="app-icon app-icon-text" style="width:${size}px;height:${size}px" aria-hidden="true">${esc(initials(a.name))}</span>`;
}
const badge = (p) => `<span class="badge badge-${esc(String(p).toLowerCase())}">${esc(p)}</span>`;
const postLabel = (t) => (t === 'youtube' ? 'YouTube video dekho' : t === 'instagram-reel' ? 'Instagram reel dekho' : 'Instagram post dekho');

// The one main button on a card: an official store / download link first, else the official website.
const DL_ORDER = ['play store', 'f-droid', 'github', 'download', 'app store', 'web app', 'website'];
export function primaryLink(a) {
  const links = a.links || [];
  const rank = (l) => { const i = DL_ORDER.indexOf(String(l.label || '').toLowerCase()); return i < 0 ? 99 : i; };
  const l = [...links].sort((x, y) => rank(x) - rank(y))[0];
  if (!l) return null;
  const lab = String(l.label || '').toLowerCase();
  const isDl = ['play store', 'f-droid', 'github', 'download', 'app store'].includes(lab);
  return { url: l.url, verb: isDl ? 'Download' : 'Open', src: isDl && lab !== 'download' ? l.label : (isDl ? '' : 'website') };
}

export function card(a, base, variant = 0, opts = {}) {
  const p = primaryLink(a);
  const cat = (a.category || [])[0] || '';
  const tag = opts.isNew ? '<span class="new-tag">NAYA</span>' : '';
  return `<article class="app-card glass reveal" data-cats="${esc((a.category || []).join('|'))}" data-pricing="${esc(a.pricing)}" data-search="${esc((a.name + ' ' + a.what + ' ' + (a.replaces || '') + ' ' + (a.category || []).join(' ')).toLowerCase())}">
  <div class="card-top">${icon(a, base)}<div class="card-id"><h3 class="card-name"><a href="${base}apps/${esc(a.slug)}.html">${esc(a.name)}</a></h3>
  <p class="card-cat"><span>${esc(cat)}</span>${badge(a.pricing)}</p></div>${tag}</div>
  <p class="card-what">${esc(a.what)}</p>
  <div class="card-actions">${p ? `<a class="btn btn-lime" href="${esc(p.url)}" target="_blank" rel="noopener">${p.verb}${p.src ? ` <small>· ${esc(p.src)}</small>` : ''}</a>` : ''}<a class="btn btn-glass" href="${base}apps/${esc(a.slug)}.html" aria-label="${esc(a.name)} details">Details</a></div>
</article>`;
}

function crumbs(site, items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) };
}

// ---------- pages ----------
function homePage(ctx) {
  const { config, apps, site } = ctx; const base = '';
  const today = apps[0];
  const drop = apps.slice(0, 5);
  const more = apps.slice(drop.length, drop.length + 6);
  const counts = Object.fromEntries(config.categories.map((c) => [c, apps.filter((a) => (a.category || []).includes(c)).length]));
  const faqs = [
    ['Ye apps sach mein free hain?', 'Har app ke saath badge hai: FREE ya FREEMIUM (basic free, kuch features paid). Limit wali line bhi likhi hai. Free/paid status company badal sakti hai — install se pehle official page dekh lo.'],
    ['Download link safe hain?', 'Hum sirf official links dete hain: Play Store, F-Droid, GitHub ya app ki apni website. Koi modded / cracked APK nahi.'],
    ['Roz naya app kaun daalta hai?', 'Har din subah 9 baje 5 naye verified apps apne aap add hote hain (sabse naye upar) — ek curated list se, ya AI mode on ho to F-Droid / GitHub ke official data se. AI wale apps pe "AI-added" tag hota hai.'],
    ['F-Droid kya hai?', 'F-Droid open-source Android apps ka official store hai. Wahan ke apps free hote hain aur unka source code public hota hai.'],
    ['Is site ko app ki tarah kaise rakhein?', 'Android (Chrome): menu ⋮ → "Install app" / "Add to Home screen". iPhone (Safari): Share button → "Add to Home Screen". Icon home screen pe aa jayega aur site full screen khulegi.'],
    ['Mera app idea / sawaal kahan bheju?', 'Instagram pe @techkadak ko DM karo ya Telegram channel join karo.'],
    ['Paise lagte hain is site ke?', 'Nahi. Site free hai, apps dekhna free hai. Future mein ads aa sakte hain jisse site free chalti rahe.'],
  ];
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: config.siteName, url: site + '/', inLanguage: 'hi-IN', description: config.description,
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: site + '/apps.html?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
    { '@context': 'https://schema.org', '@type': 'Organization', name: config.siteName, url: site + '/', logo: site + '/assets/logo-512.png', sameAs: Object.values(config.social).filter((u) => !u.includes('ig.me')) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return `${head({ config, site, base, title: 'Tech Kadak — Paid App ka FREE Jawab | Free Android Apps & AI Tools Hinglish mein', desc: config.description, canonical: site + '/', jsonld })}
<body class="home">
${header(base)}
<main id="main">
<section class="hero wrap" aria-labelledby="hero-h">
  <p class="eyebrow glass"><span class="dot" aria-hidden="true"></span>Roz 5 naye free apps · subah 9 baje</p>
  <h1 id="hero-h" class="hero-h1"><span class="sr">Tech Kadak: </span>PAID APP KA <span class="accent">FREE JAWAB</span></h1>
  <p class="lead">Kaam ke free Android apps, AI tools aur GitHub gems. Simple Hinglish, sirf official links.</p>
  <form class="search glass" action="apps.html" method="get" role="search"><label for="hq" class="sr">App search karo</label>
    ${ICON_SEARCH}<input id="hq" name="q" type="search" placeholder="pdf, notes, vpn…" autocomplete="off" enterkeyhint="search"><button class="btn btn-lime" type="submit">Search</button></form>
  <div class="chip-row" aria-label="Categories">${config.categories.map((c) => `<a class="chip glass" href="apps.html?cat=${CATEGORY_SLUGS[c]}">${esc(c)}</a>`).join('')}</div>
</section>

<section class="sec wrap" id="aaj-ka-app" aria-labelledby="today-h">
  <div class="sec-head"><div><p class="kicker">AAJ KA DROP · ${fmtDate(today.added)}</p><h2 id="today-h" class="h2">Naye apps</h2></div><a class="link-more" href="apps.html">Saare ${apps.length} →</a></div>
  <div class="grid">${drop.map((a, i) => card(a, base, i, { isNew: a.added === today.added })).join('')}</div>
</section>

${more.length ? `<section class="sec wrap" aria-labelledby="more-h">
  <div class="sec-head"><div><p class="kicker">PICHHLE DINO KE</p><h2 id="more-h" class="h2">Aur kaam ke apps</h2></div></div>
  <div class="grid">${more.map((a, i) => card(a, base, i)).join('')}</div>
  <p class="center"><a class="btn btn-glass btn-lg" href="apps.html">Saare ${apps.length} apps dekho →</a></p>
</section>` : ''}
${adSlot(config, 'home')}
<section class="sec wrap" aria-labelledby="cats-h">
  <div class="sec-head"><div><p class="kicker">CATEGORY</p><h2 id="cats-h" class="h2">Kya chahiye?</h2></div></div>
  <div class="cat-grid">${config.categories.map((c) => `<a class="cat-tile glass reveal" href="apps.html?cat=${CATEGORY_SLUGS[c]}"><span class="cat-name">${esc(c)}</span><span class="cat-n">${counts[c]} apps →</span></a>`).join('')}</div>
</section>

<section class="sec wrap" aria-labelledby="pwa-h">
  <div class="pwa-card glass reveal">
    <img src="assets/icon-192.png" width="64" height="64" alt="" loading="lazy">
    <div><h2 id="pwa-h" class="h3">Tech Kadak ko app ki tarah rakho</h2>
    <p class="muted">Home screen pe icon, full screen, aur roz ke naye apps ek tap pe. Android aur iPhone dono pe free.</p></div>
    <button class="btn btn-lime" type="button" data-install>Install karo</button>
  </div>
</section>

<section class="sec wrap narrow" id="qa" aria-labelledby="qa-h">
  <div class="sec-head"><div><p class="kicker">Q&amp;A</p><h2 id="qa-h" class="h2">Sawaal jawab</h2></div></div>
  <div class="qa-list">${faqs.map(([q, a]) => `<details class="glass"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
</section>

<section class="sec wrap" id="follow" aria-labelledby="follow-h">
  <div class="follow-card glass reveal">
    <h2 id="follow-h" class="h2">Follow karo</h2>
    <p class="muted">Roz aise kaam ke free apps, Hinglish mein.</p>
    <div class="follow-row">
      <a class="btn btn-lime" href="${esc(config.social.instagram)}" target="_blank" rel="noopener">Instagram</a>
      <a class="btn btn-glass" href="${esc(config.social.youtube)}" target="_blank" rel="noopener">YouTube</a>
      <a class="btn btn-glass" href="${esc(config.social.telegram)}" target="_blank" rel="noopener">Telegram</a>
      <a class="btn btn-glass" href="${esc(config.social.pinterest)}" target="_blank" rel="noopener">Pinterest</a>
    </div>
  </div>
</section>
</main>
${footer(base, config)}
</body></html>`;
}

function appsPage(ctx) {
  const { config, apps, site } = ctx; const base = '';
  const newest = apps[0] ? apps[0].added : '';
  const list = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Tech Kadak free apps list', numberOfItems: apps.length,
    itemListElement: apps.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site}/apps/${a.slug}.html`, name: a.name })),
  };
  return `${head({ config, site, base, title: `Saare Free Apps (${apps.length}) — Android, AI Tools, Open Source | Tech Kadak`, desc: `${apps.length} free Android apps, AI tools, open-source GitHub apps aur paid apps ke free jawab — official links, limits, Hinglish mein. Search aur filter karo.`, canonical: site + '/apps.html', jsonld: [list, crumbs(site, [['Home', site + '/'], ['Apps', site + '/apps.html']])] })}
<body class="list">
${header(base, 'Apps')}
<main id="main" class="wrap">
  <h1 class="page-h">Saare <span class="accent">free apps</span></h1>
  <p class="lead">Sabse naye upar. FREE = poora free, FREEMIUM = basic free + kuch paid.</p>
  <div class="filters glass" role="search">
    <div class="search bare">${ICON_SEARCH}<label for="q" class="sr">Search</label><input id="q" type="search" placeholder="Search: pdf, notes, vpn…" autocomplete="off" enterkeyhint="search"></div>
    <div class="chips" id="chips"><button class="chip" data-cat="">Sab</button>${config.categories.map((c) => `<button class="chip" data-cat="${esc(c)}" data-slug="${CATEGORY_SLUGS[c]}">${esc(c)}</button>`).join('')}</div>
    <div class="chips small" id="pchips"><button class="chip" data-p="">Free + Freemium</button><button class="chip" data-p="Free">Sirf FREE</button><button class="chip" data-p="Freemium">Freemium</button></div>
  </div>
  <p class="count" id="count" aria-live="polite">${apps.length} apps</p>
  <div class="grid" id="grid">${apps.map((a, i) => card(a, base, i, { isNew: a.added === newest })).join('\n')}</div>
  <p class="empty glass" id="empty" hidden>Kuch nahi mila 😅 — doosra word try karo.</p>
  ${adSlot(config, 'apps')}
</main>
${footer(base, config)}
<script src="assets/apps.js?v=${ASSET_V}" defer></script>
</body></html>`;
}

function appPage(ctx, a) {
  const { config, apps, site } = ctx; const base = '../';
  const url = `${site}/apps/${a.slug}.html`;
  const desc = clip(`${a.name} kya hai? ${a.what} ${a.pricing === 'Free' ? 'Free' : 'Free plan'} — official download link, limits aur details Hinglish mein.`, 158);
  const os = a.platforms || 'Android';
  const sw = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: a.name, url, description: a.what, operatingSystem: os,
    applicationCategory: (a.category || []).includes('AI Tools') ? 'UtilitiesApplication' : ((a.category || []).includes('Student Tech') ? 'EducationalApplication' : 'UtilitiesApplication'),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, datePublished: a.added,
  };
  if (a.icon) sw.image = `${site}/${a.icon}`;
  const related = apps.filter((b) => b.slug !== a.slug && (b.category || []).some((c) => (a.category || []).includes(c))).slice(0, 4);
  const p = primaryLink(a);
  const others = (a.links || []).filter((l) => !p || l.url !== p.url);
  const aff = a.affiliate ? `<a class="btn btn-glass" href="${esc(a.affiliate)}" target="_blank" rel="sponsored nofollow noopener">Deal dekho (affiliate)</a>` : '';
  return `${head({ config, site, base, title: `${a.name} kya hai? Free download link & limits | Tech Kadak`, desc, canonical: url, ogType: 'article', jsonld: [sw, crumbs(site, [['Home', site + '/'], ['Apps', site + '/apps.html'], [a.name, url]])] })}
<body class="app-page">
${header(base, 'Apps')}
<main id="main" class="wrap narrow">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="../index.html">Home</a> / <a href="../apps.html">Apps</a> / <span>${esc(a.name)}</span></nav>
  <section class="app-hero glass">
    <div class="app-hero-top">${icon(a, base, 88, false)}<div><h1 class="app-h1">${esc(a.name)}</h1>
    <p class="app-meta">${(a.category || []).map((c) => `<a href="../apps.html?cat=${CATEGORY_SLUGS[c]}" class="chip chip-sm">${esc(c)}</a>`).join(' ')} ${badge(a.pricing)} ${a.aiAdded ? '<span class="ai-tag">AI-added</span>' : ''}</p></div></div>
    <p class="app-what">${esc(a.what)}</p>
    <h2 class="sr">Official download links</h2>
    <div class="dl-row">${p ? `<a class="btn btn-lime btn-lg" href="${esc(p.url)}" target="_blank" rel="noopener">${p.verb}${p.src ? ` · ${esc(p.src)}` : ''} ↗</a>` : ''}${others.map((l) => `<a class="btn btn-glass" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}${aff}</div>
  </section>
  <dl class="facts glass">
    <div><dt>Price</dt><dd>${esc(a.priceNote || a.pricing)}</dd></div>
    ${a.platforms ? `<div><dt>Kahan chalega</dt><dd>${esc(a.platforms)}</dd></div>` : ''}
    ${a.replaces ? `<div><dt>Kiska free jawab</dt><dd>${esc(a.replaces)}</dd></div>` : ''}
    ${a.limit ? `<div class="warn"><dt>⚠️ Limit</dt><dd>${esc(a.limit)}</dd></div>` : ''}
    <div><dt>Added</dt><dd>${fmtDate(a.added)}${a.verified ? ` · official page check: ${fmtDate(a.verified)}` : ''}</dd></div>
  </dl>
  ${(a.posts || []).length ? `<h2 class="h3">Tech Kadak pe dekho</h2><ul class="post-list">${a.posts.map((p) => `<li><a class="glass" href="${esc(p.url)}" target="_blank" rel="noopener">${postLabel(p.type)}: ${esc(p.title)} ↗</a></li>`).join('')}</ul>` : ''}
  ${a.aiAdded ? '<p class="note">Ye app AI ne official source (F-Droid / GitHub) ke data se chuna aur likha hai. Install se pehle official page zaroor padho.</p>' : ''}
  <p class="note">Free/paid status aur features company badal sakti hai — install se pehle official page check karo. Hum sirf official links dete hain.</p>
  ${adSlot(config, 'app')}
  ${related.length ? `<h2 class="h3">Aise aur apps</h2><div class="grid">${related.map((b, i) => card(b, base, i)).join('')}</div>` : ''}
</main>
${footer(base, config)}
</body></html>`;
}

function textPage(ctx, file, title, h1, desc, body) {
  const { config, site } = ctx; const base = '';
  return `${head({ config, site, base, title: `${title} | Tech Kadak`, desc, canonical: `${site}/${file}`, jsonld: [crumbs(site, [['Home', site + '/'], [title, `${site}/${file}`]])] })}
<body class="text-page">
${header(base, title === 'About' ? 'About' : title === 'Contact' ? 'Contact' : '')}
<main id="main" class="wrap narrow"><h1 class="page-h">${h1}</h1><div class="prose glass">${body}</div></main>
${footer(base, config)}
</body></html>`;
}

function pages(ctx) {
  const s = ctx.config.social;
  const today = new Date().toISOString().slice(0, 10);
  return {
    'about.html': textPage(ctx, 'about.html', 'About', 'ABOUT <span class="lime">TECH KADAK</span>', 'Tech Kadak kya hai — free apps, AI tools aur open-source gems Hinglish mein.', `
<p><b>Tech Kadak</b> ek Hinglish tech page hai: kaam ke <b>free Android apps</b>, <b>free AI tools</b>, <b>open-source / GitHub gems</b> aur <b>paid apps ke FREE jawab</b> — simple bhasha mein.</p>
<p>Har app ke saath hum likhte hain ki woh kya karta hai, free hai ya freemium, uski <b>limit</b> kya hai, aur sirf <b>official download link</b> dete hain (Play Store, F-Droid, GitHub ya official website).</p>
<p>Roz 5 naye apps is site pe apne aap add hote hain. Instagram pe <a href="${esc(s.instagram)}" target="_blank" rel="noopener">@techkadak</a> follow karo, YouTube pe <a href="${esc(s.youtube)}" target="_blank" rel="noopener">Tech Kadak</a> dekho, aur <a href="${esc(s.telegram)}" target="_blank" rel="noopener">Telegram</a> pe links pao.</p>`),
    'contact.html': textPage(ctx, 'contact.html', 'Contact', '<span class="lime">CONTACT</span>', 'Tech Kadak se contact karo — Instagram DM.', `
<p>Sawaal, app suggestion, galti report ya collaboration — Instagram pe DM karo:</p>
<p><a class="btn btn-lime" href="${esc(s.instagramDM)}" target="_blank" rel="noopener">Instagram DM @techkadak</a></p>
<p>Telegram channel: <a href="${esc(s.telegram)}" target="_blank" rel="noopener">t.me/techkadak</a></p>`),
    'privacy.html': textPage(ctx, 'privacy.html', 'Privacy Policy', 'PRIVACY <span class="lime">POLICY</span>', 'Tech Kadak website ki privacy policy.', `
<p><i>Last updated: ${fmtDate(ctx.config.policyUpdated || today)}</i></p>
<p>Ye website (Tech Kadak) koi account, login ya form nahi rakhti. Hum aapse naam, email ya phone nahi maangte.</p>
<h2 class="h2">Hosting</h2><p>Site GitHub Pages pe host hai. GitHub technical reasons ke liye visitors ka IP address log kar sakta hai — <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub Privacy Statement</a> dekho.</p>
<h2 class="h2">Cookies &amp; ads</h2><p>Abhi site pe koi ads ya tracking cookies nahi hain. Agar future mein Google AdSense lagaya gaya, to Google aur uske partners cookies use karke aapki pichhli visits ke base pe ads dikha sakte hain. Personalised ads band karne ke liye <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google Ads Settings</a> use karo, aur jaankari ke liye <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener">Google ki ads policy</a> padho.</p>
<h2 class="h2">Bahar ke links</h2><p>Hum doosri websites (Play Store, F-Droid, GitHub, app websites) ke links dete hain. Unki privacy policy unki apni hai.</p>
<h2 class="h2">Contact</h2><p>Privacy se juda sawaal: <a href="${esc(s.instagramDM)}" target="_blank" rel="noopener">Instagram DM @techkadak</a>.</p>`),
    'disclaimer.html': textPage(ctx, 'disclaimer.html', 'Disclaimer', '<span class="lime">DISCLAIMER</span>', 'Tech Kadak disclaimer — apps, links aur free/paid info.', `
<p>Tech Kadak pe di gayi jaankari sirf information ke liye hai. Hum official sources se check karke likhte hain, phir bhi apps ke features, price aur free plans company kabhi bhi badal sakti hai.</p>
<p>Hum kisi app ke maalik nahi hain aur unke saath affiliated nahi hain (jab tak saaf na likha ho). App names aur logos unke owners ke trademarks hain.</p>
<p>Koi bhi app install karne se pehle uska official page, permissions aur reviews khud check karo. Kisi nuksaan ke liye Tech Kadak zimmedaar nahi hai.</p>
<p>"AI-added" tag wale apps AI ne official F-Droid / GitHub data se chune hain.</p>
<p>Agar kabhi affiliate link lagaya gaya to uske saath "affiliate" likha hoga — aap kharido to hume chhota commission mil sakta hai, aapko extra paisa nahi lagta.</p>`),
  };
}

function notFound(ctx) {
  const { config, site } = ctx;
  // 404 is served from any path depth on GitHub Pages, so use absolute-from-site links.
  const b = site + '/';
  return `<!doctype html><html lang="hi-IN" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page nahi mila | Tech Kadak</title><meta name="robots" content="noindex"><meta name="theme-color" content="#060806"><script>try{var t=localStorage.getItem('tk-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script><link rel="stylesheet" href="${b}assets/style.css?v=${ASSET_V}"></head>
<body class="text-page">${bg()}<main id="main" class="wrap narrow center nf"><div class="prose glass"><h1 class="page-h">40<span class="accent">4</span></h1><p class="lead">Ye page nahi mila 😅</p><p class="dl-row center"><a class="btn btn-lime" href="${b}index.html">Home pe chalo</a> <a class="btn btn-glass" href="${b}apps.html">Saare apps</a></p></div></main></body></html>`;
}

function sitemap(ctx) {
  const { apps, site } = ctx; const lastmod = apps[0] ? apps[0].added : new Date().toISOString().slice(0, 10);
  const urls = [[`${site}/`, lastmod, '1.0'], [`${site}/apps.html`, lastmod, '0.9'], ...apps.map((a) => [`${site}/apps/${a.slug}.html`, a.added, '0.8']),
    ...['about.html', 'contact.html', 'privacy.html', 'disclaimer.html'].map((f) => [`${site}/${f}`, null, '0.3'])];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d, p]) => `  <url><loc>${esc(u)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}<priority>${p}</priority></url>`).join('\n')}\n</urlset>\n`;
}
const robots = (ctx) => `User-agent: *\nAllow: /\nDisallow: /data/queue.json\n\nSitemap: ${ctx.site}/sitemap.xml\n`;
function feed(ctx) {
  const { apps, site, config } = ctx;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(config.siteName)} — naye free apps</title><link>${esc(site)}/</link><description>${esc(config.tagline)}</description><language>hi-IN</language>\n${apps.slice(0, 30).map((a) => `<item><title>${esc(a.name)}</title><link>${esc(site)}/apps/${esc(a.slug)}.html</link><guid>${esc(site)}/apps/${esc(a.slug)}.html</guid><pubDate>${new Date(a.added + 'T09:00:00+05:30').toUTCString()}</pubDate><description>${esc(a.what)}</description></item>`).join('\n')}\n</channel></rss>\n`;
}


// ---------- PWA (installable app) ----------
function manifest(ctx) {
  const { config } = ctx;
  return JSON.stringify({
    name: 'Tech Kadak', short_name: 'Tech Kadak', id: './', start_url: './?source=pwa', scope: './',
    description: config.tagline, lang: 'hi-IN', dir: 'ltr', display: 'standalone', display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait', background_color: '#060806', theme_color: '#060806', categories: ['utilities', 'education', 'productivity'],
    icons: [
      { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'assets/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Saare apps', short_name: 'Apps', url: './apps.html', icons: [{ src: 'assets/icon-192.png', sizes: '192x192' }] },
      { name: 'Aaj ke naye apps', short_name: 'Naye', url: './index.html#aaj-ka-app', icons: [{ src: 'assets/icon-192.png', sizes: '192x192' }] },
    ],
  }, null, 2) + '\n';
}

// Small service worker: caches the shell so the app opens fast / offline.
// Pages + data/*.json are network-first (new daily apps always show when online); assets are stale-while-revalidate.
// Never touches /admin/ or other sites.
function serviceWorker() {
  return `// Tech Kadak service worker — generated by scripts/build.mjs (do not edit by hand)
const V = 'tk-${ASSET_V}';
const SHELL = ['./', './index.html', './apps.html', './assets/style.css?v=${ASSET_V}', './assets/ui.js?v=${ASSET_V}', './assets/apps.js?v=${ASSET_V}', './assets/logo-64.png', './assets/fonts/dmsans.woff2', './assets/fonts/unbounded.woff2', './manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('tk-') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const scopePath = new URL(self.registration.scope).pathname;
function fresh(req) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('slow')), 6000);
    fetch(req).then((res) => { clearTimeout(t); if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(V).then((c) => c.put(req, copy)); } resolve(res); }, (err) => { clearTimeout(t); reject(err); });
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(scopePath + 'admin') || url.pathname.endsWith('/sw.js') || url.pathname.includes('/google')) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  const isData = url.pathname.endsWith('.json') || url.pathname.endsWith('.xml') || url.pathname.endsWith('.webmanifest');
  if (isPage || isData) {
    e.respondWith(fresh(req).catch(() => caches.match(req, { ignoreSearch: isPage }).then((r) => r || (isPage ? caches.match('./index.html') : Response.error()))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(V).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
`;
}

const STATIC = ['assets', 'data', 'config.json', '.nojekyll', 'og.png', 'googlea15609fe0055544a.html'];

export function build({ root = ROOT, out = root, quiet = false } = {}) {
  const { config, apps } = loadData(root);
  const site = siteUrlFrom(config);
  const ctx = { config, apps, site };
  const h = crypto.createHash('sha1');
  for (const f of SHELL) { const p = path.join(root, f); if (fs.existsSync(p)) h.update(fs.readFileSync(p)); }
  ASSET_V = h.digest('hex').slice(0, 10);
  fs.mkdirSync(path.join(out, 'apps'), { recursive: true });
  if (path.resolve(out) !== path.resolve(root)) {
    for (const s of STATIC) { const src = path.join(root, s); if (fs.existsSync(src)) fs.cpSync(src, path.join(out, s), { recursive: true }); }
  }
  const files = { 'index.html': homePage(ctx), 'apps.html': appsPage(ctx), '404.html': notFound(ctx), ...pages(ctx), 'sitemap.xml': sitemap(ctx), 'robots.txt': robots(ctx), 'feed.xml': feed(ctx), 'manifest.webmanifest': manifest(ctx), 'sw.js': serviceWorker() };
  for (const [f, html] of Object.entries(files)) fs.writeFileSync(path.join(out, f), html);
  const keep = new Set(apps.map((a) => `${a.slug}.html`));
  for (const f of fs.readdirSync(path.join(out, 'apps'))) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(out, 'apps', f));
  for (const a of apps) fs.writeFileSync(path.join(out, 'apps', `${a.slug}.html`), appPage(ctx, a));
  if (!quiet) console.log(`build: ${apps.length} apps → ${Object.keys(files).length + apps.length} files in ${out} (site ${site})`);
  return { count: apps.length, site };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  build({ out: i > -1 ? path.resolve(process.argv[i + 1]) : ROOT });
}
