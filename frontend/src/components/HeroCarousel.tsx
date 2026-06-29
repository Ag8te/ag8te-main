import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Car, Briefcase, Wrench, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { apiFetch, API_BASE_URL, getImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

// Mapping logical badge/types to appropriate Lucide icons
const iconMap: Record<string, any> = {
  "Transport": Car,
  "Professionals": Briefcase,
  "Services": Wrench,
  "Shop": ShoppingBag,
};

// Fallback layout config if nothing is defined per slide
const defaultColor = "bg-primary shadow-lg";

interface SlideData {
  id: string;
  image_url: string;
  cta_link: string | null;
  cta_text: string | null;
  order: number;
  badge?: string;
  title?: string;
  subtitle?: string;
  ctaColor?: string;
  learnMore?: string;
}

const HeroCarousel = () => {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();

  const next = useCallback(() => {
    if (slides.length === 0) return;
    setDirection(1);
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    if (slides.length === 0) return;
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const res = await apiFetch("/api/public/carousel");
        if (res?.success && res.data?.items?.length > 0) {
          // Enrich data with frontend specifics based on available content or defaults
          const enrichedSlides = res.data.items.map((item: any) => {
            return {
              ...item,
              badge: item.badge || "Highlight",
              title: item.title || "MzansiServe\nMarketplace",
              subtitle: item.subtitle || "Connecting South Africa to reliable services and products.",
              ctaColor: item.cta_color || defaultColor,
              learnMore: item.cta_link || "/"
            };
          });
          setSlides(enrichedSlides);
        }
      } catch (err) {
        console.error("Failed to load carousel slides:", err);
      }
    };
    fetchSlides();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  if (slides.length === 0) {
    return <div className="mobile-app-hero-loading h-[640px] w-full bg-slate-900 animate-pulse sm:h-[700px] lg:h-[850px]" />;
  }

  const slide = slides[current];
  const IconComponent = iconMap[slide.badge || "Shop"] || ShoppingBag;

  return (
    <section id="home" className="mobile-app-hero relative h-[720px] w-full overflow-hidden sm:h-[760px] lg:h-[850px]">
      {/* Background images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img
            src={getImageUrl(slide.image_url)}
            alt={slide.badge || 'Slide'}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="mobile-app-hero-content relative z-10 flex h-full items-center pb-24 pt-6 sm:pb-28 lg:pb-40 lg:pt-0">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl"
            >
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mb-4 inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 backdrop-blur-xl border border-white/10 shadow-2xl sm:mb-8 sm:px-5"
              >
                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                  <IconComponent className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white">{slide.badge}</span>
              </motion.div>

              <h1 className="mb-4 text-4xl font-bold leading-[1.08] text-white sm:mb-8 sm:text-6xl lg:text-7xl tracking-tighter whitespace-pre-line drop-shadow-sm">
                {slide.title}
              </h1>

              <p className="mb-6 max-w-lg text-base text-white/90 font-medium leading-relaxed drop-shadow-sm sm:mb-12 sm:text-xl">
                {slide.subtitle}
              </p>

              <div className="flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-5">
                {slide.cta_text && (
                  <Button
                    size="lg"
                    className={cn(
                      "h-12 w-full px-6 rounded-lg text-white font-bold text-base shadow-2xl transition-all active:scale-95 border-none sm:h-16 sm:w-auto sm:rounded-2xl sm:px-10 sm:text-lg sm:hover:-translate-y-1",
                      slide.ctaColor || "bg-primary"
                    )}
                    onClick={() => navigate(slide.cta_link || '/')}
                  >
                    {slide.cta_text}
                  </Button>
                )}
                {slide.learnMore && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full border-white/30 text-white bg-white/5 hover:bg-white/10 px-6 rounded-lg backdrop-blur-md transition-all font-bold text-base border-2 sm:h-16 sm:w-auto sm:rounded-2xl sm:px-10 sm:text-lg"
                    onClick={() => navigate(slide.learnMore || '/')}
                  >
                    Explore Details
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          {/* Navigation controls - Refined Minimal Style */}
          <div className="mobile-app-hero-controls absolute bottom-6 left-6 right-6 z-20 flex items-center justify-between gap-4 sm:bottom-10 sm:left-auto sm:right-8 lg:bottom-32 lg:right-12">
            <div className="flex gap-2 sm:mr-4">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > current ? 1 : -1);
                    setCurrent(idx);
                  }}
                  className={cn(
                    "h-1.5 transition-all duration-500 rounded-full",
                    current === idx ? "w-8 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50"
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={prev}
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-xl transition-all hover:bg-black/30 active:scale-95 sm:h-12 sm:w-12 sm:hover:scale-105"
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={next}
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-xl transition-all hover:bg-black/30 active:scale-95 sm:h-12 sm:w-12 sm:hover:scale-105"
                aria-label="Next slide"
              >
                <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default HeroCarousel;
