import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { UnreadProvider } from "./context/UnreadContext";

import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import InfoLayout from "./layouts/InfoLayout";

import RequireRole from "./components/RequireRole";

import MarketplaceHome from "./pages/MarketplaceHome";
import ProductDetails from "./pages/ProductDetails";
import Wishlist from "./pages/Wishlist";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import SearchResults from "./pages/SearchResults";
import FooterInfoPage from "./pages/FooterInfoPage";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import OrderSuccess from "./pages/OrderSuccess";
import OrderDetails from "./pages/OrderDetails";
import MyOrders from "./pages/MyOrders";
import Messages from "./pages/Messages";
import RetailDashboard from "./pages/RetailDashboard";
import WholesalerProfile from "./pages/WholesalerProfile";
import DriverTracking from "./pages/DriverTracking";
import NotFound from "./pages/NotFound";

// Seller workspace is lazy-loaded: retailers never download this bundle.
const SellerLayout = lazy(() => import("./layouts/SellerLayout"));
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const MyProducts = lazy(() => import("./pages/dashboard/MyProducts"));
const AddProduct = lazy(() => import("./pages/dashboard/AddProduct"));
const EditProduct = lazy(() => import("./pages/dashboard/EditProduct"));
const Orders = lazy(() => import("./pages/dashboard/Orders"));
const Promotions = lazy(() => import("./pages/dashboard/Promotions"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));

const SellerFallback = () => (
  <div className="flex min-h-dvh items-center justify-center bg-slate-100">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
  </div>
);

// Wraps the seller shell in its role guard and Suspense boundary.
const SellerArea = () => (
  <RequireRole roles={["seller", "both"]}>
    <Suspense fallback={<SellerFallback />}>
      <SellerLayout />
    </Suspense>
  </RequireRole>
);

const router = createBrowserRouter([
  {
    path: "*",
    element: <NotFound />,
  },
  // Driver tracking link: standalone, unauthenticated, no marketplace shell.
  { path: "/track/:token", element: <DriverTracking /> },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <MarketplaceHome /> },
      { path: "product/:id", element: <ProductDetails /> },
      { path: "wholesaler/:id", element: <WholesalerProfile /> },
      { path: "wishlist", element: <Wishlist /> },
      { path: "search", element: <SearchResults /> },
      { path: "messages", element: <Messages /> },
      { path: "messages/:vendorId", element: <Messages /> },
      { path: "checkout", element: <Checkout /> },
      { path: "payment/:orderId", element: <Payment /> },
      { path: "order-success", element: <OrderSuccess /> },
      { path: "orders", element: <MyOrders /> },
      { path: "orders/:orderId", element: <OrderDetails /> },
      { path: "retail-dashboard", element: <RetailDashboard /> },
    ],
  },
  {
    path: "/seller",
    element: <SellerArea />,
    children: [
      { index: true, element: <DashboardOverview /> },
      { path: "products", element: <MyProducts /> },
      { path: "products/new", element: <AddProduct /> },
      { path: "products/edit/:id", element: <EditProduct /> },
      { path: "orders", element: <Orders /> },
      { path: "promotions", element: <Promotions /> },
      { path: "messages", element: <Messages /> },
      { path: "messages/:vendorId", element: <Messages /> },
      { path: "settings", element: <Settings /> },
    ],
  },
  // Old dashboard links and bookmarks keep working.
  { path: "/dashboard", element: <Navigate to="/seller" replace /> },
  { path: "/dashboard/*", element: <Navigate to="/seller" replace /> },
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
      <SocketProvider>
        <UnreadProvider>
          <CartProvider>
            <WishlistProvider>
              <Toaster richColors position="bottom-right" />
              <RouterProvider router={router} />
            </WishlistProvider>
          </CartProvider>
        </UnreadProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
