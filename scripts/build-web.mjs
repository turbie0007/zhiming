import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND, NOINDEX_PATHS, OG_IMAGE, PAGES, notFoundMarkup } from '../assets/js/pages.js';
import { formatLunar } from '../assets/js/astro.js';
import { todayOverview } from '../assets/js/bazi.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');

const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const siteUrl = (config.url || '').replace(/\/+$/, '');
const slug = (config.basePath || '').replace(/^\/+|\/+$/g, '');
const base = `/${slug}${slug ? '/' : ''}`;
const INDEXABLE = new Set(PAGES.map((page) => page.path));

// Structured data and canonicals only mean something with an origin, so they stay out of
// the build until site.config.json names a domain instead of guessing one.
const absolute = (path) => (siteUrl ? `${siteUrl}${path}` : null);
const link = (path) => (path === '/' ? base : `${base}${path.slice(1)}/`);

const escapeAttr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const escapeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const shell = readFileSync(join(root, 'index.html'), 'utf8');
const cacheVersion = shell.match(/assets\/css\/style\.css\?v=(\d+)/)?.[1];
if (!cacheVersion) throw new Error('index.html: no ?v= found on assets/css/style.css');

function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`index.html: missing <meta ${attr}="${key}">`);
  return html.replace(re, `$1${escapeAttr(value)}$2`);
}

function setTagAttr(html, re, value, label) {
  if (!re.test(html)) throw new Error(`index.html: missing ${label}`);
  return html.replace(re, () => value);
}

// Root-relative so a page served from /learn/x/ still loads /assets and /manifest.
function toRootPaths(html) {
  return html
    .replace(/(href|src|content)="assets\//g, `$1="${base}assets/`)
    .replace(/(href|src)="manifest\.webmanifest"/g, `$1="${base}manifest.webmanifest"`);
}

// Header/footer links ship as hash URLs (that is what the native bundle needs); only
// routes with a prerendered file are swapped for the crawlable path form.
function toRealPathNavs(html) {
  return html.replace(/<a\b[^>]*>/g, (tag) => {
    const route = tag.match(/ data-route="([^"]+)"/)?.[1];
    if (!route || !INDEXABLE.has(route)) return tag;
    return tag.replace(/href="#\/[^"]*"/, `href="${link(route)}"`);
  });
}

function prerender(page) {
  const canonical = page.robots === 'noindex' ? null : absolute(link(page.path));
  const mediaUrl = absolute(`${base}${OG_IMAGE}`) || `${base}${OG_IMAGE}`;

  let html = toRealPathNavs(toRootPaths(shell));
  html = setTagAttr(html, /<title>[^<]*<\/title>/, `<title>${escapeAttr(page.title)}</title>`, 'title');
  html = setMeta(html, 'name', 'description', page.description);
  html = setMeta(html, 'property', 'og:type', page.ogType || 'website');
  html = setMeta(html, 'property', 'og:title', page.title);
  html = setMeta(html, 'property', 'og:description', page.description);
  html = setMeta(html, 'property', 'og:image', mediaUrl);
  html = setMeta(html, 'name', 'twitter:title', page.title);
  html = setMeta(html, 'name', 'twitter:description', page.description);
  html = setMeta(html, 'name', 'twitter:image', mediaUrl);
  html = setTagAttr(html, /<meta name="app-base" content="[^"]*">/, `<meta name="app-base" content="${base}">`, 'app-base');
  html = setTagAttr(
    html,
    /<main id="app" tabindex="-1"><\/main>/,
    `<main id="app" tabindex="-1">${page.build(page.buildContext)}</main>`,
    'main slot',
  );

  const head = [];
  if (page.robots === 'noindex') head.push('<meta name="robots" content="noindex">');
  if (canonical) {
    head.push(`<link rel="canonical" href="${canonical}">`);
    head.push(`<meta property="og:url" content="${canonical}">`);
    if (page.jsonLd) {
      const absoluteLink = (path) => absolute(link(path)) || link(path);
      head.push(
        `<script id="page-jsonld" type="application/ld+json">`
        + `${escapeJson(page.jsonLd({ homeUrl: absoluteLink('/'), absoluteUrl: canonical, absoluteLink }))}</script>`,
      );
    }
  }
  if (head.length) html = html.replace('</head>', `${head.join('\n  ')}\n</head>`);
  return `${html}`;
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const entry of ['manifest.webmanifest', 'sw.js', 'tests.html', 'assets']) {
  cpSync(join(root, entry), join(out, entry), { recursive: true });
}
if (existsSync(join(root, 'CNAME'))) cpSync(join(root, 'CNAME'), join(out, 'CNAME'));

const today = todayOverview();
const homeContext = {
  link,
  root: base,
  today: { ...today, lunarText: formatLunar(today.lunar.year, today.lunar.month, today.lunar.day, today.lunar.isLeap) },
  formHtml: '',
};
const docContext = { link, root: base };

const pages = PAGES.map((page) => ({ ...page, buildContext: page.path === '/' ? homeContext : docContext }));
pages.push({
  path: '/404',
  file: '404.html',
  title: `${BRAND} · 頁面不存在`,
  description: '這個地址沒有對應的頁面，可能是舊鏈接，或輸入有誤。',
  robots: 'noindex',
  build: notFoundMarkup,
  buildContext: docContext,
});

for (const page of pages) {
  const target = join(out, page.file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, prerender(page));
}

writeFileSync(join(out, 'robots.txt'), [
  'User-agent: *',
  'Allow: /',
  ...NOINDEX_PATHS.map((prefix) => `Disallow: ${prefix}`),
  'Disallow: /tests.html',
  '',
  ...(siteUrl ? [`Sitemap: ${absolute(`${base}sitemap.xml`)}`] : []),
  '',
].join('\n'));

if (siteUrl) {
  writeFileSync(join(out, 'sitemap.xml'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PAGES.map((page) => `  <url><loc>${absolute(link(page.path))}</loc><changefreq>monthly</changefreq></url>`),
    '</urlset>',
    '',
  ].join('\n'));
}

console.log(`www/ written: ${pages.length} prerendered pages, cache v${cacheVersion}, base ${base}`);
if (!siteUrl) {
  console.warn('WARNING: site.config.json "url" is empty — canonical, og:url, JSON-LD and sitemap.xml were skipped.');
  console.warn('         Fill in "url", rerun npm run build:web, then deploy.');
}
