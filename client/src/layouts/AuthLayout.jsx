import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Box, Star } from "lucide-react";

const AuthLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";

  const leftPanelRef = useRef(null);
  const shapesRef = useRef(null);
  const glowBlob1Ref = useRef(null);
  const glowBlob2Ref = useRef(null);
  const formContentRef = useRef(null);
  const statSuppliersRef = useRef(null);
  const statProductsRef = useRef(null);
  const statRegionsRef = useRef(null);

  // Left panel entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.to(".brand-top", { y: 0, opacity: 1, duration: 0.6 }, 0.2)
        .to(".brand-center", { y: 0, opacity: 1, duration: 0.7 }, 0.4)
        .to(".brand-bottom", { y: 0, opacity: 1, duration: 0.6 }, 0.7);
    }, leftPanelRef);

    return () => ctx.revert();
  }, []);

  // Counter animation
  useEffect(() => {
    const animateCounter = (el, target, suffix = "") => {
      if (!el.current) return;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 2,
        delay: 0.8,
        ease: "power2.out",
        onUpdate: () => {
          if (el.current) {
            el.current.textContent =
              Math.floor(obj.val).toLocaleString("en-IN") + suffix;
          }
        },
      });
    };

    animateCounter(statSuppliersRef, 240, "+");
    animateCounter(statProductsRef, 500, "+");
    animateCounter(statRegionsRef, 100, "+");
  }, []);

  // Floating shapes
  useEffect(() => {
    const container = shapesRef.current;
    if (!container) return;

    const colors = ["#c56b4a", "#7a8b6f", "#faf6ef"];
    const shapes = [];

    for (let i = 0; i < 12; i++) {
      const shape = document.createElement("div");
      shape.className = "float-shape";
      const size = Math.random() * 6 + 3;
      const color = colors[Math.floor(Math.random() * colors.length)];
      shape.style.cssText = `width:${size}px;height:${size}px;background:${color};left:${Math.random() * 100}%;top:${Math.random() * 100}%;`;
      container.appendChild(shape);
      shapes.push(shape);

      gsap.to(shape, {
        opacity: Math.random() * 0.3 + 0.05,
        duration: Math.random() * 2 + 1,
        delay: Math.random() * 2,
      });
      gsap.to(shape, {
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 80,
        duration: Math.random() * 8 + 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random() * 3,
      });
    }

    return () => {
      shapes.forEach((s) => s.remove());
    };
  }, []);

  // Glow blob parallax
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(glowBlob1Ref.current, {
      x: x * 30,
      y: y * 30,
      duration: 1.2,
      ease: "power2.out",
    });
    gsap.to(glowBlob2Ref.current, {
      x: x * -20,
      y: y * -20,
      duration: 1.2,
      ease: "power2.out",
    });
  };

  // Form content stagger on route change
  useEffect(() => {
    if (formContentRef.current) {
      const elements = formContentRef.current.querySelectorAll(".form-stagger");
      if (elements.length > 0) {
        gsap.fromTo(
          elements,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.06,
            ease: "power2.out",
            delay: 0.15,
          },
        );
      }
    }
  }, [location.pathname]);

  return (
    <main className="min-h-screen flex">
      {/* ====== LEFT PANEL ====== */}
      <div
        ref={leftPanelRef}
        onMouseMove={handleMouseMove}
        className="hidden lg:flex relative w-[55%] bg-espresso grid-pattern overflow-hidden flex-col justify-between px-10 xl:p-14"
      >
        {/* Glow blobs */}
        <div
          ref={glowBlob1Ref}
          className="glow-blob w-75 h-75 bg-clay/15 -top-20 -left-20"
        />
        <div
          ref={glowBlob2Ref}
          className="glow-blob w-62.5 h-62.5 bg-sage/10 bottom-20 right-10"
        />

        {/* Floating shapes */}
        <div
          ref={shapesRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
        />

        {/* Logo */}
        <div
          className="relative z-10 brand-top"
          style={{ opacity: 0, transform: "translateY(20px)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-clay rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-cream" />
            </div>
            <span className="text-cream font-bold font-dmsans text-xl tracking-tight">
              Marketplace
            </span>
          </div>
        </div>

        <div
          className="relative z-10 max-w-md brand-center"
          style={{ opacity: 0, transform: "translateY(30px)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-clay" />
            <span className="text-clay text-xs font-bold uppercase tracking-[0.15em]">
              B2B Wholesale Platform
            </span>
          </div>
          <h1 className="font-raleway text-4xl xl:text-5xl font-black text-cream leading-[1.1] tracking-tight mb-5">
            Source smarter.
            <br />
            <span className="text-clay">Scale faster.</span>
          </h1>
          <p className="text-cream/60 text-sm leading-relaxed font-inter max-w-sm">
            Bridge the gap between retail and wholesale. Connect with verified
            suppliers, access competitive inventory, and settle instantly with
            integrated UPI payments.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-10">
            <div>
              <div
                ref={statSuppliersRef}
                className="text-cream font-dmsans text-2xl font-bold"
              >
                0
              </div>
              <div className="text-cream/50 font-inter text-xs font-medium mt-0.5">
                Verified Suppliers
              </div>
            </div>
            <div>
              <div
                ref={statProductsRef}
                className="text-cream font-dmsans text-2xl font-bold"
              >
                0
              </div>
              <div className="text-cream/50 font-inter text-xs font-medium mt-0.5">
                Products Listed
              </div>
            </div>
            <div>
              <div
                ref={statRegionsRef}
                className="text-cream font-dmsans text-2xl font-bold"
              >
                0
              </div>
              <div className="text-cream/50 font-inter text-xs font-medium mt-0.5">
                Regions Covered
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div
          className="relative z-10 brand-bottom"
          style={{ opacity: 0, transform: "translateY(20px)" }}
        >
          <div className="bg-cream/5 border border-cream/10 rounded-xl p-5 backdrop-blur-sm max-w-md">
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 text-clay fill-clay" />
              ))}
            </div>
            <p className="text-cream/70 text-xs leading-relaxed italic font-inter mb-3">
              &ldquo;Finding reliable suppliers used to take weeks. However by
              using this app, we connect directly with top wholesalers in
              minutes.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-clay/30 flex items-center justify-center text-cream text-xs font-bold">
                RK
              </div>
              <div className="font-inter">
                <div className="text-cream text-xs font-semibold">
                  Rajesh Kumar
                </div>
                <div className="text-cream/50 text-[10px]">
                  Head of Procurement, PackRight India
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== RIGHT PANEL ====== */}
      <div className="flex-1 bg-cream flex flex-col min-h-screen relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 p-6 pb-0">
          <div className="w-9 h-9 bg-clay rounded-lg flex items-center justify-center">
            <Box className="w-4 h-4 text-cream" />
          </div>
          <span className="text-espresso font-dmsans font-bold text-lg tracking-tight">
            Marketplace
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-14">
          <div className="w-full max-w-105">
            {/* Tab switcher */}
            <div className="relative bg-white rounded-xl p-1 mb-8 shadow-sm border border-slate-200/60">
              <div
                className="tab-slider absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-espresso rounded-lg z-0"
                style={{
                  transform: isLogin ? "translateX(0)" : "translateX(100%)",
                }}
              />
              <div className="font-inter relative z-10 flex">
                <button
                  onClick={() => navigate("/login")}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 cursor-pointer ${
                    isLogin ? "text-cream" : "text-espresso"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 cursor-pointer ${
                    !isLogin ? "text-cream" : "text-espresso"
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            <div ref={formContentRef}>
              <Outlet />
            </div>
          </div>
        </div>

        <div className=" p-6 pt-0 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            2026 Marketplace. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
};

export default AuthLayout;
