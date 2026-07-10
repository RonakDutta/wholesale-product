import { useRef, useEffect, useState, useMemo } from "react";
import { gsap } from "gsap";
import CategorySlider from "../components/CategorySlider";
import ProductCard from "../components/ProductCard";
import FilterBar from "../components/FilterBar";
import HeroCarousel from "../components/HeroCarousel";
import CTABanner from "../components/CTABanner";
import LoadMore from "../components/LoadMore";
import MarketAlert from "../components/MarketAlert";
import {
	getCheapestSupplier,
	hasVerifiedSupplier,
} from "../utils/supplierUtils";
import api from "../utils/axios"; // Added API import
import { toast } from "sonner";

const PAGE_SIZE = 8;

const MarketplaceHome = () => {
	const containerRef = useRef(null);
	const prevAnimatedIdsRef = useRef([]);

	const [products, setProducts] = useState([]);
	const [isFetching, setIsFetching] = useState(true);

	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	const [selectedCategory, setSelectedCategory] = useState(null);
	const [verifiedOnly, setVerifiedOnly] = useState(false);
	const [sortBy, setSortBy] = useState("recommended");

	useEffect(() => {
		const fetchCatalog = async () => {
			try {
				const res = await api.get("/api/products");

				const mappedProducts = res.data.map((dbProduct) => ({
					id: dbProduct.id.toString(),
					name: dbProduct.name,
					category: dbProduct.category,
					image: dbProduct.image,
					description: dbProduct.description,
					suppliers: dbProduct.suppliers,
				}));

				setProducts(mappedProducts);
			} catch (err) {
				console.error("Failed to fetch catalog:", err);
				toast.error("Failed to load live catalog.");
			} finally {
				setIsFetching(false);
			}
		};

		fetchCatalog();
	}, []);

	const categories = useMemo(() => {
		const set = new Set(products.map((p) => p.category).filter(Boolean));
		return Array.from(set).sort();
	}, [products]);

	const filteredSorted = useMemo(() => {
		let result = products.filter((product) => {
			if (verifiedOnly && !hasVerifiedSupplier(product)) return false;
			if (selectedCategory && product.category !== selectedCategory)
				return false;
			return true;
		});

		switch (sortBy) {
			case "price-asc":
				result = [...result].sort((a, b) => {
					const pa =
						getCheapestSupplier(a)?.discountPrice ??
						getCheapestSupplier(a)?.price ??
						0;
					const pb =
						getCheapestSupplier(b)?.discountPrice ??
						getCheapestSupplier(b)?.price ??
						0;
					return pa - pb;
				});
				break;
			case "price-desc":
				result = [...result].sort((a, b) => {
					const pa =
						getCheapestSupplier(a)?.discountPrice ??
						getCheapestSupplier(a)?.price ??
						0;
					const pb =
						getCheapestSupplier(b)?.discountPrice ??
						getCheapestSupplier(b)?.price ??
						0;
					return pb - pa;
				});
				break;
			case "verified":
				result = [...result].sort(
					(a, b) =>
						Number(hasVerifiedSupplier(b)) - Number(hasVerifiedSupplier(a)),
				);
				break;
			default:
				break;
		}

		return result;
	}, [products, selectedCategory, verifiedOnly, sortBy]);

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
		setSelectedCategory(null);
	};

	// Initial Page Load Animation
	useEffect(() => {
		if (isFetching) return; // Wait until data is loaded
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
	}, [isFetching]);

	// Animates product cards whenever the displayed set changes
	useEffect(() => {
		if (isFetching || displayedProducts.length === 0) return;

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
					delay: isFreshSet ? 0.2 : 0,
					willChange: "transform, opacity",
				},
			);
		}, containerRef);

		prevAnimatedIdsRef.current = displayedProducts.map((p) => p.id);
		return () => ctx.revert();
	}, [displayedProducts, isFetching]);

	if (isFetching) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="w-8 h-8 border-4 border-clay border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

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
					<div className="text-center py-12 text-sm text-slate-500">
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
