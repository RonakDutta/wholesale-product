import React from "react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative bg-blue-800 pt-16 pb-24 md:pt-24 md:pb-36 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-12 md:gap-8">
          <div className="w-full md:w-1/2 text-center md:text-left mt-8 md:mt-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6">
              Bulk Sourcing, <br className="hidden md:block" />
              Delivered Direct.
            </h1>
            <p className="text-md md:text-lg text-blue-200 mb-8 max-w-xl mx-auto md:mx-0">
              Access premium wholesale inventory with dynamic pricing tailored
              to your location. Secure UPI payments and seamless supplier
              communication.
            </p>
            <Link
              to="/catalog"
              className="inline-block bg-white text-blue-900 font-bold text-lg px-8 py-3 rounded-full shadow-lg hover:bg-blue-50 hover:shadow-xl transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
            >
              Shop now
            </Link>
          </div>

          <div className="w-full md:w-1/2 flex justify-center relative">
            <div className="relative w-64 h-64 md:w-80 md:h-80 bg-blue-700 rounded-full flex items-center justify-center border-4 border-blue-600 shadow-2xl z-10">
              <span className="text-8xl md:text-9xl">📦</span>

              <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-blue-500 w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center transform -rotate-12 shadow-xl border border-blue-400 z-20">
                <span className="text-4xl md:text-5xl">🏷️</span>
              </div>

              <div className="absolute -top-2 -right-2 md:-top-4 md:-right-4 bg-blue-600 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transform rotate-12 shadow-xl border border-blue-500 z-0">
                <span className="text-3xl md:text-4xl">🤝</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full leading-none z-0">
        <svg
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          className="w-full h-12 md:h-24 text-slate-50 fill-current block"
        >
          <path d="M0,100 L1440,100 L1440,0 C960,120 480,120 0,0 Z" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
