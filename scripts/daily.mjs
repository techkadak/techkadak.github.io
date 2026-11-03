#!/usr/bin/env node
// Tech Kadak daily bot — adds config.daily.perDay (default 5) new apps per day to data/apps.json, then rebuilds the site.
// Runs free on GitHub Actions (.github/workflows/daily.yml). No npm packages needed (Node 18+).
//
//   node scripts/daily.mjs              -> add today's app (queue first, then AI if GEMINI_API_KEY is set) + rebuild
//   node scripts/daily.mjs --dry-run    -> show what would be added, build a test copy in a temp folder, change nothing
//   options: --date YYYY-MM-DD  --mode queue-only|queue-then-ai|ai-then-queue  --force (add a full batch even if today already has some)  --count N (add exactly N)
//
// AI mode rules (enforced in code, not just in the prompt):
//   * the app is picked ONLY from a candidate list we fetched from an official source (F-Droid index or GitHub API)
//   * name, links, licence and icon come from that source's data — the AI only writes the 1-2 line Hinglish text
//   * entries are marked aiAdded: true and show an "AI-added" tag on the site; no numbers/stats are written
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : null; };
const DRY = flag('--dry-run');
const CATS = ['Android Apps', 'AI Tools', 'Open Source/GitHub', 'Paid ka FREE Jawab', 'Student Tech'];

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJSON = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const istDate = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const slugify = (s) => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'app';
const log = (...m) => console.log('[daily]', ...m);

export function validateEntry(e) {
  const errs = [];
  for (const k of ['slug', 'name', 'what', 'pricing', 'links', 'category']) if (!e[k] || (Array.isArray(e[k]) && !e[k].length)) errs.push(`missing ${k}`);
  if (e.slug && !/^[a-z0-9-]+$/.test(e.slug)) errs.push('bad slug');
  if (e.pricing && !['Free', 'Freemium', 'Paid'].includes(e.pricing)) errs.push('bad pricing');
  (e.links || []).forEach((l) => { if (!/^https:\/\//.test(l.url || '')) errs.push(`link not https: ${l.url}`); });
  (e.category || []).forEach((c) => { if (!CATS.includes(c)) errs.push(`unknown category ${c}`); });
  return errs;
}

async function fetchIcon(url, slug, root) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || '';
    const ext = type.includes('jpeg') ? 'jpg' : type.includes('webp') ? 'webp' : 'png';
    const rel = `assets/icons/${slug}.${ext}`;
    fs.writeFileSync(path.join(root, rel), Buffer.from(await r.arrayBuffer()));
    return rel;
  } catch { return null; }
}

// ---------- AI mode ----------
const BAD_AF = ['Ads', 'Tracking', 'NonFreeNet', 'NonFreeAdd', 'NonFreeDep', 'NonFreeAssets', 'KnownVuln', 'NSFW', 'UpstreamNonFree', 'NoSourceSince', 'DisabledAlgorithm'];
const en = (v) => (v && typeof v === 'object' ? (v['en-US'] || v.en || Object.values(v)[0]) : v) || '';
const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function fdroidCandidates(existing, seed) {
  const src = process.env.TK_FDROID_INDEX;
  const idx = src ? readJSON(src) : await (await fetch('https://f-droid.org/repo/index-v2.json', { signal: AbortSignal.timeout(120000) })).json();
  const now = Date.now(); const out = [];
  for (const [pkg, a] of Object.entries(idx.packages)) {
    const m = a.metadata || {}; const vers = Object.values(a.versions || {});
    if (!vers.length || !m.lastUpdated || now - m.lastUpdated > 120 * 864e5) continue;
    const af = Object.keys((vers[0].antiFeatures) || {}); if (af.some((x) => BAD_AF.includes(x))) continue;
    const name = en(m.name), summary = en(m.summary); if (!name || !summary) continue;
    if (existing.has(slugify(name)) || existing.has(pkg)) continue;
    if (/plugin|add-?on|extension|icon pack|theme|wallpaper|for fcitx|keyboard layout|module/i.test(name)) continue;
    if ((m.categories || []).some((c) => /Development|System|Connectivity|Science & Education|Games/i.test(c)) && !(m.categories || []).some((c) => /Reading|Multimedia|Writing|Navigation|Phone|Time|Money|Sports|Health|Internet|Graphics|Security|Science/i.test(c))) continue;
    out.push({ id: pkg, name, summary, description: strip(en(m.description)).slice(0, 500), license: m.license || '', categories: m.categories || [],
      links: [{ label: 'F-Droid', url: `https://f-droid.org/packages/${pkg}/` }, ...(m.sourceCode && /^https:\/\//.test(m.sourceCode) ? [{ label: /github\.com/.test(m.sourceCode) ? 'GitHub' : 'Source code', url: m.sourceCode }] : []), ...(m.webSite && /^https:\/\//.test(m.webSite) ? [{ label: 'Website', url: m.webSite }] : [])],
      iconUrl: m.icon && en(m.icon) && en(m.icon).name ? `https://f-droid.org/repo${en(m.icon).name}` : null, source: 'F-Droid index' });
  }
  // deterministic shuffle by date so each day sees a different slice
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  out.sort((x, y) => ((hash(x.id) ^ h) >>> 0) - ((hash(y.id) ^ h) >>> 0));
  return out.slice(0, 40);
}
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

async function githubCandidates(existing) {
  const since = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const q = encodeURIComponent(`topic:android-app stars:>300 created:>${since} archived:false`);
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'techkadak-daily-bot' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=50`, { headers, signal: AbortSignal.timeout(30000) });
  const j = await r.json();
  return (j.items || []).filter((x) => x.license && x.license.spdx_id && x.license.spdx_id !== 'NOASSERTION' && x.description && !existing.has(slugify(x.name)) && !existing.has(x.full_name.toLowerCase()))
    .slice(0, 40).map((x) => ({ id: x.full_name, name: x.name, summary: x.description, description: x.description, license: x.license.spdx_id, categories: x.topics || [],
      links: [{ label: 'GitHub', url: x.html_url }, ...(x.homepage && /^https:\/\//.test(x.homepage) ? [{ label: 'Website', url: x.homepage }] : [])],
      iconUrl: x.owner && x.owner.type === 'Organization' ? `https://github.com/${x.owner.login}.png?size=128` : null, source: 'GitHub API' }));
}

async function askGemini(cfg, cands) {
  if (process.env.TK_AI_MOCK) { const c = cands[0]; return { id: c.id, what: `${c.name}: ${c.summary}`, limit: null, category: 'Open Source/GitHub' }; }
  const key = process.env.GEMINI_API_KEY;
  const list = cands.map((c) => ({ id: c.id, name: c.name, summary: c.summary, description: c.description, license: c.license, categories: c.categories }));
  const prompt = `You write for "Tech Kadak", a Hinglish (Roman Hindi + English) tech page for Indian students and normal phone users.
From the CANDIDATES below (official data), pick the ONE app that is most useful and easy for a normal Indian user. Avoid developer-only tools, root-only apps, games with violence, and niche server tools.
Write ONLY from the given text. Never invent numbers, user counts, ratings, prices or features that are not written in the candidate's summary/description.
Return JSON: {"id": "<exact id from the list>", "what": "<1-2 short Hinglish lines: what it does>", "limit": "<one honest Hinglish limit line taken from the text, or null>", "category": "<one of: ${CATS.join(' | ')}>"}
CANDIDATES:
${JSON.stringify(list)}`;
  const models = [cfg.model, ...(cfg.fallbackModels || [])].filter(Boolean);
  let lastErr;
  for (const model of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(60000),
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, responseMimeType: 'application/json' } }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`${model}: ${r.status} ${JSON.stringify(j.error || j).slice(0, 300)}`);
      const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      return JSON.parse(text.replace(/^```json|```$/g, '').trim());
    } catch (e) { lastErr = e; log('Gemini model failed:', String(e.message || e)); }
  }
  throw lastErr || new Error('Gemini failed');
}

