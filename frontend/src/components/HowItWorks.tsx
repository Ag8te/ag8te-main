import { Search, CalendarCheck, Smile } from "lucide-react";

const steps = [
  {
    title: "Find a Service",
    description: "Search for trusted providers near you.",
    icon: Search,
  },
  {
    title: "Book & Pay",
    description: "Schedule and pay securely online.",
    icon: CalendarCheck,
  },
  {
    title: "Get It Done",
    description: "Enjoy quality service from verified providers.",
    icon: Smile,
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-4 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-md mx-auto mb-4">
          <h2 className="text-3xl font-bold text-gray-900">
            How It Works
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Find, book, and enjoy trusted services in three simple steps.
          </p>
        </div>

      <div className="grid grid-cols-3 gap-3">
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <div
              key={step.number}
              className="relative flex flex-col items-center text-center p-2"
            >
              <div className="absolute top-0 right-0 text-[10px] font-semibold text-primary">
                {step.number}
              </div>

              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>

              <h3 className="text-xs font-medium leading-tight">
                {step.title}
              </h3>
            </div>
          );
        })}
      </div>
      </div>
    </section>
  );
};