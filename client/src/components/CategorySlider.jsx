const CategorySlider = () => {
	const categories = [
		"All Products",
		"Electronics",
		"Packaging",
		"Raw Materials",
		"Hardware",
		"Textiles",
		"Chemicals",
	];

	return (
		<div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none pb-2">
			<div className="flex gap-3">
				{categories.map((category, index) => (
					<button
						key={index}
						className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
							index === 0
								? "bg-clay text-cream shadow-md shadow-clay/20"
								: "bg-sage/10 text-espresso hover:bg-sage/30 hover:shadow-sm"
						}`}
					>
						{category}
					</button>
				))}
			</div>
		</div>
	);
};

export default CategorySlider;
