import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import PrivateRoute from "@/components/PrivateRoute";
import PaymentGate from "@/components/PaymentGate";
import ScrollToTop from "@/components/ScrollToTop";
import {
  configureNativeChrome,
  isNativeApp,
  resolveAppReturnPath,
} from "@/lib/native";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Services = lazy(() => import("./pages/Services"));
const Transport = lazy(() => import("./pages/Transport"));
const Professionals = lazy(() => import("./pages/Professionals"));
const Profile = lazy(() => import("./pages/Profile"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const ProviderDetails = lazy(() => import("./pages/ProviderDetails"));
const About = lazy(() => import("./pages/About"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const BookService = lazy(() => import("./pages/BookService"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Advertise = lazy(() => import("./pages/Advertise"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const DriverDashboard = lazy(() => import("./pages/dashboards/driver/DriverDashboard"));
const ProfessionalDashboard = lazy(() => import("./pages/dashboards/professional/ProfessionalDashboard"));
const ServiceProviderDashboard = lazy(() => import("./pages/dashboards/service-provider/ServiceProviderDashboard"));
const AgentDashboard = lazy(() => import("./pages/dashboards/agent/AgentDashboard"));
const AdvertiserDashboard = lazy(() => import("./pages/dashboards/advertiser/AdvertiserDashboard"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus"));
const PaymentError = lazy(() => import("./pages/PaymentError"));
const Checkout = lazy(() => import("./pages/Checkout"));
const ShoppingHistory = lazy(() => import("./pages/ShoppingHistory"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const MarketplaceAdDetails = lazy(() => import("./pages/MarketplaceAdDetails"));
const PostAd = lazy(() => import("./pages/PostAd"));
const Ads = lazy(() => import("./pages/Ads"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="flex items-center gap-3 text-slate-600">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-sm font-medium">Loading page...</span>
    </div>
  </div>
);

const NativeAppBoot = () => {
  useEffect(() => {
    configureNativeChrome();
  }, []);

  return null;
};

const NativeAppLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp) return;

    let cancelled = false;
    let listener: { remove: () => Promise<void> } | undefined;

    const handleIncomingUrl = async (incomingUrl?: string | null) => {
      if (!incomingUrl) return;

      const returnPath = resolveAppReturnPath(incomingUrl);
      if (!returnPath || cancelled) return;

      try {
        await Browser.close();
      } catch (error) {
        // Browser.close is a no-op on some platforms if no browser is open.
      }

      navigate(returnPath, { replace: true });
    };

    const registerListener = async () => {
      try {
        const launchUrl = await CapacitorApp.getLaunchUrl();
        await handleIncomingUrl(launchUrl?.url);

        listener = await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
          void handleIncomingUrl(url);
        });
      } catch (error) {
        console.warn("Failed to register native app URL handler:", error);
      }
    };

    void registerListener();

    return () => {
      cancelled = true;
      if (listener) {
        void listener.remove();
      }
    };
  }, [navigate]);

  return null;
};

const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <NativeAppBoot />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NativeAppLinkHandler />
          <ScrollToTop />
          <AuthProvider>
            <CartProvider>
              <Suspense fallback={<RouteFallback />}>
                <PaymentGate>
                  <Routes>
                  {/* ── Public routes ─────────────────────────────── */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/shop/product/:id" element={<ProductDetails />} />
                  <Route path="/provider/:category/:id" element={<ProviderDetails />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/cookies" element={<Cookies />} />
                  <Route path="/payment-error" element={<PaymentError />} />
                  <Route path="/advertise" element={<Advertise />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/ads" element={<Ads />} />
                  <Route path="/ads/ad/:id" element={<MarketplaceAdDetails />} />

                  {/* ── Auth-required routes ───────────────────────── */}
                  <Route path="/services" element={
                    <PrivateRoute>
                      <Services />
                    </PrivateRoute>
                  } />
                  <Route path="/transport" element={
                    <PrivateRoute>
                      <Transport />
                    </PrivateRoute>
                  } />
                  <Route path="/professionals" element={
                    <PrivateRoute>
                      <Professionals />
                    </PrivateRoute>
                  } />
                  <Route path="/my-bookings" element={
                    <PrivateRoute>
                      <MyBookings />
                    </PrivateRoute>
                  } />
                  <Route path="/book/:category/:id" element={
                    <PrivateRoute>
                      <BookService />
                    </PrivateRoute>
                  } />
                  <Route path="/checkout" element={
                    <PrivateRoute>
                      <Checkout />
                    </PrivateRoute>
                  } />
                  <Route path="/shopping-history" element={
                    <PrivateRoute>
                      <ShoppingHistory />
                    </PrivateRoute>
                  } />
                  <Route path="/payment-status" element={
                    <PaymentStatus />
                  } />
                  <Route path="/profile" element={
                    <PrivateRoute>
                      <Profile />
                    </PrivateRoute>
                  } />
                  <Route path="/ads/post" element={
                    <PrivateRoute>
                      <PostAd />
                    </PrivateRoute>
                  } />

                  {/* ── Role-specific dashboards ───────────────────── */}
                  <Route path="/dashboard/driver" element={
                    <PrivateRoute roles={["driver", "admin"]}>
                      <DriverDashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/dashboard/professional" element={
                    <PrivateRoute roles={["professional", "admin"]}>
                      <ProfessionalDashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/dashboard/provider" element={
                    <PrivateRoute roles={["service-provider", "admin"]}>
                      <ServiceProviderDashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/dashboard/agent" element={
                    <PrivateRoute roles={["agent", "admin"]}>
                      <AgentDashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/dashboard/advertiser" element={
                    <PrivateRoute>
                      <AdvertiserDashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/admin" element={
                    <PrivateRoute roles={["admin"]}>
                      <AdminDashboard />
                    </PrivateRoute>
                  } />

                  {/* ── 404 ───────────────────────────────────────── */}
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </PaymentGate>
              </Suspense>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
);

export default App;
