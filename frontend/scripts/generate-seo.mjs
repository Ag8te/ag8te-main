import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SITE_URL = "https://mzansiserve.co.za";
const DIST_DIR = new URL("../dist/", import.meta.url);

const routes = [
  {
    path: "/",
    title: "MzansiServe – Services at Your Fingertips",
    description: "MzansiServe connects South Africans with verified transport, professionals, service providers and marketplace products.",
  },
  {
    path: "/shop",
    title: "Shop Products Online in South Africa | MzansiServe",
    description: "Browse products from South African sellers on the MzansiServe marketplace.",
  },
  {
    path: "/ads",
    title: "Local Marketplace Ads | MzansiServe",
    description: "Discover local listings and marketplace advertisements across South Africa.",
  },
  {
    path: "/about",
    title: "About MzansiServe | South African Service Marketplace",
    description: "Learn how MzansiServe connects South Africans with trusted local services, transport and products.",
  },
  {
    path: "/how-it-works",
    title: "How MzansiServe Works | Find and Book Local Services",
    description: "Learn how to find verified providers, book services and pay securely with MzansiServe.",
  },
  {
    path: "/advertise",
    title: "Advertise on MzansiServe | Reach South African Customers",
    description: "Promote your business, products or services to customers across South Africa with MzansiServe.",
  },
  {
    path: "/terms",
    title: "Terms of Use | MzansiServe",
    description: "Read the terms governing use of the MzansiServe platform and marketplace.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | MzansiServe",
    description: "Learn how MzansiServe collects, uses and protects personal information under POPIA.",
  },
  {
    path: "/cookies",
    title: "Cookie Policy | MzansiServe",
    description: "Learn how MzansiServe uses cookies and how you can manage your preferences.",
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
