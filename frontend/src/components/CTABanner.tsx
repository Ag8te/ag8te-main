import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CTABanner = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  return (
    <section ref={ref} className="py-4 sm:py-12">
      <div className="container mx-auto px-6">
        <motion.div
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-primary/5 to-primary/5 p-5 sm:p-8 lg:p-16"
        >
          {/* Dot pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%2314B8A6\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <motion.h2
              className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-[#222222] mb-2 sm:mb-4"
            >
              Ready to Get <span className="text-primary">Started?</span>
            </motion.h2>
            <motion.p
              className="hidden sm:block text-lg md:text-xl text-slate-600 font-normal leading-relaxed mb-10"
            >
              Join thousands of South Africans already using AG8TE.{" "}
              <br className="hidden md:block" />
              Sign up today and get access to verified services across the country.
            </motion.p>

            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 mt-4 sm:mt-0">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-4 sm:px-10 sm:py-7 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 group"
                onClick={() => navigate("/register")}
              >
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary font-semibold px-6 py-4 sm:px-10 sm:py-7 rounded-xl transition-all"
                onClick={() => navigate("/services")}
              >
                Become a Provider
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTABanner;
