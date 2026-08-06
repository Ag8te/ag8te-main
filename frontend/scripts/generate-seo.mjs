import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SITE_URL = "https://ag8te.com";
const DIST_DIR = new URL("../dist/", import.meta.url);

const routes = [
  {
    path: "/",
    title: "AG8TE – Services at Your Fingertips",
    description: "AG8TE connects South Africans with verified transport, professionals, service providers and marketplace products.",
  },
  {
    path: "/shop",
    title: "Shop Products Online in South Africa | AG8TE",
    description: "Browse products from South African sellers on the AG8TE marketplace.",
  },
  {
    path: "/ads",
    title: "Local Marketplace Ads | AG8TE",
    description: "Discover local listings and marketplace advertisements across South Africa.",
  },
  {
    path: "/about",
    title: "About AG8TE | South African Service Marketplace",
    description: "Learn how AG8TE connects South Africans with trusted local services, transport and products.",
  },
  {
    path: "/how-it-works",
    title: "How AG8TE Works | Find and Book Local Services",
    description: "Learn how to find verified providers, book services and pay securely with AG8TE.",
  },
  {
    path: "/advertise",
    title: "Advertise on AG8TE | Reach South African Customers",
    description: "Promote your business, products or services to customers across South Africa with AG8TE.",
  },
  {
    path: "/terms",
    title: "Terms of Use | AG8TE",
    description: "Read the terms governing use of the AG8TE platform and marketplace.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | AG8TE",
    description: "Learn how AG8TE collects, uses and protects personal information under POPIA.",
  },
  {
    path: "/cookies",
    title: "Cookie Policy | AG8TE",
    description: "Learn how AG8TE uses cookies and how you can manage your preferences.",
  },
];

const escapeHtml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function pageHtml(template, route) {
  const canonical = `${SITE_URL}${route.path}`;
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(route.title)}</title>`);
  html = html.replace(/(<meta\s+name=["']description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(route.description)}$2`);
  html = html.replace(/(<meta\s+property=["']og:title["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(route.title)}$2`);
  html = html.replace(/(<meta\s+property=["']og:description["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(route.description)}$2`);
  html = html.replace(/(<meta\s+property=["']og:url["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${canonical}$2`);
  html = html.replace(/(<link\s+rel=["']canonical["'][^>]*href=["'])[^"']*(["'][^>]*>)/i, `$1${canonical}$2`);
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

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(({ path }) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
  .join("\n")}
</urlset>
`;

await writeFile(new URL("sitemap.xml", DIST_DIR), sitemap);
console.log(`Generated SEO entry points and sitemap for ${routes.length} public routes.`);
