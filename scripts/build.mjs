#!/usr/bin/env node
// Tech Kadak static site generator — no npm packages needed (Node 18+).
// Reads config.json + data/apps.json and writes every HTML page, sitemap.xml, robots.txt, feed.xml.
// Usage: node scripts/build.mjs            (writes into the repo root)
//        node scripts/build.mjs --out DIR  (writes a full copy of the site into DIR)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
function head({ config, site, title, desc, canonical, base, ogType = 'website', extraHead = '', jsonld = [] }) {
  const ads = config.ads && config.ads.enabled && config.ads.adsenseClient
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.ads.adsenseClient)}" crossorigin="anonymous"></script>` : '';
  const verify = config.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(config.googleSiteVerification)}">` : '';
  return `<!doctype html>
<html lang="${esc(config.language || 'hi-IN')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="theme-color" content="#0a0a0a">
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
<link rel="icon" href="${base}assets/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="${base}assets/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Tech Kadak — naye free apps" href="${base}feed.xml">
<link rel="preload" href="${base}assets/fonts/unbounded.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/style.css">
${extraHead}
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
${ads}
</head>`;
}

function header(base, active = '') {
  const nav = [['apps.html', 'Apps'], ['index.html#aaj-ka-app', 'Aaj ka App'], ['about.html', 'About'], ['contact.html', 'Contact']];
  return `<a class="skip" href="#main">Content pe jao</a>
<header class="site-header">
  <a class="brand" href="${base}index.html" aria-label="Tech Kadak home"><img src="${base}assets/logo-64.png" width="36" height="36" alt="Tech Kadak logo"><span>TECH<b>KADAK</b></span></a>
  <nav aria-label="Main"><ul>${nav.map(([h, t]) => `<li><a href="${base}${h}"${active === t ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></nav>
  <a class="pill pill-lime small hide-sm" href="https://www.instagram.com/techkadak/" target="_blank" rel="noopener">Follow</a>
</header>`;
}

function footer(base, config) {
  const s = config.social;
  return `<footer class="site-footer" id="footer">
  <div class="foot-big" aria-hidden="true">TECH<br><b>KADAK</b></div>
  <div class="foot-grid">
    <div><h2 class="foot-h">Follow karo</h2><ul class="foot-links">
      <li><a href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram @techkadak</a></li>
      <li><a href="${esc(s.youtube)}" target="_blank" rel="noopener">YouTube — Tech Kadak</a></li>
      <li><a href="${esc(s.telegram)}" target="_blank" rel="noopener">Telegram t.me/techkadak</a></li>
      <li><a href="${esc(s.pinterest)}" target="_blank" rel="noopener">Pinterest</a></li></ul></div>
    <div><h2 class="foot-h">Site</h2><ul class="foot-links">
      <li><a href="${base}apps.html">Saare apps</a></li><li><a href="${base}about.html">About</a></li>
      <li><a href="${base}contact.html">Contact</a></li><li><a href="${base}privacy.html">Privacy Policy</a></li>
      <li><a href="${base}disclaimer.html">Disclaimer</a></li><li><a href="${base}feed.xml">RSS feed</a></li></ul></div>
  </div>
  <p class="foot-note">Sirf official download links. Free/paid status badal sakta hai — install se pehle official page check karo. © ${new Date().getFullYear()} Tech Kadak</p>
</footer>`;
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

export function card(a, base, variant = 0) {
  const links = (a.links || []).slice(0, 3).map((l) => `<a class="pill pill-out tiny" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('');
  const post = (a.posts || [])[0];
  const v = ['v-dark', 'v-lime', 'v-white'][variant % 3];
  return `<article class="app-card ${v}" data-cats="${esc((a.category || []).join('|'))}" data-pricing="${esc(a.pricing)}" data-search="${esc((a.name + ' ' + a.what + ' ' + (a.replaces || '') + ' ' + (a.category || []).join(' ')).toLowerCase())}">
  <div class="card-top">${icon(a, base)}<div><h3 class="card-name"><a href="${base}apps/${esc(a.slug)}.html">${esc(a.name)}</a></h3>
  <p class="card-cat">${esc((a.category || [])[0] || '')}</p></div>${badge(a.pricing)}</div>
  <p class="card-what">${esc(a.what)}</p>
  ${a.limit ? `<p class="card-limit">⚠️ ${esc(a.limit)}</p>` : ''}
  <div class="card-links">${links}</div>
  <div class="card-foot">${post ? `<a class="post-link" href="${esc(post.url)}" target="_blank" rel="noopener">${postLabel(post.type)} →</a>` : '<span></span>'}<span class="added">${a.aiAdded ? '<span class="ai-tag">AI-added</span> ' : ''}Added ${fmtDate(a.added)}</span></div>
</article>`;
}

function crumbs(site, items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) };
}

