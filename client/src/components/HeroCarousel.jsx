import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      badge: "B2B Marketplace",
      title: "Source Wholesale Products Instantly",
      description:
        "Connect directly with verified suppliers. Get real-time dynamic pricing based on your location and market demand.",
      buttonText: "Explore Catalog",
      image:
        "https://images.pexels.com/photos/2199293/pexels-photo-2199293.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    },
    {
      badge: "Dynamic Pricing",
      title: "Maximize Your Profit Margins",
      description:
        "Our localized supply and demand algorithm ensures you get the most competitive rates in your region.",
      buttonText: "View Live Rates",
      image:
        "https://images.pexels.com/photos/1214259/pexels-photo-1214259.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    },
    {
      badge: "Direct Payments",
      title: "Zero Friction UPI Checkout",
      description:
        "Settle invoices instantly with integrated UPI payments directly to your suppliers' accounts.",
      buttonText: "Setup Payment",
      image:
        "https://images.pexels.com/photos/6169668/pexels-photo-6169668.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="w-full rounded-2xl mb-2 relative overflow-hidden shadow-xl h-112.5 sm:h-125 bg-espresso">
      {slides.map((slide, index) => {
        const isActive = index === currentSlide;

        return (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-espresso via-espresso/80 to-espresso/20"></div>

            <div className="relative z-20 h-full flex flex-col justify-center px-6 sm:px-12 max-w-2xl">
              <span
                className={`inline-block w-fit text-clay font-bold text-xs sm:text-sm uppercase tracking-[0.2em] mb-3 border border-clay/30 px-3 py-1 rounded-full bg-espresso/30 backdrop-blur-sm transition-all duration-700 ease-out delay-100 ${
                  isActive
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                {slide.badge}
              </span>

              <h1
                className={`text-3xl sm:text-5xl font-black leading-tight mb-4 text-cream tracking-tight transition-all duration-700 ease-out delay-200 ${
                  isActive
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                {slide.title}
              </h1>

              <p
                className={`text-sm sm:text-lg text-cream/80 mb-8 max-w-lg leading-relaxed transition-all duration-700 ease-out delay-300 ${
                  isActive
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                {slide.description}
              </p>

              <div
                className={`transition-all duration-700 ease-out delay-400 ${
                  isActive
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                <button className="group flex items-center gap-2 bg-clay text-cream px-6 py-3 rounded-lg font-semibold text-sm hover:bg-cream hover:text-espresso transition-colors duration-300 w-fit cursor-pointer">
                  {slide.buttonText}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              index === currentSlide
                ? "bg-clay w-10"
                : "bg-cream/30 hover:bg-cream/60 w-3"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
