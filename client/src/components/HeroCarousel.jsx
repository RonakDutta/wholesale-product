import React, { useState, useEffect } from "react";
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
        "https://images.unsplash.com/photo-1586528116311-ad8ed745120c?q=80&w=2070&auto=format&fit=crop",
    },
    {
      badge: "Dynamic Pricing",
      title: "Maximize Your Profit Margins",
      description:
        "Our localized supply and demand algorithm ensures you get the most competitive rates in your region.",
      buttonText: "View Live Rates",
      image:
        "https://images.unsplash.com/photo-1504642252876-db9310636cc6?q=80&w=2070&auto=format&fit=crop",
    },
    {
      badge: "Direct Payments",
      title: "Zero Friction UPI Checkout",
      description:
        "Settle invoices instantly with integrated UPI payments directly to your suppliers' accounts.",
      buttonText: "Setup Payment",
      image:
        "https://images.unsplash.com/photo-1553413077-208172c918a2?q=80&w=2070&auto=format&fit=crop",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="w-full rounded-md mb-6 relative overflow-hidden shadow-sm h-100 sm:h-87.5">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out flex flex-col justify-center ${
            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-espresso/75"></div>

          <div className="relative z-20 px-6 sm:px-10 max-w-2xl">
            <span className="text-clay font-bold text-xs sm:text-sm uppercase tracking-wider mb-2 block">
              {slide.badge}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black leading-tight mb-4 text-cream">
              {slide.title}
            </h1>
            <p className="text-sm sm:text-base text-cream/90 mb-6">
              {slide.description}
            </p>
            <button className="flex items-center justify-center sm:justify-start gap-2 bg-clay text-cream px-5 py-2.5 rounded-sm font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer w-full sm:w-auto">
              {slide.buttonText}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              index === currentSlide
                ? "bg-clay w-6"
                : "bg-cream/50 hover:bg-cream"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
