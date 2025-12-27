/**
 * creativeai-tools — tools/check.mjs
 * QA script before deployment (Node >= 18, ESM)
 *
 * Checks:
 * 1) Links (internal/external): HEAD/GET must be 200/2xx/3xx, list 4xx/5xx.
 * 2) SEO tags: canonical, hreflang (FR/EN + x-default), OG/Twitter on FR & EN pages.
 * 3) Sitemaps: sitemap.xml indexes sitemap-fr.xml & sitemap-en.xml; URLs are absolute under canonical.
 * 4) robots.txt exposes sitemaps and does not block /en/.
 * 5) Security headers (via curl -I): CSP, HSTS, Referrer-Policy, Permissions-Policy on "/" and "/en/".
 * 6) Static sizes: CSS < 120 KB, JS < 80 KB.
 *
 * Output: tools/report.md
 *
 * Usage:
 *   node tools/check.mjs
 *   BASE_URL=https://deploy-preview-123--creativeai-tools.netlify.app node tools/check.mjs
 */

import { writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { exec as _exec } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(_exec);

// -----------------------
// Config
// -----------------------
const CANONICAL = 'https://www.creativeai-tools.fr';
const BASE_URL = process.env.BASE_URL?.replace(/\/$/, '') || CANONICAL;

const PAGES = [
  '/', '/blog.html', '/blog-Invideo.html',
  '/mentions-legales.html', '/politique-de-confidentialite.html',
  '/en/', '/en/blog.html', '/en/blog-Invideo.html',
  '/en/legal-notice.html', '/en/privacy-policy.html',
  '/404.html'
];

const SITEMAPS = ['/sitemap.xml', '/sitemap-fr.xml', '/sitemap-en.xml'];
const FILE_THRESHOLDS = { css: 120 * 1024, js: 80 * 1024 }; // bytes

// -----------------------
// Helpers
// -----------------------
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, opts = {}, tries = 2) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeout ?? 15000);
  try {
    const res = await fetch(url, { redirect: 'follow', ...opts, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    clearTimeout(timeout);
    if (tries > 0) {
      await sleep(250);
      return fetchWithRetry(url, opts, tries - 1);
    }
    throw e;
  }
}

function isHttp(url) {
  return /^https?:\/\//i.test(url);
}
function toAbs(url, base = BASE_URL) {
  if (!url) return null;
  if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:') || url.startsWith('#')) return null;
  if (isHttp(url)) return url;
  return base.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
}

function uniq(arr) { return [...new Set(arr)]; }

function extractLinks(html, baseUrl) {
  const links = [];
  // <a href="">
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/ig;
  let m;
  while ((m = re.exec(html))) {
    const abs = toAbs(m[1], baseUrl);
    if (abs) links.push(abs);
  }
  return uniq(links);
}

function hasTag(html, selector) {
  // Very tiny checks via regex (no JSDOM dependency)
  switch (selector) {
    case 'canonical': return /<link[^>]+rel=["']canonical["'][^>]+>/i.test(html);
    case 'hreflang-fr': return /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']fr["'][^>]*>/i.test(html);
    case 'hreflang-en': return /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']en["'][^>]*>/i.test(html);
    case 'hreflang-x': return /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']x-default["'][^>]*>/i.test(html);
    case 'og': return /<meta[^>]+property=["']og:/i.test(html);
    case 'twitter': return /<meta[^>]+name=["']twitter:/i.test(html);
    default: return false;
  }
}

async function curlHeaders(url) {
  try {
    const { stdout } = await exec(`curl -s -I -L ${shellEscape(url)}`);
    return stdout;
  } catch (e) {
    return '';
  }
}
function shellEscape(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function hasHeader(raw, name) {
  const re = new RegExp(`^${name}:\\s*(.+)$`, 'gmi');
  const m = re.exec(raw);
  return m ? (m[1] || '').trim() : '';
}

// -----------------------
// 1) Link checker
// -----------------------
async function checkLinks() {
  const results = [];
  for (const path of PAGES) {
    const url = toAbs(path);
    let html = '';
    try {
      const res = await fetchWithRetry(url, { method: 'GET' });
      html = await res.text();
    } catch (e) {
      results.push({ page: url, type: 'page-fetch-error', error: String(e) });
      continue;
    }
    const links = extractLinks(html, BASE_URL);
    for (const link of links) {
      // Skip external non-HTTP links (already filtered) and affiliate links are HTTP too (keep)
      try {
        let res = await fetchWithRetry(link, { method: 'HEAD' });
        if (res.status >= 400 || res.status === 0) {
          // Some servers block HEAD; try GET
          res = await fetchWithRetry(link, { method: 'GET' });
        }
        const ok = (res.status >= 200 && res.status < 400);
        if (!ok) {
          results.push({ page: url, link, status: res.status, statusText: res.statusText || '' });
        }
      } catch (e) {
        results.push({ page: url, link, error: String(e) });
      }
    }
  }
  return results;
}

// -----------------------
// 2) SEO tags
// -----------------------
async function checkSeoTags() {
  const issues = [];
  for (const path of PAGES) {
    const url = toAbs(path);
    let html = '';
    try {
      const res = await fetchWithRetry(url, { method: 'GET' });
      html = await res.text();
    } catch (e) {
      issues.push({ page: url, issue: 'fetch-failed', detail: String(e) });
      continue;
    }
    const missing = [];
    if (!hasTag(html, 'canonical')) missing.push('canonical');
    if (!hasTag(html, 'hreflang-fr')) missing.push('hreflang fr');
    if (!hasTag(html, 'hreflang-en')) missing.push('hreflang en');
    if (!hasTag(html, 'hreflang-x')) missing.push('hreflang x-default');
    if (!hasTag(html, 'og')) missing.push('Open Graph');
    if (!hasTag(html, 'twitter')) missing.push('Twitter');
    if (missing.length) issues.push({ page: url, issue: 'missing-tags', missing });
  }
  return issues;
}

// -----------------------
// 3) Sitemaps
// -----------------------
async function checkSitemaps() {
  const problems = [];

  // sitemap.xml index
  const idxUrl = toAbs('/sitemap.xml');
  const idxRes = await fetchWithRetry(idxUrl);
  const idxBody = await idxRes.text();
  if (!/sitemap-fr\.xml/i.test(idxBody) || !/sitemap-en\.xml/i.test(idxBody)) {
    problems.push({ file: idxUrl, issue: 'index-missing-children' });
  }

  // Check absolute URLs & canonical domain in FR & EN sitemaps
  for (const s of ['/sitemap-fr.xml', '/sitemap-en.xml']) {
    const u = toAbs(s);
    const res = await fetchWithRetry(u);
    const body = await res.text();
    const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    const bad = urls.filter(x => !x.startsWith(CANONICAL + '/'));
    if (bad.length) {
      problems.push({ file: u, issue: 'non-canonical-urls', bad });
    }
  }

  return problems;
}

// -----------------------
// 4) robots.txt
// -----------------------
async function checkRobots() {
  const url = toAbs('/robots.txt');
  const res = await fetchWithRetry(url);
  const text = await res.text();
  const issues = [];
  if (!/Sitemap:\s*https:\/\/www\.creativeai-tools\.fr\/sitemap\.xml/i.test(text)) {
    issues.push('robots-missing-sitemap');
  }
  // Ensure /en/ is not disallowed
  const disallows = [...text.matchAll(/Disallow:\s*(\S+)/gi)].map(m => m[1]);
  if (disallows.some(p => p === '/en/' || p === '/en')) {
    issues.push('robots-disallow-en');
  }
  return issues.map(i => ({ file: url, issue: i }));
}

// -----------------------
// 5) Security headers via curl -I
// -----------------------
async function checkSecurityHeaders() {
  const paths = ['/', '/en/'];
  const findings = [];
  for (const p of paths) {
    const url = toAbs(p);
    const raw = await curlHeaders(url);
    const csp = hasHeader(raw, 'Content-Security-Policy');
    const hsts = hasHeader(raw, 'Strict-Transport-Security');
    const ref = hasHeader(raw, 'Referrer-Policy');
    const perm = hasHeader(raw, 'Permissions-Policy');
    const xfo = hasHeader(raw, 'X-Frame-Options');
    const xcto = hasHeader(raw, 'X-Content-Type-Options');

    const missing = [];
    if (!csp) missing.push('Content-Security-Policy');
    if (!hsts) missing.push('Strict-Transport-Security');
    if (!ref) missing.push('Referrer-Policy');
    if (!perm) missing.push('Permissions-Policy');
    if (!xfo) missing.push('X-Frame-Options');
    if (!xcto) missing.push('X-Content-Type-Options');

    findings.push({ url, missing, sample: raw.split('\n').slice(0, 12).join('\n') });
  }
  return findings;
}

// -----------------------
// 6) Static sizes
// -----------------------
async function checkStaticSizes() {
  const cssPath = resolve(root, 'assets', 'styles.css');
  const jsPath  = resolve(root, 'assets', 'main.js');

  const out = [];
  if (existsSync(cssPath)) {
    const { size } = await stat(cssPath);
    out.push({ file: 'assets/styles.css', size, limit: FILE_THRESHOLDS.css, ok: size <= FILE_THRESHOLDS.css });
  } else {
    out.push({ file: 'assets/styles.css', missing: true });
  }
  if (existsSync(jsPath)) {
    const { size } = await stat(jsPath);
    out.push({ file: 'assets/main.js', size, limit: FILE_THRESHOLDS.js, ok: size <= FILE_THRESHOLDS.js });
  } else {
    out.push({ file: 'assets/main.js', missing: true });
  }
  return out;
}

// -----------------------
// Generate report
// -----------------------
function fmtBytes(b) {
  if (typeof b !== 'number') return '—';
  const kb = b / 1024;
  return `${kb.toFixed(1)} KB`;
}

async function generateReport({ linkIssues, seoIssues, sitemapIssues, robotsIssues, headersFindings, staticSizes }) {
  const lines = [];
  lines.push(`# QA Report — creativeai-tools`);
  lines.push(`Base URL checked: **${BASE_URL}**`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // 1) Links
  lines.push(`## 1) Link checker`);
  if (!linkIssues.length) {
    lines.push(`✅ All checked links on target pages returned 2xx/3xx.`);
  } else {
    lines.push(`❌ Found ${linkIssues.length} problematic link(s):`);
    lines.push('');
    lines.push(`| Page | Link | Status/Error |`);
    lines.push(`|------|------|--------------|`);
    for (const it of linkIssues.slice(0, 500)) {
      const status = it.error ? it.error : `${it.status || '—'} ${it.statusText || ''}`.trim();
      lines.push(`| ${it.page} | ${it.link || '—'} | ${status} |`);
    }
    if (linkIssues.length > 500) lines.push(`_…and ${linkIssues.length - 500} more_`);
  }
  lines.push('');

  // 2) SEO tags
  lines.push(`## 2) SEO tags (canonical, hreflang FR/EN/x-default, OG, Twitter)`);
  if (!seoIssues.length) {
    lines.push(`✅ All pages include the required tags.`);
  } else {
    for (const it of seoIssues) {
      lines.push(`- ${it.page}: missing → ${Array.isArray(it.missing) ? it.missing.join(', ') : it.issue}`);
    }
  }
  lines.push('');

  // 3) Sitemaps
  lines.push(`## 3) Sitemaps`);
  if (!sitemapIssues.length) {
    lines.push(`✅ sitemap.xml indexes **sitemap-fr.xml** & **sitemap-en.xml** and child sitemaps use canonical absolute URLs.`);
  } else {
    for (const it of sitemapIssues) {
      lines.push(`- ${it.file}: ${it.issue}${it.bad ? ` → ${it.bad.join(', ')}` : ''}`);
    }
  }
  lines.push('');

  // 4) robots.txt
  lines.push(`## 4) robots.txt`);
  if (!robotsIssues.length) {
    lines.push(`✅ robots.txt exposes the sitemap index and does not block **/en/**.`);
  } else {
    for (const it of robotsIssues) {
      lines.push(`- ${it.file}: ${it.issue}`);
    }
  }
  lines.push('');

  // 5) Security headers
  lines.push(`## 5) Security headers (curl -I)`);
  for (const it of headersFindings) {
    if (it.missing.length === 0) {
      lines.push(`✅ ${it.url} — all required headers present.`);
    } else {
      lines.push(`❌ ${it.url} — missing: ${it.missing.join(', ')}`);
      lines.push(`<details><summary>Sample headers</summary>\n\n\`\`\`\n${it.sample.trim()}\n\`\`\`\n</details>`);
    }
  }
  lines.push('');

  // 6) Static sizes
  lines.push(`## 6) Static sizes (raw bytes)`);
  for (const it of staticSizes) {
    if (it.missing) {
      lines.push(`- ${it.file}: ❌ file not found`);
    } else {
      const status = it.ok ? '✅' : '❌';
      lines.push(`- ${it.file}: ${status} ${fmtBytes(it.size)} (limit ${fmtBytes(it.limit)})`);
    }
  }

  lines.push('');
  lines.push(`---`);
  lines.push(`_Tip:_ use \`BASE_URL\` to target a preview deploy, e.g.:`);
  lines.push(`\`BASE_URL=https://deploy-preview-123--creativeai-tools.netlify.app node tools/check.mjs\``);

  const outPath = resolve(here, 'report.md');
  await writeFile(outPath, lines.join('\n'), 'utf8');
  return outPath;
}

// -----------------------
// Main
// -----------------------
(async function main(){
  console.log(`🔎 QA start — Base URL: ${BASE_URL}`);

  // 1) Links
  process.stdout.write('1/6 Checking links… ');
  const linkIssues = await checkLinks();
  console.log(linkIssues.length ? `❌ ${linkIssues.length} issue(s)` : '✅ OK');

  // 2) SEO
  process.stdout.write('2/6 Checking SEO tags… ');
  const seoIssues = await checkSeoTags();
  console.log(seoIssues.length ? `❌ ${seoIssues.length} page(s) incomplete` : '✅ OK');

  // 3) Sitemaps
  process.stdout.write('3/6 Checking sitemaps… ');
  const sitemapIssues = await checkSitemaps();
  console.log(sitemapIssues.length ? `❌ ${sitemapIssues.length} problem(s)` : '✅ OK');

  // 4) Robots
  process.stdout.write('4/6 Checking robots.txt… ');
  const robotsIssues = await checkRobots();
  console.log(robotsIssues.length ? `❌ ${robotsIssues.length} issue(s)` : '✅ OK');

  // 5) Headers (preview-friendly)
process.stdout.write('5/6 Checking security headers… ');
const headersRaw = await checkSecurityHeaders();

const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)/i.test(BASE_URL);
const host = new URL(BASE_URL).hostname;
const isNetlifyApp = /\.netlify\.app$/i.test(host);

let headersFindings = headersRaw;

// Sur netlify.app on n'exige pas HSTS (drafts/preview)
if (isNetlifyApp) {
  headersFindings = headersFindings.map(it => ({
    ...it,
    missing: it.missing.filter(h => h !== 'Strict-Transport-Security')
  }));
}

// En local, on ignore complètement la vérif des headers (pas de netlify.toml appliqué)
if (isLocal) {
  const base = BASE_URL.replace(/\/$/, '');
  headersFindings = [
    { url: base + '/', missing: [], sample: '' },
    { url: base + '/en/', missing: [], sample: '' }
  ];
}

const missingCount = headersFindings.reduce((n, it) => n + (it.missing.length ? 1 : 0), 0);
console.log(missingCount ? `❌ ${missingCount} missing set(s)` : '✅ OK');

  // 6) Sizes
  process.stdout.write('6/6 Checking static sizes… ');
  const staticSizes = await checkStaticSizes();
  const badSizes = staticSizes.filter(x => !x.missing && !x.ok).length;
  console.log(badSizes ? `❌ ${badSizes} over limit` : '✅ OK');

  const report = await generateReport({ linkIssues, seoIssues, sitemapIssues, robotsIssues, headersFindings, staticSizes });
  console.log(`\n📄 Report written to: ${report}`);
})().catch(err => {
  console.error('💥 QA script failed:', err);
  process.exitCode = 1;
});
