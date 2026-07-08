import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AuthProvider } from "./context/AuthContext";

import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import InfoLayout from "./layouts/InfoLayout";

import MarketplaceHome from "./pages/MarketplaceHome";
import ProductDetails from "./pages/ProductDetails";
import Wishlist from "./pages/Wishlist";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import SearchResults from "./pages/SearchResults";
import FooterInfoPage from "./pages/FooterInfoPage";
import SupplierDashboard from "./pages/SupplierDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <MarketplaceHome /> },
      { path: "product/:id", element: <ProductDetails /> },
      { path: "wishlist", element: <Wishlist /> },
      { path: "dashboard", element: <BuyerDashboard /> },
      { path: "supplier-dashboard", element: <SupplierDashboard /> },
      { path: "search", element: <SearchResults /> },
    ],
  },
  {
    element: <InfoLayout />,
    children: [
      {
        path: "browse-products",
        element: <FooterInfoPage page="browse-products" />,
      },
      {
        path: "verified-sellers",
        element: <FooterInfoPage page="verified-sellers" />,
      },
      {
        path: "dynamic-pricing",
        element: <FooterInfoPage page="dynamic-pricing" />,
      },
      { path: "help-center", element: <FooterInfoPage page="help-center" /> },
      { path: "upi-guide", element: <FooterInfoPage page="upi-guide" /> },
      { path: "contact-us", element: <FooterInfoPage page="contact-us" /> },
      {
        path: "terms-of-service",
        element: <FooterInfoPage page="terms-of-service" />,
      },
      {
        path: "privacy-policy",
        element: <FooterInfoPage page="privacy-policy" />,
      },
      {
        path: "seller-agreement",
        element: <FooterInfoPage page="seller-agreement" />,
      },
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
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <Toaster richColors position="top-right" />
          <RouterProvider router={router} />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
