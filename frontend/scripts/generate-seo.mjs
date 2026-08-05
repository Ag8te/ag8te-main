import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SITE_URL = "https://ag8te.com";
const REGIONAL_SITE_URL = "https://ag8te.co.za";
const DEFAULT_IMAGE = `${SITE_URL}/placeholder.png`;
const DIST_DIR = new URL("../dist/", import.meta.url);

const routes = [
  {
    path: "/",
    title: "AG8TE | Verified Services, Transport and e-Shop in South Africa",
    description: "AG8TE connects South Africans with verified transport, trusted professionals, local service providers and e-Shop products.",
    keywords: "AG8TE, South Africa marketplace, verified services, transport booking, e-Shop, local professionals, service providers",
    priority: "1.0",
    changefreq: "daily",
  },
  {
    path: "/shop",
    title: "Shop Products Online in South Africa | AG8TE",
    description: "Browse products from South African sellers on the AG8TE marketplace.",
    keywords: "AG8TE shop, South Africa e-Shop, online products, verified sellers, local marketplace",
    priority: "0.9",
    changefreq: "daily",
  },
  {
    path: "/ads",
    title: "Local e-Shop and Marketplace Listings | AG8TE",
    description: "Discover local e-Shop listings and marketplace advertisements across South Africa.",
    keywords: "AG8TE e-Shop, marketplace listings, South Africa ads, local sellers",
    priority: "0.8",
    changefreq: "daily",
  },
  {
    path: "/about",
    title: "About AG8TE | South African Service Marketplace",
    description: "Learn how AG8TE connects South Africans with trusted local services, transport and products.",
    keywords: "about AG8TE, South African service marketplace, trusted local services",
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    path: "/how-it-works",
    title: "How AG8TE Works | Find and Book Local Services",
    description: "Learn how to find verified providers, book services and pay securely with AG8TE.",
    keywords: "how AG8TE works, book services online, verified providers South Africa",
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    path: "/advertise",
    title: "Advertise on AG8TE | Reach South African Customers",
    description: "Promote your business, products or services to customers across South Africa with AG8TE.",
    keywords: "advertise on AG8TE, South Africa customers, marketplace advertising",
    priority: "0.7",
    changefreq: "weekly",
  },
  {
    path: "/terms",
    title: "Terms of Use | AG8TE",
    description: "Read the terms governing use of the AG8TE platform and marketplace.",
    keywords: "AG8TE terms, platform terms, marketplace terms",
    priority: "0.3",
    changefreq: "yearly",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | AG8TE",
    description: "Learn how AG8TE collects, uses and protects personal information under POPIA.",
    keywords: "AG8TE privacy policy, POPIA, personal information",
    priority: "0.3",
    changefreq: "yearly",
  },
  {
    path: "/cookies",
    title: "Cookie Policy | AG8TE",
    description: "Learn how AG8TE uses cookies and how you can manage your preferences.",
    keywords: "AG8TE cookie policy, cookies, privacy preferences",
    priority: "0.3",
    changefreq: "yearly",
  },
];

const escapeHtml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function replaceAlternateHref(html, hreflang, href) {
  const pattern = new RegExp(
    `(<link\\s+rel=["']alternate["'][^>]*href=["'])[^"']*(["'][^>]*hreflang=["']${hreflang}["'][^>]*>)`,
    "i",
  );
  return html.replace(pattern, `$1${href}$2`);
}

function pageHtml(template, route) {
  const canonical = `${SITE_URL}${route.path}`;
  const regional = `${REGIONAL_SITE_URL}${route.path}`;
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(route.title)}</title>`);
  html = html.replace(/(<meta\s+name=["']description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(route.description)}$2`);
  html = html.replace(/(<meta\s+name=["']keywords["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(route.keywords)}$2`);
  html = html.replace(/(<meta\s+property=["']og:title["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(route.title)}$2`);
  html = html.replace(/(<meta\s+property=["']og:description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(route.description)}$2`);
  html = html.replace(/(<meta\s+property=["']og:url["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${canonical}$2`);
  html = html.replace(/(<meta\s+property=["']og:image["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${DEFAULT_IMAGE}$2`);
  html = html.replace(/(<meta\s+name=["']twitter:title["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(route.title)}$2`);
  html = html.replace(/(<meta\s+name=["']twitter:description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(route.description)}$2`);
  html = html.replace(/(<meta\s+name=["']twitter:image["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${DEFAULT_IMAGE}$2`);
  html = html.replace(/(<link\s+rel=["']canonical["'][^>]*href=["'])[^"']*(["'][^>]*>)/i, `$1${canonical}$2`);
  html = replaceAlternateHref(html, "en", canonical);
  html = replaceAlternateHref(html, "en-ZA", regional);
  html = replaceAlternateHref(html, "x-default", canonical);
  return html;
}

const template = await readFile(new URL("index.html", DIST_DIR), "utf8");

for (const route of routes) {
  const html = pageHtml(template, route);
  if (route.path === "/") {
    await writeFile(new URL("index.html", DIST_DIR), html);
    continue;
  }
  const outputDir = new URL(`.${route.path}/`, DIST_DIR);
  await mkdir(outputDir, { recursive: true });
  await writeFile(new URL("index.html", outputDir), html);
}

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${routes
  .map(({ path, changefreq, priority }) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}${path}" />
    <xhtml:link rel="alternate" hreflang="en-ZA" href="${REGIONAL_SITE_URL}${path}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${path}" />
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`)
  .join("\n")}
</urlset>
`;

await writeFile(new URL("sitemap.xml", DIST_DIR), sitemap);
console.log(`Generated SEO entry points and sitemap for ${routes.length} public routes.`);
