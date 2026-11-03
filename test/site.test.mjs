// node --test test/site.test.mjs   — checks the real built files + data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { apps } = JSON.parse(read('data/apps.json'));
const { queue } = JSON.parse(read('data/queue.json'));
const config = JSON.parse(read('config.json'));
const CATS = config.categories;

function checkEntry(a, where) {
  for (const k of ['slug', 'name', 'what', 'pricing', 'links', 'category']) assert.ok(a[k] && (!Array.isArray(a[k]) || a[k].length), `${where} ${a.slug}: missing ${k}`);
  assert.match(a.slug, /^[a-z0-9-]+$/, `${where} slug ${a.slug}`);
  assert.ok(['Free', 'Freemium', 'Paid'].includes(a.pricing), `${where} ${a.slug} pricing`);
  for (const c of a.category) assert.ok(CATS.includes(c), `${where} ${a.slug} category ${c}`);
  for (const l of a.links) assert.match(l.url, /^https:\/\//, `${where} ${a.slug} link ${l.url}`);
  if (a.icon) assert.ok(fs.existsSync(path.join(ROOT, a.icon)), `${where} ${a.slug} icon file ${a.icon}`);
}

test('apps.json: valid, unique, has seeded Tech Kadak apps', () => {
  assert.ok(apps.length >= 50, 'at least 50 apps');
  const slugs = new Set();
  for (const a of apps) { checkEntry(a, 'apps'); assert.ok(!slugs.has(a.slug), 'dup slug ' + a.slug); slugs.add(a.slug); assert.match(a.added, /^\d{4}-\d{2}-\d{2}$/); }
  assert.ok(apps.some((a) => (a.posts || []).some((p) => p.url.startsWith('https://www.instagram.com/'))), 'instagram post links present');
});

test('queue.json: valid and not already on the site', () => {
  const slugs = new Set(apps.map((a) => a.slug));
  for (const q of queue) { checkEntry(q, 'queue'); assert.ok(!slugs.has(q.slug), 'queue item already on site: ' + q.slug); }
});

test('every page exists, has title, description, viewport, canonical; no placeholders', () => {
  const pages = ['index.html', 'apps.html', 'about.html', 'contact.html', 'privacy.html', 'disclaimer.html', ...apps.map((a) => `apps/${a.slug}.html`)];
  for (const p of pages) {
    const html = read(p);
    assert.match(html, /<title>[^<]{10,}<\/title>/, p + ' title');
    assert.match(html, /<meta name="description" content="[^"]{30,}">/, p + ' description');
    assert.match(html, /name="viewport" content="width=device-width/, p + ' viewport');
    assert.match(html, /<link rel="canonical" href="https:\/\//, p + ' canonical');
    assert.doesNotMatch(html, /\b(undefined|NaN|lorem ipsum|TODO)\b|\[object Object\]|>null</i, p + ' placeholder text');
  }
  const home = read('index.html');
  assert.match(home, /PAID APP KA/); assert.match(home, /AAJ KA/); assert.match(home, /"@type":"WebSite"/); assert.match(home, /SearchAction/);
  assert.match(read(`apps/${apps[0].slug}.html`), /"@type":"SoftwareApplication"/);
});

test('local asset references resolve', () => {
  for (const p of ['index.html', 'apps.html', `apps/${apps[0].slug}.html`]) {
    const html = read(p); const dir = path.dirname(path.join(ROOT, p));
    for (const m of html.matchAll(/(?:src|href)="([^"#?]+)"/g)) {
      const u = m[1]; if (/^(https?:|mailto:|data:)/.test(u)) continue;
      assert.ok(fs.existsSync(path.resolve(dir, u)), `${p} -> ${u} missing`);
    }
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/js/hero3d.js')), '3D bundle');
});

test('sitemap + robots list every app page', () => {
  const sm = read('sitemap.xml');
  for (const a of apps) assert.ok(sm.includes(`/apps/${a.slug}.html</loc>`), 'sitemap ' + a.slug);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/.+\/sitemap\.xml/);
});

test('daily bot dry-run adds the next queue app without changing files', () => {
  const before = read('data/apps.json');
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/daily.mjs'), '--dry-run', '--force', '--mode', 'queue-only'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /DRY RUN\] aaj ka app: /);
  assert.match(out, /test build OK/);
  assert.equal(read('data/apps.json'), before, 'dry run must not modify apps.json');
});
