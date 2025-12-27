# creativeai-tools — Site d’affiliation InVideo (FR/EN)

Site statique, prêt Netlify, conforme **WCAG 2.2 AA** & **Core Web Vitals 2025**, avec SEO multilingue (FR/EN + `hreflang`), bandeau cookies **opt-in**, **GA4 conditionnel**, et flux newsletter vers **Google Sheets (Apps Script)**.

**Domaine canonique** : https://www.creativeai-tools.fr

---

## 🧱 Arborescence

/
├─ index.html
├─ blog.html
├─ blog-Invideo.html
├─ mentions-legales.html
├─ politique-de-confidentialite.html
├─ 404.html
├─ en/
│ ├─ index.html
│ ├─ blog.html
│ ├─ blog-Invideo.html
│ ├─ legal-notice.html
│ └─ privacy-policy.html
├─ assets/
│ ├─ styles.css
│ └─ main.js
├─ images/
│ ├─ capture-ecran.png (avec .avif / .webp)
│ ├─ capture-ecran-dashboard.png (avec .avif / .webp)
│ ├─ full-logo-black.png
│ ├─ visuel-2.png (avec .avif / .webp)
│ └─ visuel-3.png (avec .avif / .webp)
├─ robots.txt
├─ sitemap.xml
├─ sitemap-fr.xml
├─ sitemap-en.xml
├─ netlify.toml
├─ _redirects
└─ tools/
├─ check.mjs
└─ report.md (généré par le script)



---

## 🖼️ Mapping des images renommées (kebab-case ASCII)

| Nom original                         | Nom final                         |
|--------------------------------------|-----------------------------------|
| `Capture d’écran.png`                | `capture-ecran.png`               |
| `Capture d’écran-dashboard.png`      | `capture-ecran-dashboard.png`     |
| `Full Logo-black.png`                | `full-logo-black.png`             |
| `visuel-2.png`                       | `visuel-2.png` *(inchangé)*       |
| `visuel-3.png`                       | `visuel-3.png` *(inchangé)*       |

**Optimisation** : pour chaque PNG, créer **AVIF** et **WebP** (mêmes dimensions) et intégrer via `<picture>` (AVIF → WebP → PNG). Dimensions fixes + `aspect-ratio` en CSS pour un **CLS ≈ 0**.

---

## 🎨 Identité & design

- **Logo** : typographique **“creativeai-tools”** (SVG intégré dans le HTML, versions clair/sombre par héritage `currentColor`).  
- **Palette** (tokens dans `:root`) :
  - `--primary:#6D28D9; --accent:#06B6D4; --text:#111827; --muted:#4B5563; --surface:#FFFFFF; --surface-alt:#F8FAFC; --success:#16A34A; --warning:#F59E0B; --error:#DC2626;`
- **Typo** : Inter variable (titres 700, échelle via `clamp()`).
- **CTA affiliés** : **tous les liens d’action** pointent vers `https://invideo.sjv.io/3JrYry` avec `target="_blank" rel="noopener nofollow sponsored"`.

---

## 🌐 Multilingue & SEO

- **Hreflang** : FR/EN + `x-default` présents sur toutes les pages.  
- **Canonical** : URLs absolues `https://www.creativeai-tools.fr/...`.  
- **Redirection langue (humains uniquement)** :
  - Implémentée dans `assets/main.js` : si `navigator.language` ≠ `fr` et page FR → redirige vers l’équivalent EN.  
  - **Bots exclus** via User-Agent (pas de redirection pour préserver l’indexation).
- **Open Graph / Twitter** : balises présentes sur FR & EN.  
- **Sitemaps** : `sitemap.xml` (index) référence `sitemap-fr.xml` et `sitemap-en.xml`.  
- **robots.txt** : expose les 3 sitemaps, ne bloque pas `/en/`.

---

## 🔐 RGPD, Cookies & GA4 (ID : `G-6PZMXTM97R`)

