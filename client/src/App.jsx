import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { UnreadProvider } from "./context/UnreadContext";

import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import InfoLayout from "./layouts/InfoLayout";

import RequireRole from "./components/RequireRole";
import { FEATURES } from "./config/features";

import Home from "./pages/Home";
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
import NotificationCenter from "./pages/NotificationCenter";
import Invoices from "./pages/dashboard/Invoices";
import CreateInvoice from "./pages/dashboard/CreateInvoice";
import InvoiceDetails from "./pages/dashboard/InvoiceDetails";
import InvoiceReports from "./pages/dashboard/InvoiceReports";
import InvoiceSettings from "./pages/dashboard/InvoiceSettings";
import WholesalerProfile from "./pages/WholesalerProfile";
import SharedListing from "./pages/SharedListing";
import DriverTracking from "./pages/DriverTracking";
import NotFound from "./pages/NotFound";

// Seller workspace is lazy-loaded: retailers never download this bundle.
const SellerLayout = lazy(() => import("./layouts/SellerLayout"));
const MyProducts = lazy(() => import("./pages/dashboard/MyProducts"));
const AddProduct = lazy(() => import("./pages/dashboard/AddProduct"));
const EditProduct = lazy(() => import("./pages/dashboard/EditProduct"));
const Orders = lazy(() => import("./pages/dashboard/Orders"));
const Promotions = lazy(() => import("./pages/dashboard/Promotions"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const Parties = lazy(() => import("./pages/dashboard/Parties"));
const PartyDetail = lazy(() => import("./pages/dashboard/PartyDetail"));
const PartyStatement = lazy(() => import("./pages/dashboard/PartyStatement"));
const Sales = lazy(() => import("./pages/dashboard/Sales"));
const RecordSale = lazy(() => import("./pages/dashboard/RecordSale"));
const SaleDetail = lazy(() => import("./pages/dashboard/SaleDetail"));
const Overview = lazy(() => import("./pages/dashboard/Overview"));

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

// Marketplace-only screens. Kept in the tree and still compiled, but not
// routable while FEATURES.MARKETPLACE is off. Flipping the flag brings the
// whole browsing side back with no other change.
const MARKETPLACE_ROUTES = [
  { path: "product/:id", element: <ProductDetails /> },
  { path: "wholesaler/:id", element: <WholesalerProfile /> },
  { path: "wishlist", element: <Wishlist /> },
  { path: "search", element: <SearchResults /> },
  { path: "checkout", element: <Checkout /> },
  { path: "payment/:orderId", element: <Payment /> },
  { path: "order-success", element: <OrderSuccess /> },
  { path: "retail-dashboard", element: <RetailDashboard /> },
];

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
      { index: true, element: <Home /> },
      ...(FEATURES.MARKETPLACE ? MARKETPLACE_ROUTES : []),
      // A share link is reached by its URL, not by browsing, so it survives
      // the marketplace being switched off.
      { path: "listing/:inventoryId", element: <SharedListing /> },
      { path: "messages", element: <Messages /> },
      { path: "messages/:vendorId", element: <Messages /> },
      { path: "orders", element: <MyOrders /> },
      { path: "notifications", element: <NotificationCenter /> },
      { path: "orders/:orderId", element: <OrderDetails /> },
    ],
  },
  {
    path: "/seller",
    element: <SellerArea />,
    children: [
      // Always the 3.0 overview, marketplace or not. The old dashboard
      // reported a buyer rating and a listing count, which is not what a
      // wholesaler opens this for.
      { index: true, element: <Overview /> },
      { path: "customers", element: <Parties /> },
      { path: "customers/:id", element: <PartyDetail /> },
      { path: "customers/:id/statement", element: <PartyStatement /> },
      { path: "sales", element: <Sales /> },
      // Before "sales/:id" so the word is not read as a sale id.
      { path: "sales/new", element: <RecordSale /> },
      { path: "sales/:id", element: <SaleDetail /> },
      { path: "sales/:id/edit", element: <RecordSale /> },
      // The rate list is now one list with the shop listings. The old address
      // keeps working so a bookmark or an old link does not land on "not
      // found".
      { path: "rates", element: <Navigate to="/seller/products" replace /> },
      { path: "products", element: <MyProducts /> },
      { path: "products/new", element: <AddProduct /> },
      { path: "products/edit/:id", element: <EditProduct /> },
      { path: "orders", element: <Orders /> },
      { path: "invoices", element: <Invoices /> },
      { path: "invoices/create", element: <CreateInvoice /> },
      { path: "invoices/reports", element: <InvoiceReports /> },
      { path: "invoices/settings", element: <InvoiceSettings /> },
      { path: "invoices/:id", element: <InvoiceDetails /> },
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
        <NotificationProvider>
          <UnreadProvider>
            <CartProvider>
              <WishlistProvider>
                <Toaster richColors position="bottom-right" />
                <RouterProvider router={router} />
              </WishlistProvider>
            </CartProvider>
          </UnreadProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
