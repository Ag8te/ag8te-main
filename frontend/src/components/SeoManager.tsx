import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://ag8te.com";
const DEFAULT_DESCRIPTION =
  "AG8TE connects South Africans with verified transport, professionals, service providers and marketplace products.";

type SeoConfig = {
  title: string;
  description: string;
  index?: boolean;
};

const PUBLIC_ROUTES: Record<string, SeoConfig> = {
  "/": {
    title: "AG8TE",
    description: DEFAULT_DESCRIPTION,
  },
  "/shop": {
    title: "Shop",
    description: "Browse products from South African sellers on the AG8TE marketplace.",
  },
  "/ads": {
    title: "Ads",
    description: "Discover local listings and marketplace advertisements across South Africa.",
  },
  "/about": {
    title: "About",
    description: "Learn how AG8TE connects South Africans with trusted local services, transport and products.",
  },
  "/how-it-works": {
    title: "How It Works",
    description: "Learn how to find verified providers, book services and pay securely with AG8TE.",
  },
  "/advertise": {
    title: "Advertise",
    description: "Promote your business, products or services to customers across South Africa with AG8TE.",
  },
  "/terms": {
    title: "Terms",
    description: "Read the terms governing use of the AG8TE platform and marketplace.",
  },
  "/privacy": {
    title: "Privacy",
    description: "Learn how AG8TE collects, uses and protects personal information under POPIA.",
  },
  "/cookies": {
    title: "Cookies",
    description: "Learn how AG8TE uses cookies and how you can manage your preferences.",
  },
  "/login": {
    title: "Login",
    description: "Log in securely to your AG8TE account.",
  },
  "/register": {
    title: "Register",
    description: "Create your AG8TE account.",
  },
  "/admin": {
    title: "Administrator",
    description: "AG8TE administrator console.",
  },
  "/admin/login": {
    title: "Administrator Login",
    description: "Secure access to the AG8TE administrator console.",
  },
  "/login/otp": { title: "Login OTP", description: "Verify your AG8TE login." },
  "/services": { title: "Services", description: DEFAULT_DESCRIPTION },
  "/transport": { title: "Transport", description: DEFAULT_DESCRIPTION },
  "/professionals": { title: "Professionals", description: DEFAULT_DESCRIPTION },
  "/my-bookings": { title: "My Bookings", description: DEFAULT_DESCRIPTION },
  "/checkout": { title: "Checkout", description: DEFAULT_DESCRIPTION },
  "/shopping-history": { title: "Shopping History", description: DEFAULT_DESCRIPTION },
  "/payment-status": { title: "Payment Status", description: DEFAULT_DESCRIPTION },
  "/payment-error": { title: "Payment Error", description: DEFAULT_DESCRIPTION },
  "/profile": { title: "Profile", description: DEFAULT_DESCRIPTION },
  "/ads/post": { title: "Post Ad", description: DEFAULT_DESCRIPTION },
  "/forgot-password": { title: "Forgot Password", description: DEFAULT_DESCRIPTION },
  "/reset-password": { title: "Reset Password", description: DEFAULT_DESCRIPTION },
  "/verify-email": { title: "Verify Email", description: DEFAULT_DESCRIPTION },
  "/dashboard/driver": { title: "Driver Dashboard", description: DEFAULT_DESCRIPTION },
  "/dashboard/professional": { title: "Professional Dashboard", description: DEFAULT_DESCRIPTION },
  "/dashboard/provider": { title: "Provider Dashboard", description: DEFAULT_DESCRIPTION },
  "/dashboard/agent": { title: "Agent Dashboard", description: DEFAULT_DESCRIPTION },
  "/dashboard/advertiser": { title: "Advertiser Dashboard", description: DEFAULT_DESCRIPTION },
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
    };
  }
  if (pathname.startsWith("/provider/")) {
    return {
      title: "Provider Details",
      description: "View provider details, services and booking options on AG8TE.",
    };
  }
  if (pathname.startsWith("/ads/ad/")) {
    return {
      title: "Ad Details",
      description: "View this local marketplace listing on AG8TE.",
    };
  }
  if (pathname.startsWith("/book/")) {
    return { title: "Book Service", description: "Book a service on AG8TE.", index: false };
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
      title: "Page Not Found | AG8TE",
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