- **Bannière opt-in** (Nécessaires / Analytics). **Analytics décoché par défaut**.  
- **GA4 bloqué tant que non consenti** : chargement **conditionnel** via un loader externe dans `assets/main.js` (aucun inline JS).  
- **Consentement** : persistance `localStorage` (clé `cat_consent`) + journal minimal (horodatage, version).  
- **Préférences** : panneau réouvrable via le bouton en pied de page.

> Pour remplacer l’ID GA4 : chercher `G-6PZMXTM97R` dans `assets/main.js` et mettre à jour.

---

## 📨 Newsletter → Google Sheets (Apps Script)

Les formulaires (FR & EN) postent côté client vers une **Web App Apps Script** (CORS).  
**À faire** :

1. Créez une feuille Google (colonnes conseillées : `timestamp`, `email`, `page`, `ua`, `recaptcha_score`).
2. Ouvrez **Apps Script** (lié à la feuille), créez `Code.gs` :

```js
const ORIGINS = ['https://www.creativeai-tools.fr', 'https://www.creativeai-tools.fr/']; // ajouter le domaine canonique (www, https)

function doPost(e) {
  const origin = (e?.parameter?.origin || e?.postData?.type) ? e?.parameter?.origin : '';
  const req = JSON.parse(e.postData.contents || '{}');
  const email = (req.email || '').trim();
  const page = req.page || '';
  const ua = req.ua || '';
  if (!email || !/@/.test(email)) return json({ ok:false, error:'invalid_email' });

  // (Optionnel) Vérif reCAPTCHA v3 côté serveur :
  // const score = verifyRecaptcha(req.recaptchaToken); // à implémenter si clé secrète

  const sh = SpreadsheetApp.getActive().getSheetByName('Leads') || SpreadsheetApp.getActive().insertSheet('Leads');
  if (sh.getLastRow() === 0) sh.appendRow(['timestamp','email','page','ua','score']);
  sh.appendRow([new Date(), email, page, ua, '']);

  return json({ ok:true });
}

function json(obj) {
  const out = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  const res = out;
  // CORS permissif vers le domaine du site
  // (Apps Script n'a pas d'API header directe sur doPost ; pour CORS stricte, publiez la Web App en "Anyone" et limitez via logique côté client)
  return res;
}



Déployez en Web App (Exécuter l’appli en : Me ; Accès : Anyone).

Récupérez l’URL de déploiement et renseignez-la dans l’attribut data-apps-script du formulaire (voir index.html, en/index.html, blog*.html).

(Optionnel) reCAPTCHA v3 : renseigner data-recaptcha-sitekey (sinon laissez vide, le code client n’appelle pas reCAPTCHA).

Exemple cURL (tester votre Apps Script)

Remplacez https://script.google.com/macros/s/XXXXXXXX/exec par votre URL.


curl -X POST "https://script.google.com/macros/s/XXXXXXXX/exec" \
  -H "Content-Type: application/json" \
  --data '{"email":"alice@example.com","page":"/en/","ua":"CLI-test/1.0"}'


Réponse attendue :

{"ok": true}


🚀 Déploiement Netlify

Repo → connecter à Netlify (ou glisser-déposer le dossier).

Build : site statique (pas de build), publish = "." (déjà dans netlify.toml).

Domaines :

Utiliser www comme hôte principal.

Les redirections HTTPS + www sont gérées par /_redirects.

Headers sécurité : configurés dans netlify.toml (CSP, HSTS, Referrer-Policy, Permissions-Policy, X-CTO, X-FO).

Cache :

HTML : 5 min avec revalidation.

/assets/*, /images/*, /fonts/* : 1 an immutable.

Important : la CSP n’autorise que :
self, youtube.com, youtu.be, *.googlevideo.com, i.ytimg.com,
www.googletagmanager.com, www.google-analytics.com,
translate.googleapis.com, translate.google.com, *.googleusercontent.com,
fonts.gstatic.com, fonts.googleapis.com, et votre URL Apps Script (via fetch).
Évitez tout inline script.

🧪 QA automatique
Script

bash:
node tools/check.mjs                 # vérifie les fichiers en local
node tools/check.mjs --base https://www.creativeai-tools.fr   # + vérif headers via curl -I


Génère tools/report.md (résumé Markdown).

Échoue (exit code ≠ 0) si : liens cassés, SEO tags manquants, sitemaps/robots incohérents, budgets statiques dépassés (CSS < 120 KB, JS < 80 KB).

Checklist manuelle

 Lighthouse (Mobile & Desktop) Perf ≥ 90 / SEO ≥ 95 / Access ≥ 95 / BP ≥ 95.

 Aucune erreur JS console.

 Naviguer au clavier (focus visible, burger accessible).

 Redirection langue : FR → EN pour navigateurs non FR (bots exclus).

 Bannières cookies : Analytics off par défaut, GA4 chargé uniquement après consentement.

 Formulaire newsletter :

honeypot OK (champ masqué company vide).

délai anti-bot côté client (présent dans main.js).

POST Apps Script OK (réponse {"ok":true}).

 Sitemaps indexés dans robots.txt.

 En-têtes sécurité présents (CSP, HSTS, Referrer-Policy, Permissions-Policy, X-CTO, X-FO).

🔧 Dév local

N’importe quel serveur statique suffit :

bash:
# avec Node >=18
npx http-server -p 8080 -c-1 .
# ou
python3 -m http.server 8080

Ouvrir http://localhost:8080




📝 Ajouter un article

Dupliquez blog-Invideo.html comme base (ou créez blog-nom.html).

Mettez à jour : <title>, description, canonical, hreflang (FR/EN + x-default).

Ajoutez la carte dans blog.html (FR) et /en/blog.html (EN).

Mettez à jour sitemap-fr.xml / sitemap-en.xml.

Exécutez node tools/check.mjs.

🔁 Règles d’écriture & a11y

Titres hiérarchiques (h1→h2→h3).

Liens : texte explicite (pas de “cliquez ici”).

Images : alt descriptif, dimensions fixes, loading="lazy" decoding="async".

Animations : respect prefers-reduced-motion.

Contraste : vérifier AA (tokens déjà contrastés).

🧩 Intégrations & YouTube

Vidéo hero (officiel InVideo) : https://www.youtube.com/watch?v=FQgEtunYoG0 (embed lazy + poster).

Domains autorisés CSP pour YouTube : youtube.com, youtu.be, i.ytimg.com, *.googlevideo.com.

🔗 Sources officielles InVideo (références utilisées)

InVideo — AI Avatar & Workflows

InVideo — Text→Video generator

Help Center — Plans (Plus/Max/Generative/Team)

InVideo — Affiliate Program (cookie 120 jours)

Help Center — Watermark & re-export

InVideo — Site & Studio

InVideo — Talking Avatar / AI Twins

(Les URL sont citées dans les articles FR/EN ; gardez-les à jour si InVideo change ses pages.)

❗️Notes & limites

Les prix/quotas des plans InVideo évoluent ; nos tableaux montrent des ordres de grandeur. Toujours renvoyer à la page pricing officielle.

Pas de routage côté Edge pour la langue (SEO). La redirection se fait côté client (humains uniquement).

Si vous rajoutez des scripts tiers, mettez à jour la CSP dans netlify.toml.

🗓️ Changelog (extrait)

2025-09-15 : version initiale FR/EN, SEO + RGPD, GA4 conditionnel, YouTube hero, newsletter Apps Script, QA tooling.

© Légal

E-Com Shop — SIREN 934934308 — 60 rue François 1er, 75008 PARIS — contact.ecomshopfrance@gmail.com

Site partenaire non officiel d’InVideo.