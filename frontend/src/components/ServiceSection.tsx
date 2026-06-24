import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car, Truck, Bike, Bus, Star, Users,
  Scale, Stethoscope, Calculator, HardHat,
  Home, Sparkles, UtensilsCrossed, Music,
  ShoppingBag, Shirt, Smartphone, Gift,
  ArrowRight, Briefcase, Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface ServiceCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface ServiceSectionProps {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  cards: ServiceCard[];
  accentClass: string;
  badgeClass: string;
  link: string;
}

// Icon mapping helpers
const transportIcons: Record<string, LucideIcon> = {
  'sedan': Car,
  'bakkie': Truck,
  'minibus': Bus,
  'bike': Bike
};

const profIcons: Record<string, LucideIcon> = {
  'legal': Scale,
  'medical': Stethoscope,
  'financial': Calculator,
  'engineering': HardHat
};

const serviceIcons: Record<string, LucideIcon> = {
  'home': Home,
  'health': Sparkles,
  'catering': UtensilsCrossed,
  'events': Music
};

const shopIcons: Record<string, LucideIcon> = {
  'fashion': Shirt,
  'electronics': Smartphone,
  'gifts': Gift,
  'home': Home
};

const getIcon = (name: string | undefined, mapping: Record<string, LucideIcon>, fallback: LucideIcon): LucideIcon => {
  if (!name) return fallback;
  const lowerName = name.toLowerCase();
  for (const [key, icon] of Object.entries(mapping)) {
    if (lowerName.includes(key)) return icon;
  }
  return fallback;
};

