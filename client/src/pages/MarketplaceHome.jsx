import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import CategorySlider from "../components/CategorySlider";
import ProductCard from "../components/ProductCard";
import FilterBar from "../components/FilterBar";
import HeroCarousel from "../components/HeroCarousel";
import CTABanner from "../components/CTABanner";
import LoadMore from "../components/LoadMore";
import MarketAlert from "../components/MarketAlert";
import mockProducts from "../utils/mockProducts";

const MarketplaceHome = () => {
	const containerRef = useRef(null);

	useEffect(() => {
		let ctx = gsap.context(() => {
			//  fromTo prevents the flash of unstyled content before GSAP loads
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

			gsap.fromTo(
				".product-card-anim",
				{ y: 30, opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: 0.5,
					stagger: 0.05,
					ease: "power2.out",
					delay: 0.5,
					willChange: "transform, opacity",
				},
			);
		}, containerRef);

		return () => ctx.revert();
	}, []);

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
				<CategorySlider />
			</div>

			<div className="flex flex-col gap-2 page-load-anim">
				<FilterBar />
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{mockProducts.map((product) => (
						<ProductCard key={product.id} product={product} />
					))}
				</div>
			</div>

			<div className="page-load-anim">
				<LoadMore />
			</div>

			<div className="page-load-anim">
				<CTABanner />
			</div>
		</div>
	);
};

export default MarketplaceHome;
