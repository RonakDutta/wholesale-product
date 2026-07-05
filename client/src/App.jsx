import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "./context/CartContext";

import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

import MarketplaceHome from "./pages/MarketplaceHome";
import ProductDetails from "./pages/ProductDetails";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import SearchResults from "./pages/SearchResults";

const router = createBrowserRouter([
	{
		path: "/",
		element: <MainLayout />,
		children: [
			{ index: true, element: <MarketplaceHome /> },
			{ path: "product/:id", element: <ProductDetails /> },
			{ path: "search", element: <SearchResults /> },
		],
	},
	{
		element: <AuthLayout />,
		children: [
			{ path: "login", element: <Login /> },
			{ path: "signup", element: <SignUp /> },
		],
	},
]);

export default function App() {
	return (
		<CartProvider>
			<Toaster richColors position="top-right" />
			<RouterProvider router={router} />
		</CartProvider>
	);
}