async function aiEntry(cfg, existing, today, root) {
  const source = (cfg.ai && cfg.ai.source) || 'fdroid';
  const cands = source === 'github' ? await githubCandidates(existing) : await fdroidCandidates(existing, today);
  if (!cands.length) throw new Error('no AI candidates found');
  const pick = await askGemini(cfg.ai || {}, cands);
  const c = cands.find((x) => x.id === pick.id);
  if (!c) throw new Error(`AI picked an id that is not in the official list: ${pick.id}`);
  const clean = (s, n) => (s ? String(s).replace(/\s+/g, ' ').trim().slice(0, n) : null);
  const slug = slugify(c.name);
  const entry = {
    slug, name: c.name, category: [CATS.includes(pick.category) ? pick.category : 'Open Source/GitHub', ...(pick.category === 'Open Source/GitHub' ? [] : ['Open Source/GitHub'])],
    what: clean(pick.what, 220) || c.summary, pricing: 'Free', priceNote: `Free, open source${c.license ? ` (${c.license})` : ''}`,
    limit: clean(pick.limit, 200), platforms: source === 'fdroid' ? 'Android' : null, replaces: null, links: c.links, icon: null, posts: [],
    added: today, verified: today, source: 'ai', aiSource: c.source, aiAdded: true, affiliate: '',
  };
  if (c.iconUrl && !DRY) entry.icon = await fetchIcon(c.iconUrl, slug, root);
  return entry;
}

