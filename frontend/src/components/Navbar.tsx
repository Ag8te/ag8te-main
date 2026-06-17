import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, User, LogOut, Bell } from "lucide-react";
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
  { label: "Request Professionals", to: "/professionals", requiresAuth: true },
  { label: "Request Services", to: "/services", requiresAuth: true },
  { label: "Adverts", to: "/ads" }
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      status: string;
      created_at: string;
    }>
  >([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const { count } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const getNavLinks = () => {
    const links = [...navLinks];

    if (!isAuthenticated) {
      return links;
    }

    if (user?.role === "client") {
      links.push({
        label: "My Bookings",
        to: "/my-bookings",
        requiresAuth: true,
      });
      return links;
    }

    if (["driver", "professional", "service-provider"].includes(user?.role)) {
      links.push({
        label: "My Bookings",
        to: "/my-bookings",
        requiresAuth: true,
      });
    }

    if (user?.role === "driver") {
      links.push({
        label: "Account Management",
        to: "/dashboard/driver",
        requiresAuth: true,
      });
    } else if (user?.role === "professional") {
      links.push({
        label: "Account Management",
        to: "/dashboard/professional",
        requiresAuth: true,
      });
    } else if (user?.role === "service-provider") {
      links.push({
        label: "Account Management",
        to: "/dashboard/provider",
        requiresAuth: true,
      });
    } else if (user?.role === "agent") {
      links.push({
        label: "Dashboard",
        to: "/dashboard/agent",
        requiresAuth: true,
      });
    } else if (user?.role === "admin") {
      links.push({ label: "Admin Console", to: "/admin", requiresAuth: true });
    }

    return links;
  };
  const dynamicLinks = getNavLinks();

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isTransparent = false;

  const handleNavLinkClick = (
    e: React.MouseEvent,
    link: (typeof navLinks)[0],
  ) => {
    if (link.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      setIsAuthModalOpen(true);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch("/api/notifications");
      if (res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (_err) {
      /* fail silently */
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "client") {
      fetchNotifications();
      pollRef.current = setInterval(fetchNotifications, 30000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (notifId: string) => {
    try {
      await apiFetch(`/api/notifications/${notifId}/read`, { method: "PATCH" });
      fetchNotifications();
    } catch (_err) {
      /* fail silently */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "PATCH" });
      fetchNotifications();
    } catch (_err) {
      /* fail silently */
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <header
      className={cn(
        "native-safe-top sticky top-0 left-0 right-0 z-50 border-b border-slate-100 bg-white py-[10px] shadow-sm transition-all duration-300 lg:fixed",
      )}
    >
      <nav className="container mx-auto flex items-center justify-between gap-4 px-6 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate("/")}
          className="group flex shrink-0 items-center gap-2"
        >
          <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/80 bg-white shadow-md transition-all group-hover:shadow-lg lg:h-14 lg:w-16">
            <img
              src={logo}
              alt="MzansiServe"
              className="h-full w-full scale-[1.85] object-cover"
            />
          </div>
          <span className={cn(
            "text-[16px] font-semibold tracking-tight transition-colors lg:text-[17px]",
            isTransparent ? "text-white" : "text-[#222222]"
          )}>
            MzansiServe
          </span>
        </button>

        {/* ── Desktop nav links (centred) ──────────────────────────────────── */}
        <ul className="hidden min-w-0 items-center justify-center gap-0.5 lg:flex">
          {dynamicLinks.map(link => (
            <li key={link.label}>
              <Link
                to={link.to}
                onClick={(e) => handleNavLinkClick(e, link)}
                className={cn(
                  "rounded-full px-2.5 py-2 text-[12px] font-medium transition-all xl:px-4 xl:text-[13px]",
                  location.pathname === link.to
                    ? isTransparent
                      ? "text-white bg-white/20"
                      : "text-[#222222] bg-slate-100"
                    : isTransparent
                      ? "text-white/90 hover:text-white hover:bg-white/10"
                      : "text-[#484848] hover:bg-slate-50 hover:text-[#222222]",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Desktop right: cart + auth ───────────────────────────────────── */}
        <div className="hidden items-center justify-end gap-2 lg:flex">
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
                    : "text-slate-600 hover:bg-slate-50",
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
            <div
              className={cn(
                "flex items-center gap-1 pl-3 border-l",
                isTransparent ? "border-white/20" : "border-slate-200",
              )}
            >
              {user?.role === "client" && (
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className={cn(
                      "relative rounded-full w-9 h-9 flex items-center justify-center transition-colors",
                      isTransparent
                        ? "text-white hover:bg-white/10"
                        : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="text-sm font-semibold text-[#222222]">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                handleMarkRead(n.id);
                                setNotifOpen(false);
                              }}
                              className={cn(
                                "flex gap-3 px-4 py-3 cursor-pointer border-b border-slate-50 hover:bg-slate-50 transition-colors",
                                n.status === "unread"
                                  ? "bg-primary/5"
                                  : "bg-white",
                              )}
                            >
                              <div
                                className={cn(
                                  "mt-1.5 h-2 w-2 rounded-full flex-shrink-0",
                                  n.status === "unread"
                                    ? "bg-primary"
                                    : "bg-transparent",
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "text-[13px] text-[#222222]",
                                    n.status === "unread"
                                      ? "font-semibold"
                                      : "font-normal",
                                  )}
                                >
                                  {n.title}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {n.body}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {timeAgo(n.created_at)}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Link
                to="/profile"
                className={cn(
                  "flex items-center gap-2 rounded-full border px-2.5 py-1.5 transition-all cursor-pointer hover:shadow-md xl:px-3",
                  isTransparent
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white border-slate-200 text-[#222222]",
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
                <span className="hidden text-[13px] font-medium xl:inline">{user?.name?.split(" ")[0]}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className={cn(
                  "rounded-full w-9 h-9",
                  isTransparent
                    ? "text-white hover:bg-white/10"
                    : "text-slate-500 hover:bg-slate-50",
                )}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* Guest auth buttons — Airbnb pill pattern */
            <div
              className={cn(
                "flex items-center gap-1 rounded-full border transition-all shadow-sm hover:shadow-md cursor-pointer select-none",
                isTransparent
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white border-slate-200 text-[#222222]",
              )}
            >
              <Link
                to="/login"
                className={cn(
                  "rounded-full px-3 py-2 text-[12px] font-medium transition-colors xl:px-4 xl:text-[13px]",
                  isTransparent ? "hover:bg-white/10" : "hover:bg-slate-50"
                )}
              >
                Log in
              </Link>
              <span
                className={cn(
                  "w-px h-4",
                  isTransparent ? "bg-white/20" : "bg-slate-200",
                )}
              />
              <Link
                to="/register"
                className={cn(
                  "rounded-full px-3 py-2 text-[12px] font-medium transition-colors xl:px-4 xl:text-[13px]",
                  isTransparent ? "hover:bg-white/10" : "hover:bg-slate-50"
                )}
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* ── Mobile toggle ────────────────────────────────────────────────── */}
        <div className="lg:hidden flex items-center gap-2">
          {/* Bell — clients only, mobile */}
          {isAuthenticated && user?.role === "client" && (
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={cn(
                  "relative rounded-full w-9 h-9 flex items-center justify-center transition-colors border",
                  isTransparent
                    ? "text-white border-white/30 hover:bg-white/10"
                    : "text-[#222222] border-slate-200 hover:bg-slate-50",
                )}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-[#222222]">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            handleMarkRead(n.id);
                            setNotifOpen(false);
                          }}
                          className={cn(
                            "flex gap-3 px-4 py-3 cursor-pointer border-b border-slate-50 hover:bg-slate-50 transition-colors",
                            n.status === "unread" ? "bg-primary/5" : "bg-white",
                          )}
                        >
                          <div
                            className={cn(
                              "mt-1.5 h-2 w-2 rounded-full flex-shrink-0",
                              n.status === "unread"
                                ? "bg-primary"
                                : "bg-transparent",
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-[13px] text-[#222222]",
                                n.status === "unread"
                                  ? "font-semibold"
                                  : "font-normal",
                              )}
                            >
                              {n.title}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {n.body}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {timeAgo(n.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "rounded-full p-2 transition-colors border",
              isTransparent
                ? "text-white border-white/30 hover:bg-white/10"
                : "text-[#222222] border-slate-200 hover:bg-slate-50",
            )}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile menu ──────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="bg-white lg:hidden border-t border-slate-100 animate-in slide-in-from-top duration-200">
          <div className="container mx-auto flex flex-col gap-1 px-6 py-6">
            {dynamicLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={(e) => handleNavLinkClick(e, link)}
                className={cn(
                  "rounded-xl px-4 py-3 text-[15px] font-medium transition-all",
                  location.pathname === link.to
                    ? "text-[#222222] bg-slate-100"
                    : "text-[#484848] hover:bg-slate-50",
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
