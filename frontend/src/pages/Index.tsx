import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";
import { QuickActionGrid } from "@/components/QuickActionGrid";
import { HowItWorks } from "@/components/HowItWorks";
import WhySection from "@/components/WhySection";
import ServiceSections from "@/components/ServiceSection";
import FeaturedProducts from "@/components/FeaturedProducts";
import { TopProviders } from "@/components/TopProviders";
import TestimonialsSection from "@/components/TestimonialsSection";
import { MobileAppPromo } from "@/components/MobileAppPromo";
import CTABanner from "@/components/CTABanner";
import ReachMillionsSection from "@/components/ReachMillionsSection";
import Footer from "@/components/Footer";
import { AdBanner } from "@/components/AdBanner";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "error") {
      navigate("/payment-error", { replace: true });
    }
  }, [location, navigate]);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <HeroCarousel />

      <div className="relative z-20 mb-10 px-4 pt-6 sm:px-6 lg:-mt-24 lg:mb-12 lg:pt-0">
        <div className="container mx-auto max-w-7xl">
          <QuickActionGrid />

          <div className="mt-8 md:mt-10 max-w-5xl mx-auto">
            <AdBanner placementSection="homepage_hero" className="aspect-[21/9] md:aspect-[4/1] w-full" />
          </div>
        </div>
      </div>

      <div className="space-y-8 pb-8">
        {/* Credibility & Process */}
        <HowItWorks />

        {/* Trust & Discovery Sequence */}
        <WhySection />

        <ServiceSections />

        <FeaturedProducts />

        {/* Social Proof & Professionals */}
        <TopProviders />

        <TestimonialsSection />

        {/* Mobile & Final CTA */}
        <MobileAppPromo />

        <CTABanner />
        <ReachMillionsSection />
      </div>

      <Footer />
    </main>
  );
};

export default Index;
