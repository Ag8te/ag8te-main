import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import PrivateRoute from "@/components/PrivateRoute";
import ScrollToTop from "@/components/ScrollToTop";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Services from "./pages/Services";
import Transport from "./pages/Transport";
import Professionals from "./pages/Professionals";
import Profile from "./pages/Profile";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import ProviderDetails from "./pages/ProviderDetails";
import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import BookService from "./pages/BookService";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import Advertise from "./pages/Advertise";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import DriverDashboard from "./pages/dashboards/driver/DriverDashboard";
import ProfessionalDashboard from "./pages/dashboards/professional/ProfessionalDashboard";
import ServiceProviderDashboard from "./pages/dashboards/service-provider/ServiceProviderDashboard";
import AgentDashboard from "./pages/dashboards/agent/AgentDashboard";
import AdvertiserDashboard from "./pages/dashboards/advertiser/AdvertiserDashboard";
import PaymentStatus from "./pages/PaymentStatus";
import PaymentError from "./pages/PaymentError";
import Checkout from "./pages/Checkout";
import ShoppingHistory from "./pages/ShoppingHistory";
import MyBookings from "./pages/MyBookings";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import MarketplaceAdDetails from "./pages/MarketplaceAdDetails";
import PostAd from "./pages/PostAd";
import Ads from "./pages/Ads";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <AuthProvider>
          <CartProvider>
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
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