// ---------- main ----------
export async function run({ root = ROOT } = {}) {
  const cfg = readJSON(path.join(root, 'config.json'));
  const appsPath = path.join(root, 'data', 'apps.json'), queuePath = path.join(root, 'data', 'queue.json');
  const data = readJSON(appsPath), q = readJSON(queuePath);
  const today = opt('--date') || istDate();
  const mode = opt('--mode') || (cfg.daily && cfg.daily.mode) || 'queue-then-ai';
  const perDay = Math.max(1, (cfg.daily && cfg.daily.perDay) || 1);
  const addedToday = data.apps.filter((a) => a.added === today && a.source !== 'techkadak').length;
  if (addedToday >= perDay && !flag('--force')) { log(`aaj (${today}) ke ${addedToday} app pehle hi add ho chuke — kuch nahi kiya.`); return { added: null }; }
  const want = Math.max(1, Number(opt('--count')) || (flag('--force') ? perDay : perDay - addedToday));
  const norm = (x) => String(x || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '');
  const ghRepo = (u) => ((String(u).match(/github\.com\/([^/]+\/[^/#?]+)/) || [])[1] || '').toLowerCase();
  // slug, naam, Android package aur APK source se duplicate pakdo; GitHub repo sirf tab jab package na ho (ek repo me kai apps ho sakte hain)
  const keysOf = (a) => {
    const pkg = a.package_name || a.fdroidPackage;
    return [a.slug, 'name:' + norm(a.name), a.fdroidPackage, a.package_name, a.apk_source && String(a.apk_source).toLowerCase(), ...(pkg ? [] : (a.links || []).map((l) => ghRepo(l.url)))].filter((k) => k && k !== 'name:');
  };
  const existing = new Set(data.apps.flatMap(keysOf));
  const isDup = (e) => keysOf(e).some((k) => existing.has(k));
  const remember = (e) => keysOf(e).forEach((k) => existing.add(k));

  const fromQueue = () => {
    while (q.queue.length) {
      const e = { ...q.queue.shift() };
      if (isDup(e)) { log(`queue: ${e.slug} pehle se site pe hai, skip`); continue; }
      const errs = validateEntry(e); if (errs.length) { log(`queue: ${e.slug} invalid (${errs.join(', ')}), skip`); continue; }
      return { ...e, added: today, source: 'queue', aiAdded: false };
    }
    return null;
  };
  const fromAI = async () => {
    if (!process.env.GEMINI_API_KEY && !process.env.TK_AI_MOCK) { log('AI mode: GEMINI_API_KEY secret set nahi hai — skip'); return null; }
    try { const e = await aiEntry(cfg, existing, today, root); return isDup(e) ? null : e; } catch (e) { log('AI mode failed:', e.message); return null; }
  };
  // Roz `perDay` (config.json → daily.perDay) apps: queue ke pehle N, sabse naye upar.
  const batch = [];
  for (let n = 0; n < want; n++) {
    let entry = null;
    if (mode === 'ai-then-queue') entry = (await fromAI()) || fromQueue();
    else if (mode === 'queue-only') entry = fromQueue();
    else entry = fromQueue() || (await fromAI());
    if (!entry) break;
    const errs = validateEntry(entry); if (errs.length) throw new Error('entry invalid: ' + errs.join(', '));
    remember(entry); batch.push(entry);
    log(`${DRY ? '[DRY RUN] ' : ''}aaj ka app: ${entry.name} (${entry.slug}) — source ${entry.source}${entry.aiAdded ? ' [AI-added]' : ''}`);
    log('entry:', JSON.stringify(entry));
  }
  if (!batch.length) { log('Aaj add karne ke liye koi app nahi mila (queue khaali + AI off). data/queue.json mein naye apps daalo.'); return { added: null }; }
  if (batch.length < want) log(`sirf ${batch.length}/${want} app mile — data/queue.json mein naye apps daalo.`);
  data.apps.unshift(...batch); // batch[0] sabse upar
  const entry = batch[0];
  log(`${DRY ? '[DRY RUN] ' : ''}aaj ${batch.length} app add (${batch.map((e) => e.slug).join(', ')}); queue mein ab ${q.queue.length} bache (~${Math.floor(q.queue.length / perDay)} din)`);

  if (DRY) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'techkadak-dry-'));
    for (const f of ['config.json', 'assets', 'data', 'og.png', '.nojekyll']) if (fs.existsSync(path.join(root, f))) fs.cpSync(path.join(root, f), path.join(tmp, f), { recursive: true });
    writeJSON(path.join(tmp, 'data', 'apps.json'), data); writeJSON(path.join(tmp, 'data', 'queue.json'), q);
    const res = build({ root: tmp, out: tmp, quiet: true });
    log(`[DRY RUN] test build OK: ${res.count} apps, page ${path.join(tmp, 'apps', entry.slug + '.html')} — repo mein kuch nahi badla.`);
    return { added: entry, batch, dry: tmp };
  }
  writeJSON(appsPath, data); writeJSON(queuePath, q);
  build({ root });
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `added=${batch.map((e) => e.name).join(', ').replace(/[\r\n]/g, ' ')}\n`);
  return { added: entry, batch };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((e) => { console.error('[daily] ERROR', e); process.exit(1); });
}