// ---------- pages ----------
function homePage(ctx) {
  const { config, apps, site } = ctx; const base = '';
  const featured = apps.slice(0, config.featuredCount || 7);
  const today = apps[0];
  const featJson = featured.map((a) => ({ slug: a.slug, name: a.name, cat: (a.category || [])[0] || '', icon: a.icon || null, initials: initials(a.name), pricing: a.pricing, points: pointsFor(a) }));
  const counts = Object.fromEntries(config.categories.map((c) => [c, apps.filter((a) => (a.category || []).includes(c)).length]));
  const wave = apps.filter((a) => a.icon).slice(0, 24);
  const kit = apps.slice(0, 18);
  const faqs = [
    ['Ye apps sach mein free hain?', 'Har app ke saath badge hai: FREE ya FREEMIUM (basic free, kuch features paid). Limit wali line bhi likhi hai. Free/paid status company badal sakti hai — install se pehle official page dekh lo.'],
    ['Download link safe hain?', 'Hum sirf official links dete hain: Play Store, F-Droid, GitHub ya app ki apni website. Koi modded / cracked APK nahi.'],
    ['Roz naya app kaun daalta hai?', 'Har din subah 9 baje 5 naye verified apps apne aap add hote hain (sabse naye upar) — ek curated list se, ya AI mode on ho to F-Droid / GitHub ke official data se. AI wale apps pe "AI-added" tag hota hai.'],
    ['F-Droid kya hai?', 'F-Droid open-source Android apps ka official store hai. Wahan ke apps free hote hain aur unka source code public hota hai.'],
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
<section class="stage" id="stage" aria-label="Tech Kadak — featured free apps">
  <div class="stage-sticky">
    <div class="stage-bg"></div><div class="stage-glow"></div>
    <div class="giant-blur" aria-hidden="true"><span>FREE.</span><span>NO BAKWAAS.</span></div>
    <div class="fallback-title" aria-hidden="true"><span>TECH</span><span class="lime">KADAK</span></div>
    <canvas id="hero3d" aria-hidden="true"></canvas>
    <div class="carousel-fallback" aria-hidden="true">${featured.map((a, i) => `<div class="cf-tile${i === 0 ? ' on' : ''}">${icon(a, base, 72, false)}</div>`).join('')}</div>
    <div class="intro-copy">
      <p class="kicker">01 — TECH KADAK</p>
      <p class="intro-text">Roz naye <b>free apps</b>, <b>AI tools</b> &amp; <b>GitHub gems</b>. Simple Hinglish. Sirf official links.</p>
    </div>
    <div class="hero-copy">
      <h1 class="hero-h1"><span class="sr">Tech Kadak: </span>PAID APP KA <span class="lime">FREE JAWAB</span></h1>
      <p class="hero-sub">${apps.length}+ verified free apps · roz 5 naye</p>
    </div>
    <div class="sel-info" aria-live="polite">
      <p class="kicker sel-k">02 — APNA APP CHUNO</p>
      <div class="sel-row">
      <button class="arrow" id="prevBtn" aria-label="Pichhla app">←</button>
      <div class="sel-text"><p class="sel-cat" id="selCat">${esc(featJson[0].cat)}</p><p class="sel-name" id="selName">${esc(featJson[0].name)}</p>
      <a class="pill pill-lime small" id="selLink" href="apps/${esc(featJson[0].slug)}.html">Details dekho</a></div>
      <button class="arrow" id="nextBtn" aria-label="Agla app">→</button></div>
    </div>
    <ol class="points" id="points" aria-label="App ki khaas baatein"></ol>
    <p class="scroll-hint" aria-hidden="true"><span></span>scroll karo</p>
  </div>
</section>
<nav class="chapters" aria-label="Chapters"><a href="#stage" data-ch="1"><b>01</b><span>Intro</span></a><a href="#stage" data-ch="2" data-p="0.36"><b>02</b><span>Apps</span></a><a href="#aaj-ka-app" data-ch="3"><b>03</b><span>Explore</span></a><a href="#qa" data-ch="4"><b>04</b><span>Q&amp;A</span></a></nav>
<script type="application/json" id="featured-data">${JSON.stringify(featJson).replace(/</g, '\\u003c')}</script>

<section class="today reveal" id="aaj-ka-app" aria-labelledby="today-h">
  <div class="wrap today-grid">
    <div><p class="kicker">// AAJ KA APP · ${fmtDate(today.added)}</p><h2 id="today-h" class="mega">AAJ KA<br><span class="lime">APP</span></h2>
    <p class="lead">Roz 5 naye kaam ke apps. Aaj: <b>${esc(today.name)}</b>.</p></div>
    <div class="tilt" data-tilt>${card(today, base, 1)}</div>
  </div>
</section>

<section class="wave-sec" aria-label="Saare apps ki jhalak">
  <h2 class="mega center reveal">${apps.length}+ APPS.<br><span class="lime">ZERO PAISA.</span></h2>
  <div class="wave" aria-hidden="true">${wave.map((a, i) => `<span class="wave-tile" style="--i:${i}">${icon(a, base, 64)}</span>`).join('')}</div>
</section>

<section class="cats wrap reveal" aria-labelledby="cats-h">
  <h2 id="cats-h" class="mega">KYA <span class="lime">CHAHIYE?</span></h2>
  <div class="cat-grid">${config.categories.map((c, i) => `<a class="cat-tile ct-${i}" href="apps.html?cat=${CATEGORY_SLUGS[c]}"><span class="cat-n">${counts[c]}</span><span class="cat-name">${esc(c)}</span><span class="cat-go">→</span></a>`).join('')}</div>
  <form class="home-search" action="apps.html" method="get" role="search"><label for="hq" class="sr">App search karo</label>
  <input id="hq" name="q" type="search" placeholder="App ya kaam search karo… (jaise pdf, notes, vpn)" autocomplete="off"><button class="pill pill-lime" type="submit">Search</button></form>
</section>

<section class="latest wrap" aria-labelledby="latest-h">
  <div class="sec-head"><h2 id="latest-h" class="mega">NAYE <span class="lime">APPS</span></h2><a class="pill pill-out" href="apps.html">Saare ${apps.length} apps →</a></div>
  <div class="grid">${apps.slice(1, 10).map((a, i) => card(a, base, i)).join('')}</div>
</section>
${adSlot(config, 'home')}
<section class="kit wrap reveal" id="kit" aria-labelledby="kit-h">
  <h2 id="kit-h" class="mega">APNA <span class="lime">KIT</span> BANAO</h2>
  <p class="lead">Koi bhi 3 apps chuno — tumhara personal free-app kit ready. Link dosto ko bhejo.</p>
  <div class="kit-pick" id="kitPick">${kit.map((a) => `<button type="button" class="kit-chip" data-slug="${esc(a.slug)}" data-name="${esc(a.name)}" aria-pressed="false">${icon(a, base, 28)}<span>${esc(a.name)}</span></button>`).join('')}</div>
  <div class="kit-box" id="kitBox" aria-live="polite"><div class="kit-slots"><span class="slot">1</span><span class="slot">2</span><span class="slot">3</span></div>
  <p class="kit-msg" id="kitMsg">3 apps chuno 👆</p><button type="button" class="pill pill-lime" id="kitShare" disabled>Kit ka link copy karo</button></div>
</section>

<section class="qa wrap reveal" id="qa" aria-labelledby="qa-h">
  <h2 id="qa-h" class="qa-big">Q<span class="lime">&amp;</span>A</h2>
  <div class="qa-list">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
</section>

<section class="follow" id="follow" aria-labelledby="follow-h">
  <h2 id="follow-h" class="mega center">FOLLOW <span class="black">KARO</span></h2>
  <p class="center lead dark">Roz aise kaam ke free apps — Hinglish mein.</p>
  <div class="follow-row">
    <a class="pill pill-black" href="${esc(config.social.instagram)}" target="_blank" rel="noopener">Instagram</a>
    <a class="pill pill-black" href="${esc(config.social.youtube)}" target="_blank" rel="noopener">YouTube</a>
    <a class="pill pill-black" href="${esc(config.social.telegram)}" target="_blank" rel="noopener">Telegram</a>
    <a class="pill pill-black" href="${esc(config.social.pinterest)}" target="_blank" rel="noopener">Pinterest</a>
  </div>
</section>
</main>
${footer(base, config)}
<script src="assets/home.js" type="module"></script>
</body></html>`;
}

function appsPage(ctx) {
  const { config, apps, site } = ctx; const base = '';
  const list = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Tech Kadak free apps list', numberOfItems: apps.length,
    itemListElement: apps.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site}/apps/${a.slug}.html`, name: a.name })),
  };
  return `${head({ config, site, base, title: `Saare Free Apps (${apps.length}) — Android, AI Tools, Open Source | Tech Kadak`, desc: `${apps.length} free Android apps, AI tools, open-source GitHub apps aur paid apps ke free jawab — official links, limits, Hinglish mein. Search aur filter karo.`, canonical: site + '/apps.html', jsonld: [list, crumbs(site, [['Home', site + '/'], ['Apps', site + '/apps.html']])] })}
<body class="list">
${header(base, 'Apps')}
<main id="main" class="wrap">
  <h1 class="mega page-h">SAARE <span class="lime">FREE APPS</span></h1>
  <p class="lead">Har app official link ke saath. FREE = poora free, FREEMIUM = basic free + kuch paid.</p>
  <div class="filters" role="search">
    <label for="q" class="sr">Search</label><input id="q" type="search" placeholder="Search: pdf, notes, vpn, keyboard…" autocomplete="off">
    <div class="chips" id="chips"><button class="chip on" data-cat="">Sab</button>${config.categories.map((c) => `<button class="chip" data-cat="${esc(c)}" data-slug="${CATEGORY_SLUGS[c]}">${esc(c)}</button>`).join('')}</div>
    <div class="chips small" id="pchips"><button class="chip on" data-p="">Free + Freemium</button><button class="chip" data-p="Free">Sirf FREE</button><button class="chip" data-p="Freemium">Freemium</button></div>
    <p class="count" id="count" aria-live="polite">${apps.length} apps</p>
  </div>
  <div class="grid" id="grid">${apps.map((a, i) => card(a, base, i)).join('\n')}</div>
  <p class="empty" id="empty" hidden>Kuch nahi mila 😅 — doosra word try karo.</p>
  ${adSlot(config, 'apps')}
</main>
${footer(base, config)}
<script src="assets/apps.js" defer></script>
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
  const aff = a.affiliate ? `<a class="pill pill-out" href="${esc(a.affiliate)}" target="_blank" rel="sponsored nofollow noopener">Deal dekho (affiliate)</a>` : '';
  return `${head({ config, site, base, title: `${a.name} kya hai? Free download link & limits | Tech Kadak`, desc, canonical: url, ogType: 'article', jsonld: [sw, crumbs(site, [['Home', site + '/'], ['Apps', site + '/apps.html'], [a.name, url]])] })}
