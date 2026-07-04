import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

import MarketplaceHome from "./pages/MarketplaceHome";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";

const router = createBrowserRouter([
	{
		element: <MainLayout />,
		children: [{ path: "/", element: <MarketplaceHome /> }],
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
		<>
			<Toaster richColors position="top-right" />
			<RouterProvider router={router} />
		</>
	);
}
