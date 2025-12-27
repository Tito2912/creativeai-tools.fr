# QA Report — creativeai-tools
Base URL checked: **https://68c9c96c7927112737e10bca--invideotest.netlify.app**
Generated: 2025-09-16T20:50:35.963Z

## 1) Link checker
✅ All checked links on target pages returned 2xx/3xx.

## 2) SEO tags (canonical, hreflang FR/EN/x-default, OG, Twitter)
✅ All pages include the required tags.

## 3) Sitemaps
✅ sitemap.xml indexes **sitemap-fr.xml** & **sitemap-en.xml** and child sitemaps use canonical absolute URLs.

## 4) robots.txt
✅ robots.txt exposes the sitemap index and does not block **/en/**.

## 5) Security headers (curl -I)
❌ https://68c9c96c7927112737e10bca--invideotest.netlify.app/ — missing: Content-Security-Policy, Referrer-Policy, Permissions-Policy, X-Frame-Options, X-Content-Type-Options
<details><summary>Sample headers</summary>

```

```
</details>
❌ https://68c9c96c7927112737e10bca--invideotest.netlify.app/en/ — missing: Content-Security-Policy, Referrer-Policy, Permissions-Policy, X-Frame-Options, X-Content-Type-Options
<details><summary>Sample headers</summary>

```

```
</details>

## 6) Static sizes (raw bytes)
- assets/styles.css: ✅ 17.7 KB (limit 120.0 KB)
- assets/main.js: ✅ 13.7 KB (limit 80.0 KB)

---
_Tip:_ use `BASE_URL` to target a preview deploy, e.g.:
`BASE_URL=https://deploy-preview-123--creativeai-tools.netlify.app node tools/check.mjs`