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
    return ( <div className="h-[280px] w-full bg-slate-900 animate-pulse sm:h-[380px] lg:h-[550px]" /> );
  }

  const slide = slides[current];
  const IconComponent = iconMap[slide.badge || "Shop"] || ShoppingBag;

  return (
   <section id="home"  className="relative h-[270px] w-full overflow-hidden sm:h-[350px] lg:h-[500px]">
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
      <div className="relative z-10 flex h-full items-center py-4 sm:py-8 lg:py-12">
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
                className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-xl border border-white/10"
              >
                <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center">
                  <IconComponent className="h-3 w-3 text-white" />
                </div>
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white">{slide.badge}</span>
              </motion.div>

              <div className="mb-2 text-xl font-bold leading-tight text-white sm:text-3xl lg:text-5xl tracking-tight whitespace-pre-line" >
                {slide.title}
              </div>

              <p className="mb-3 max-w-md text-xs text-white/90 leading-relaxed sm:mb-6 sm:text-base">
                {slide.subtitle}
              </p>

              <div className="flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-5">
                {slide.cta_text && (
                  <Button
                    size="lg"
                    className={cn(
                      "h-9 w-full px-4 rounded-lg text-white font-semibold text-xs sm:h-12 sm:w-auto sm:px-8 sm:text-sm",
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
                    className="h-9 w-full border-white/30 text-white
                    bg-white/5 px-4 rounded-lg backdrop-blur-md
                    text-xs sm:h-12 sm:w-auto sm:px-8 sm:text-sm"
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
          <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between gap-4 sm:bottom-4 sm:left-auto sm:right-6 lg:bottom-6 lg:right-8">
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
                className="group flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-xl transition-all hover:bg-black/30 active:scale-95 sm:h-12 sm:w-12 sm:hover:scale-105"
                aria-label="Previous slide"
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={next}
                className="group flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-xl transition-all hover:bg-black/30 active:scale-95 sm:h-12 sm:w-12 sm:hover:scale-105"
                aria-label="Next slide"
              >
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default HeroCarousel;
