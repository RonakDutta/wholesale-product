import { useRef, useEffect, useState, useMemo } from "react";
import { gsap } from "gsap";
import CategorySlider from "../components/CategorySlider";
import ProductCard from "../components/ProductCard";
import FilterBar from "../components/FilterBar";
import HeroCarousel from "../components/HeroCarousel";
import CTABanner from "../components/CTABanner";
import LoadMore from "../components/LoadMore";
import MarketAlert from "../components/MarketAlert";
import mockProducts from "../utils/mockProducts";

const PAGE_SIZE = 8;

const MarketplaceHome = () => {
  const containerRef = useRef(null);
  const prevAnimatedIdsRef = useRef([]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recommended");

  const categories = useMemo(() => {
    const set = new Set(mockProducts.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, []);

  const filteredSorted = useMemo(() => {
    let result = mockProducts.filter((product) => {
      if (verifiedOnly && !product.verified) return false;
      if (selectedCategory && product.category !== selectedCategory)
        return false;
      return true;
    });

    switch (sortBy) {
      case "price-asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "verified":
        result = [...result].sort(
          (a, b) => Number(b.verified) - Number(a.verified),
        );
        break;
      default:
        break; // "recommended" = catalog order
    }

    return result;
  }, [selectedCategory, verifiedOnly, sortBy]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, verifiedOnly, sortBy]);

  const displayedProducts = useMemo(
    () => filteredSorted.slice(0, visibleCount),
    [filteredSorted, visibleCount],
  );

  const hasMore = visibleCount < filteredSorted.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) =>
        Math.min(prev + PAGE_SIZE, filteredSorted.length),
      );
      setIsLoadingMore(false);
    }, 500);
  };

  const handleClearFilters = () => {
    setVerifiedOnly(false);
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    let ctx = gsap.context(() => {
      gsap.fromTo(
        ".page-load-anim",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          willChange: "transform, opacity",
        },
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Animates product cards whenever the displayed set changes — covers the
  // first render, "Load More" (only new cards animate), and filter/sort
  // changes (whole new set animates fresh, tracked by id rather than index).
  useEffect(() => {
    const ctx = gsap.context(() => {
      const allIds = displayedProducts.map((p) => p.id);
      const newIds = allIds.filter(
        (id) => !prevAnimatedIdsRef.current.includes(id),
      );
      if (newIds.length === 0) return;

      const isFreshSet =
        prevAnimatedIdsRef.current.length === 0 ||
        newIds.length === allIds.length;

      const selector = newIds.map((id) => `[data-card-id="${id}"]`).join(",");
      const targets = gsap.utils.toArray(selector);

      gsap.fromTo(
        targets,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.05,
          ease: "power2.out",
          delay: isFreshSet ? 0.5 : 0,
          willChange: "transform, opacity",
        },
      );
    }, containerRef);

    prevAnimatedIdsRef.current = displayedProducts.map((p) => p.id);
    return () => ctx.revert();
  }, [displayedProducts]);

  return (
    <div ref={containerRef} className="flex flex-col gap-4 sm:gap-6 pb-10">
      <div className="page-load-anim">
        <HeroCarousel />
      </div>
      <div className="page-load-anim">
        <MarketAlert
          category="Packaging Materials"
          region="Delhi NCR"
          onActionClick={() => console.log("Navigate to deals")}
        />
      </div>
      <div className="page-load-anim">
        <CategorySlider
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>
      <div className="flex flex-col gap-2 page-load-anim">
        <FilterBar
          verifiedOnly={verifiedOnly}
          onToggleVerifiedOnly={() => setVerifiedOnly((prev) => !prev)}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onClearFilters={handleClearFilters}
          resultCount={displayedProducts.length}
          totalCount={filteredSorted.length}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {displayedProducts.map((product) => (
            <div
              key={product.id}
              data-card-id={product.id}
              className="product-card-anim"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        {filteredSorted.length === 0 && (
          <div className="text-center py-12 text-sm text-sage">
            No products match your filters.
          </div>
        )}
      </div>
      {hasMore && (
        <div className="page-load-anim">
          <LoadMore isLoading={isLoadingMore} onClick={handleLoadMore} />
        </div>
      )}
      <div className="page-load-anim">
        <CTABanner />
      </div>
    </div>
  );
};

export default MarketplaceHome;
