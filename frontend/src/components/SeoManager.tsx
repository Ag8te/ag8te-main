import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://ag8te.com";
const REGIONAL_SITE_URL = "https://ag8te.co.za";
const DEFAULT_IMAGE = `${SITE_URL}/placeholder.png`;
const DEFAULT_DESCRIPTION =
  "AG8TE connects South Africans with verified transport, trusted professionals, local service providers and e-Shop products.";

type SeoConfig = {
  title: string;
  description: string;
  keywords: string;
  index?: boolean;
};

const PUBLIC_ROUTES: Record<string, SeoConfig> = {
  "/": {
    title: "AG8TE | Verified Services, Transport and e-Shop in South Africa",
    description: DEFAULT_DESCRIPTION,
    keywords: "AG8TE, South Africa marketplace, verified services, transport booking, e-Shop, local professionals, service providers",
  },
  "/shop": {
    title: "Shop Products Online in South Africa | AG8TE",
    description: "Browse products from South African sellers on the AG8TE marketplace.",
    keywords: "AG8TE shop, South Africa e-Shop, online products, verified sellers, local marketplace",
  },
  "/ads": {
    title: "Local e-Shop and Marketplace Listings | AG8TE",
    description: "Discover local e-Shop listings and marketplace advertisements across South Africa.",
    keywords: "AG8TE e-Shop, marketplace listings, South Africa ads, local sellers",
  },
  "/about": {
    title: "About AG8TE | South African Service Marketplace",
    description: "Learn how AG8TE connects South Africans with trusted local services, transport and products.",
    keywords: "about AG8TE, South African service marketplace, trusted local services",
  },
  "/how-it-works": {
    title: "How AG8TE Works | Find and Book Local Services",
    description: "Learn how to find verified providers, book services and pay securely with AG8TE.",
    keywords: "how AG8TE works, book services online, verified providers South Africa",
  },
  "/advertise": {
    title: "Advertise on AG8TE | Reach South African Customers",
    description: "Promote your business, products or services to customers across South Africa with AG8TE.",
    keywords: "advertise on AG8TE, South Africa customers, marketplace advertising",
  },
  "/terms": {
    title: "Terms of Use | AG8TE",
    description: "Read the terms governing use of the AG8TE platform and marketplace.",
    keywords: "AG8TE terms, platform terms, marketplace terms",
  },
  "/privacy": {
    title: "Privacy Policy | AG8TE",
    description: "Learn how AG8TE collects, uses and protects personal information under POPIA.",
    keywords: "AG8TE privacy policy, POPIA, personal information",
  },
  "/cookies": {
    title: "Cookie Policy | AG8TE",
    description: "Learn how AG8TE uses cookies and how you can manage your preferences.",
    keywords: "AG8TE cookie policy, cookies, privacy preferences",
  },
  "/login": {
    title: "Login | AG8TE",
    description: "Log in securely to your AG8TE account.",
    keywords: "AG8TE login",
  },
  "/register": {
    title: "Register | AG8TE",
    description: "Create your AG8TE account.",
    keywords: "AG8TE register, create account",
  },
  "/admin": {
    title: "Administrator | AG8TE",
    description: "AG8TE administrator console.",
    keywords: "AG8TE admin",
  },
  "/admin/login": {
    title: "Administrator Login | AG8TE",
    description: "Secure access to the AG8TE administrator console.",
    keywords: "AG8TE admin login",
  },
  "/login/otp": { title: "Login OTP | AG8TE", description: "Verify your AG8TE login.", keywords: "AG8TE OTP" },
  "/services": { title: "Verified Services | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE services, verified service providers" },
  "/transport": { title: "Transport Services | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE transport, transport booking South Africa" },
  "/professionals": { title: "Verified Professionals | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE professionals, verified professionals South Africa" },
  "/my-bookings": { title: "My Bookings | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE bookings" },
  "/checkout": { title: "Checkout | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE checkout" },
  "/shopping-history": { title: "Shopping History | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE shopping history" },
  "/payment-status": { title: "Payment Status | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE payment status" },
  "/payment-error": { title: "Payment Error | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE payment error" },
  "/profile": { title: "Profile | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE profile" },
  "/ads/post": { title: "Post an e-Shop Listing | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "post listing AG8TE" },
  "/forgot-password": { title: "Forgot Password | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE password reset" },
  "/reset-password": { title: "Reset Password | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE reset password" },
  "/verify-email": { title: "Verify Email | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE verify email" },
  "/dashboard/driver": { title: "Driver Dashboard | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE driver dashboard" },
  "/dashboard/professional": { title: "Professional Dashboard | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE professional dashboard" },
  "/dashboard/provider": { title: "Provider Dashboard | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE provider dashboard" },
  "/dashboard/agent": { title: "Agent Dashboard | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE agent dashboard" },
  "/dashboard/advertiser": { title: "Advertiser Dashboard | AG8TE", description: DEFAULT_DESCRIPTION, keywords: "AG8TE advertiser dashboard" },
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
      title: "Product Details",
      description: "View product details, seller information and purchasing options on AG8TE.",
      keywords: "AG8TE product details, online product, verified seller",
    };
  }
  if (pathname.startsWith("/provider/")) {
    return {
      title: "Provider Details",
      description: "View provider details, services and booking options on AG8TE.",
      keywords: "AG8TE provider details, verified provider, book services",
    };
  }
  if (pathname.startsWith("/ads/ad/")) {
    return {
      title: "Ad Details",
      description: "View this local marketplace listing on AG8TE.",
      keywords: "AG8TE listing, local marketplace, e-Shop listing",
    };
  }
  if (pathname.startsWith("/book/")) {
    return { title: "Book Service | AG8TE", description: "Book a service on AG8TE.", keywords: "book service AG8TE", index: false };
  }
  return undefined;
}

function setLink(rel: string, selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
}

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isNoIndex = NOINDEX_PATHS.some(
      (path) => pathname === path || (path.endsWith("/") && pathname.startsWith(path)),
    );
    const config = PUBLIC_ROUTES[pathname] || dynamicConfig(pathname) || {
      title: "Page Not Found | AG8TE",
      description: DEFAULT_DESCRIPTION,
      keywords: "AG8TE",
      index: false,
    };
    const shouldIndex = !isNoIndex && config.index !== false;
    const canonicalPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    const regionalUrl = `${REGIONAL_SITE_URL}${canonicalPath}`;

    document.title = config.title;
    setMeta('meta[name="description"]', "name", "description", config.description);
    setMeta('meta[name="keywords"]', "name", "keywords", config.keywords);
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      shouldIndex ? "index, follow, max-image-preview:large" : "noindex, nofollow",
    );
    setMeta('meta[property="og:title"]', "property", "og:title", config.title);
    setMeta('meta[property="og:description"]', "property", "og:description", config.description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", DEFAULT_IMAGE);
    setMeta('meta[property="og:locale"]', "property", "og:locale", "en_ZA");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", config.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", config.description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", DEFAULT_IMAGE);

    setLink("canonical", 'link[rel="canonical"]', { href: canonicalUrl });
    setLink("alternate", 'link[rel="alternate"][hreflang="en"]', { hreflang: "en", href: canonicalUrl });
    setLink("alternate", 'link[rel="alternate"][hreflang="en-ZA"]', { hreflang: "en-ZA", href: regionalUrl });
    setLink("alternate", 'link[rel="alternate"][hreflang="x-default"]', { hreflang: "x-default", href: canonicalUrl });
  }, [pathname]);

  return null;
}