const SectionBlock = ({ section, index }: { section: ServiceSectionProps; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  return (
    <section
      ref={ref}
      className={`py-2 lg:py-4 ${index % 2 === 1 ? "bg-secondary/30" : ""}`}
    >
      <div className="container mx-auto px-3 lg:px-6">
        <motion.div className="mb-3 flex items-end justify-between">
          <div className="max-w-2xl">
            <span
              className={`mb-1 inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${section.badgeClass}`}
            >
              {section.badge}
            </span>
            <h2 className="mb-1 text-xl font-bold lg:text-2xl">
              {section.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {section.subtitle}
            </p>
          </div>
          <Button
            variant="ghost"
            className="hidden lg:flex items-center gap-2 text-primary"
            onClick={() => navigate(section.link)}
          >
            View All <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>

        <div
          className={`grid grid-cols-3 gap-2 ${section.id === "transport" || section.id === "shop" ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
        >
          {section.cards.map((card, i) => (
            <motion.div
              key={card.title}
            className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-100 bg-white p-2 shadow-sm transition-all duration-300 active:scale-95 text-center"
              onClick={() => navigate(section.link)}
            >
              <div
              className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 border border-blue-200 mx-auto"
              >
               <card.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-[#222222] leading-tight">
                {card.title}
              </h3>

            </motion.div>
          ))}
        </div>

        {/* Mobile View All */}
       <div className="mt-3 text-center lg:hidden">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(section.link)}
          >
            View All {section.badge} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

const ServiceSections = () => {
  const [sections, setSections] = useState<ServiceSectionProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        // Fetch dynamic data
        // Note: For 'transport', we don't have a specific endpoint yet, so we use static fallbacks mixed with dynamic where available
        const serviceTypesRes = await apiFetch("/api/auth/service-types");
        const shopCatRes = await apiFetch("/api/shop/categories");

        const serviceTypes = serviceTypesRes?.data?.service_types || [];
        const shopCategories = shopCatRes?.data?.categories || [];

        // Filter service types
        const profTypes = serviceTypes.filter((s: any) => s.category === 'Professional').slice(0, 4);
        const spTypes = serviceTypes.filter((s: any) => s.category === 'Service Provider').slice(0, 4);
        const shopCats = shopCategories.slice(0, 4);


        const dynamicSections: ServiceSectionProps[] = [
          {
            id: "transport",
            badge: "Transport & Drivers",
            title: "Get Moving with Verified Drivers",
            subtitle:
              "Choose from a range of vehicles and verified drivers across South Africa.",
            accentClass: "group-hover:text-primary",
            badgeClass: "bg-primary/10 text-primary",
            link: "/transport",
            cards: [
              {
                icon: Car,
                title: "Hatchback",
                description:
                  "Affordable compact rides for quick city trips. Fits up to 3 passengers.",
              },
              {
                icon: Car,
                title: "Sedan",
                description:
                  "Our most popular ride. Comfortable everyday travel for up to 4 passengers.",
              },
              {
                icon: Star,
                title: "Luxury / SUV",
                description:
                  "Travel in style with premium high-end vehicles for up to 4 passengers.",
              },
              {
                icon: Truck,
                title: "Bakkie",
                description:
                  "Versatile and practical. Great for transporting goods and cargo.",
              },
              {
                icon: Users,
                title: "Minibus",
                description:
                  "Best for small group travel. Comfortable 9-seater transport.",
              },
              {
                icon: Users,
                title: "Van",
                description:
                  "6-seater van with extra space. Perfect for passengers and luggage.",
              },
            ],
          },
          {
            id: "professionals",
            badge: "Freelancers & Professional Services",
            title: "Hire Accredited Experts",
            subtitle: "All professionals are verified. Quality you can trust.",
            accentClass: "group-hover:text-sa-blue",
            badgeClass: "bg-sa-blue/10 text-sa-blue",
            link: "/professionals",
            cards:
              profTypes.length > 0
                ? profTypes.map((t: any) => ({
                    icon: getIcon(t.name, profIcons, Briefcase),
                    title: t.name,
                    description: t.description || `Expert ${t.name} services.`,
                  }))
                : [
                    {
                      icon: Scale,
                      title: "Legal Experts",
                      description:
                        "Lawyers, conveyancers, and compliance consultants.",
                    },
                    {
                      icon: Stethoscope,
                      title: "Medical Professionals",
                      description:
                        "Doctors, nurses, psychologists, and therapists.",
                    },
                    {
                      icon: Calculator,
                      title: "Financial Services",
                      description:
                        "Accountants, actuaries, tax advisors, and auditors.",
                    },
                    {
                      icon: HardHat,
                      title: "Engineering & Construction",
                      description:
                        "Engineers, architects, project managers, and builders.",
                    },
                  ],
          },
          {
            id: "services",
            badge: "Home & Service Providers",
            title: "Services at Your Doorstep",
            subtitle:
              "From home repairs to event planning, find trusted service providers for every need.",
            accentClass: "group-hover:text-accent",
            badgeClass: "bg-accent/15 text-accent-foreground",
            link: "/services",
            cards:
              spTypes.length > 0
                ? spTypes.map((t: any) => ({
                    icon: getIcon(t.name, serviceIcons, Wrench),
                    title: t.name,
                    description: t.description || `Trusted ${t.name} services.`,
                  }))
                : [
                    {
                      icon: Home,
                      title: "Home & Garden",
                      description:
                        "Cleaning, plumbing, electrical, garden maintenance, and more.",
                    },
                    {
                      icon: Sparkles,
                      title: "Health & Beauty",
                      description:
                        "Salons, personal trainers, spa treatments, and wellness.",
                    },
                    {
                      icon: UtensilsCrossed,
                      title: "Catering & Chefs",
                      description:
                        "Private chefs, catering for events, and meal prep services.",
                    },
                    {
                      icon: Music,
                      title: "Events & Entertainment",
                      description:
                        "DJs, event managers, sound rental, and venue booking.",
                    },
                  ],
          },
          {
            id: "shop",
            badge: "E-Commerce ads",
            title: "Shop Online",
            subtitle: "We deliver to your doorstep.",
            accentClass: "group-hover:text-sa-red",
            badgeClass: "bg-sa-red/10 text-sa-red",
            link: "/shop",
            cards:
              shopCats.length > 0
                ? shopCats.map((c: any) => ({
                    icon: getIcon(c.title, shopIcons, ShoppingBag),
                    title: c.title,
                    description:
                      c.description || `Discover ${c.title} products.`,
                  }))
                : [
                    {
                      icon: ShoppingBag,
                      title: "Fashion & Accessories",
                      description:
                        "Clothing, shoes, bags, and jewellery from local brands.",
                    },
                    {
                      icon: Smartphone,
                      title: "Electronics & Tech",
                      description:
                        "Gadgets, phones, laptops, and tech accessories.",
                    },
                    {
                      icon: Gift,
                      title: "Gifts & Handmade",
                      description:
                        "Unique handcrafted goods and personalised gifts.",
                    },
                    {
                      icon: Shirt,
                      title: "Home & Living",
                      description:
                        "Furniture, décor, kitchen essentials, and appliances.",
                    },
                    {
                      icon: UtensilsCrossed,
                      title: "Groceries",
                      description:
                        "Fresh produce, pantry staples, and everyday essentials delivered to your door.",
                    },
                  ],
          },
        ];

        setSections(dynamicSections);
      } catch (error) {
        console.error("Failed to load dynamic sections:", error);
        setSections([]); // Will fallback to static inside map if needed, or handle empty state
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <>
      {sections.map((section, index) => (
        <SectionBlock key={section.id} section={section} index={index} />
      ))}
    </>
  );
};

export default ServiceSections;
