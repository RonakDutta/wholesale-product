import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const MainLayout = () => {
	const location = useLocation();
	const pageRef = useRef(null);
	useEffect(() => {
		gsap.set(window, { scrollTo: 0 });

		gsap.fromTo(
			pageRef.current,
			{
				opacity: 0,
				y: 16,
			},
			{
				opacity: 1,
				y: 0,
				duration: 0.45,
				ease: "power2.out",
				clearProps: "all",
			},
		);
	}, [location.pathname]);

	return (
		<div className="font-dmsans min-h-screen bg-cream text-espresso flex flex-col">
			<Navbar />
			<main ref={pageRef} className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
};

export default MainLayout;
