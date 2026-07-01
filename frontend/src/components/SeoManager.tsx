import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://mzansiserve.co.za";
const DEFAULT_DESCRIPTION =
  "MzansiServe connects South Africans with verified transport, professionals, service providers and marketplace products.";

type SeoConfig = {
  title: string;
  description: string;
  index?: boolean;
};

const PUBLIC_ROUTES: Record<string, SeoConfig> = {
  "/": {
    title: "MzansiServe – Services at Your Fingertips",
    description: DEFAULT_DESCRIPTION,
  },
  "/shop": {
    title: "Shop Products Online in South Africa | MzansiServe",
    description: "Browse products from South African sellers on the MzansiServe marketplace.",
  },
  "/ads": {
    title: "Local Marketplace Ads | MzansiServe",
    description: "Discover local listings and marketplace advertisements across South Africa.",
  },
  "/about": {
    title: "About MzansiServe | South African Service Marketplace",
    description: "Learn how MzansiServe connects South Africans with trusted local services, transport and products.",
  },
  "/how-it-works": {
    title: "How MzansiServe Works | Find and Book Local Services",
    description: "Learn how to find verified providers, book services and pay securely with MzansiServe.",
  },
  "/advertise": {
    title: "Advertise on MzansiServe | Reach South African Customers",
    description: "Promote your business, products or services to customers across South Africa with MzansiServe.",
  },
  "/terms": {
    title: "Terms of Use | MzansiServe",
    description: "Read the terms governing use of the MzansiServe platform and marketplace.",
  },
  "/privacy": {
    title: "Privacy Policy | MzansiServe",
    description: "Learn how MzansiServe collects, uses and protects personal information under POPIA.",
  },
  "/cookies": {
    title: "Cookie Policy | MzansiServe",
    description: "Learn how MzansiServe uses cookies and how you can manage your preferences.",
  },
  "/login": {
    title: "Log In | MzansiServe",
    description: "Log in securely to your MzansiServe account.",
  },
  "/register": {
    title: "Create an Account | MzansiServe",
    description: "Create your MzansiServe account.",
  },
  "/admin": {
    title: "Administrator",
    description: "MzansiServe administrator console.",
  },
  "/admin/login": {
    title: "Administrator",
    description: "Secure access to the MzansiServe administrator console.",
  },
};

const NOINDEX_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/payment-error",
  "/payment-status",
  "/checkout",
  "/shopping-history",
  "/my-bookings",
  "/profile",
  "/book/",
  "/dashboard/",
  "/admin",
  "/ads/post",
];

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function dynamicConfig(pathname: string): SeoConfig | undefined {
  if (pathname.startsWith("/shop/product/")) {
    return {
      title: "Product Details | MzansiServe Shop",
      description: "View product details, seller information and purchasing options on MzansiServe.",
    };
  }
  if (pathname.startsWith("/provider/")) {
    return {
      title: "Service Provider | MzansiServe",
      description: "View provider details, services and booking options on MzansiServe.",
    };
  }
  if (pathname.startsWith("/ads/ad/")) {
    return {
      title: "Marketplace Listing | MzansiServe",
      description: "View this local marketplace listing on MzansiServe.",
    };
  }
  return undefined;
}

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isNoIndex = NOINDEX_PATHS.some(
      (path) => pathname === path || (path.endsWith("/") && pathname.startsWith(path)),
    );
    const config = PUBLIC_ROUTES[pathname] || dynamicConfig(pathname) || {
      title: "Page Not Found | MzansiServe",
      description: DEFAULT_DESCRIPTION,
      index: false,
    };
    const shouldIndex = !isNoIndex && config.index !== false;
    const canonicalPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;

    document.title = config.title;
    setMeta('meta[name="description"]', "name", "description", config.description);
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      shouldIndex ? "index, follow, max-image-preview:large" : "noindex, nofollow",
    );
    setMeta('meta[property="og:title"]', "property", "og:title", config.title);
    setMeta('meta[property="og:description"]', "property", "og:description", config.description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
}
