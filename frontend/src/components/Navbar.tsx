import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpeg";
import LoginRequiredModal from "./LoginRequiredModal";
import CartDrawer from "./CartDrawer";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "Request Cab", to: "/transport", requiresAuth: true },
  { label: "Professionals", to: "/professionals", requiresAuth: true },
  { label: "Services", to: "/services", requiresAuth: true },
  { label: "Adverts", to: "/ads" }
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { count } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const getNavLinks = () => {
    const links = [...navLinks];
    if (isAuthenticated) {
      if (user?.role === "client") links.push({ label: "My Bookings", to: "/my-bookings", requiresAuth: true });
      else if (user?.role === "driver") links.push({ label: "Account Management", to: "/dashboard/driver", requiresAuth: true });
      else if (user?.role === "professional") links.push({ label: "Account Management", to: "/dashboard/professional", requiresAuth: true });
      else if (user?.role === "service-provider") links.push({ label: "Account Management", to: "/dashboard/provider", requiresAuth: true });
      else if (user?.role === "agent") links.push({ label: "Account Management", to: "/dashboard/agent", requiresAuth: true });
      else if (user?.role === "admin") links.push({ label: "Admin Console", to: "/admin", requiresAuth: true });
    }
    return links;
  };

  const dynamicLinks = getNavLinks();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  const isHome = location.pathname === "/";
  const isTransparent = isHome && !scrolled;

  const handleNavLinkClick = (e: React.MouseEvent, link: typeof navLinks[0]) => {
    if (link.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      setIsAuthModalOpen(true);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || !isHome
          ? "bg-white border-b border-slate-100 py-3 shadow-sm"
          : "bg-slate-900/40 backdrop-blur-md py-4 border-b border-white/10"
      )}
    >
      <nav className="container mx-auto flex items-center justify-between px-6">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 group"
        >
          <div className={cn(
            "h-8 w-auto flex items-center justify-center overflow-hidden rounded-lg transition-all",
            isTransparent ? "" : "bg-primary/10 px-1.5"
          )}>
            <img
              src={logo}
              alt="MzansiServe"
              className={cn(
                "h-full w-auto object-contain",
                isTransparent ? "brightness-0 invert" : ""
              )}
            />
          </div>
          <span className={cn(
            "text-[17px] font-semibold tracking-tight transition-colors",
            isTransparent ? "text-white" : "text-[#222222]"
          )}>
            MzansiServe
          </span>
        </button>

        {/* ── Desktop nav links (centred) ──────────────────────────────────── */}
        <ul className="hidden items-center gap-1 lg:flex absolute left-1/2 -translate-x-1/2">
          {dynamicLinks.map(link => (
            <li key={link.label}>
              <Link
                to={link.to}
                onClick={(e) => handleNavLinkClick(e, link)}
                className={cn(
                  "px-4 py-2 text-[13px] font-medium transition-all rounded-full",
                  location.pathname === link.to
                    ? isTransparent
                      ? "text-white bg-white/20"
                      : "text-[#222222] bg-slate-100"
                    : isTransparent
                      ? "text-white/90 hover:text-white hover:bg-white/10"
                      : "text-[#484848] hover:bg-slate-50 hover:text-[#222222]"
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Desktop right: cart + auth ───────────────────────────────────── */}
        <div className="hidden items-center gap-3 lg:flex">
          {/* Cart */}
          <CartDrawer>
            <div className="relative cursor-pointer">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full w-10 h-10",
                  isTransparent
                    ? "text-white hover:bg-white/10"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <ShoppingCart className="h-[18px] w-[18px]" />
              </Button>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                  {count}
                </span>
              )}
            </div>
          </CartDrawer>

          {isAuthenticated ? (
            /* Logged-in pill */
            <div className={cn(
              "flex items-center gap-1 pl-3 border-l",
              isTransparent ? "border-white/20" : "border-slate-200"
            )}>
              <Link
                to="/profile"
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer hover:shadow-md",
                  isTransparent
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white border-slate-200 text-[#222222]"
                )}
              >
                {user?.profile_image_url ? (
                  <img
                    src={getImageUrl(user.profile_image_url)}
                    className="h-5 w-5 rounded-full object-cover"
                    alt=""
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="text-[13px] font-medium">{user?.name?.split(" ")[0]}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className={cn(
                  "rounded-full w-9 h-9",
                  isTransparent ? "text-white hover:bg-white/10" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* Guest auth buttons — Airbnb pill pattern */
            <div className={cn(
              "flex items-center gap-1 rounded-full border transition-all shadow-sm hover:shadow-md cursor-pointer select-none",
              isTransparent
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white border-slate-200 text-[#222222]"
            )}>
              <Link
                to="/login"
                className={cn(
                  "px-4 py-2 text-[13px] font-medium transition-colors rounded-full",
                  isTransparent ? "hover:bg-white/10" : "hover:bg-slate-50"
                )}
              >
                Log in
              </Link>
              <span className={cn("w-px h-4", isTransparent ? "bg-white/20" : "bg-slate-200")} />
              <Link
                to="/register"
                className={cn(
                  "px-4 py-2 text-[13px] font-medium transition-colors rounded-full",
                  isTransparent ? "hover:bg-white/10" : "hover:bg-slate-50"
                )}
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* ── Mobile toggle ────────────────────────────────────────────────── */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            "lg:hidden rounded-full p-2 transition-colors border",
            isTransparent
              ? "text-white border-white/30 hover:bg-white/10"
              : "text-[#222222] border-slate-200 hover:bg-slate-50"
          )}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* ── Mobile menu ──────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="bg-white lg:hidden border-t border-slate-100 animate-in slide-in-from-top duration-200">
          <div className="container mx-auto flex flex-col gap-1 px-6 py-6">
            {dynamicLinks.map(link => (
              <Link
                key={link.label}
                to={link.to}
                onClick={(e) => handleNavLinkClick(e, link)}
                className={cn(
                  "rounded-xl px-4 py-3 text-[15px] font-medium transition-all",
                  location.pathname === link.to
                    ? "text-[#222222] bg-slate-100"
                    : "text-[#484848] hover:bg-slate-50"
                )}
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl font-medium border-slate-200 text-[#222222]"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Log Out
                </Button>
              ) : (
                <>
                  <Link to="/login" className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl font-medium border-slate-200 text-[#222222]"
                    >
                      Log In
                    </Button>
                  </Link>
                  <Link to="/register" className="flex-1">
                    <Button className="w-full rounded-xl font-semibold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20">
                      Register
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <LoginRequiredModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
};

export default Navbar;