<body class="app-page">
${header(base, 'Apps')}
<main id="main" class="wrap narrow">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="../index.html">Home</a> / <a href="../apps.html">Apps</a> / <span>${esc(a.name)}</span></nav>
  <div class="app-hero">${icon(a, base, 96, false)}<div><h1 class="app-h1">${esc(a.name)}</h1>
  <p class="app-meta">${(a.category || []).map((c) => `<a href="../apps.html?cat=${CATEGORY_SLUGS[c]}" class="chip-link">${esc(c)}</a>`).join(' ')} ${badge(a.pricing)} ${a.aiAdded ? '<span class="ai-tag">AI-added</span>' : ''}</p></div></div>
  <p class="app-what">${esc(a.what)}</p>
  <dl class="facts">
    <div><dt>Price</dt><dd>${esc(a.priceNote || a.pricing)}</dd></div>
    ${a.platforms ? `<div><dt>Kahan chalega</dt><dd>${esc(a.platforms)}</dd></div>` : ''}
    ${a.replaces ? `<div><dt>Kiska free jawab</dt><dd>${esc(a.replaces)}</dd></div>` : ''}
    ${a.limit ? `<div class="warn"><dt>⚠️ Limit</dt><dd>${esc(a.limit)}</dd></div>` : ''}
    <div><dt>Added</dt><dd>${fmtDate(a.added)}${a.verified ? ` · official page check: ${fmtDate(a.verified)}` : ''}</dd></div>
  </dl>
  <h2 class="h2">Official download links</h2>
  <div class="dl-row">${(a.links || []).map((l) => `<a class="pill pill-lime" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}${aff}</div>
  ${(a.posts || []).length ? `<h2 class="h2">Tech Kadak pe dekho</h2><ul class="post-list">${a.posts.map((p) => `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">${postLabel(p.type)}: ${esc(p.title)}</a></li>`).join('')}</ul>` : ''}
  ${a.aiAdded ? '<p class="note">Ye app AI ne official source (F-Droid / GitHub) ke data se chuna aur likha hai. Install se pehle official page zaroor padho.</p>' : ''}
  <p class="note">Free/paid status aur features company badal sakti hai — install se pehle official page check karo. Hum sirf official links dete hain.</p>
  ${adSlot(config, 'app')}
  ${related.length ? `<h2 class="h2">Aise aur apps</h2><div class="grid">${related.map((b, i) => card(b, base, i)).join('')}</div>` : ''}
</main>
${footer(base, config)}
</body></html>`;
}

function textPage(ctx, file, title, h1, desc, body) {
  const { config, site } = ctx; const base = '';
  return `${head({ config, site, base, title: `${title} | Tech Kadak`, desc, canonical: `${site}/${file}`, jsonld: [crumbs(site, [['Home', site + '/'], [title, `${site}/${file}`]])] })}
<body class="text-page">
${header(base, title === 'About' ? 'About' : '')}
<main id="main" class="wrap narrow prose"><h1 class="mega page-h">${h1}</h1>${body}</main>
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
<p><a class="pill pill-lime" href="${esc(s.instagramDM)}" target="_blank" rel="noopener">Instagram DM @techkadak</a></p>
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
  return `<!doctype html><html lang="hi-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page nahi mila | Tech Kadak</title><meta name="robots" content="noindex"><link rel="stylesheet" href="${b}assets/style.css"></head>
<body class="text-page"><main id="main" class="wrap narrow prose center"><h1 class="mega">40<span class="lime">4</span></h1><p class="lead">Ye page nahi mila 😅</p><p><a class="pill pill-lime" href="${b}index.html">Home pe chalo</a> <a class="pill pill-out" href="${b}apps.html">Saare apps</a></p></main></body></html>`;
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

const STATIC = ['assets', 'data', 'config.json', '.nojekyll', 'og.png'];

export function build({ root = ROOT, out = root, quiet = false } = {}) {
  const { config, apps } = loadData(root);
  const site = siteUrlFrom(config);
  const ctx = { config, apps, site };
  fs.mkdirSync(path.join(out, 'apps'), { recursive: true });
  if (path.resolve(out) !== path.resolve(root)) {
    for (const s of STATIC) { const src = path.join(root, s); if (fs.existsSync(src)) fs.cpSync(src, path.join(out, s), { recursive: true }); }
  }
  const files = { 'index.html': homePage(ctx), 'apps.html': appsPage(ctx), '404.html': notFound(ctx), ...pages(ctx), 'sitemap.xml': sitemap(ctx), 'robots.txt': robots(ctx), 'feed.xml': feed(ctx) };
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
