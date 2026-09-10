import { Suspense, useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageSquare,
  FileText,
  Settings,
  UserCog,
  Sparkles,
  LogOut,
  Menu,
  X,
  Store,
  Users,
  BarChart3,
  Plus,
  ChevronLeft,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUnread } from "../context/UnreadContext";
import { FEATURES } from "../config/features";
import Wordmark from "../components/Wordmark";

// Wholesale 3.0 nav. "Customers" sits second because the customer book is the
// thing a wholesaler opens the app for. The marketplace-era entries are kept
// but only shown when the marketplace flag is on, so nothing is deleted.
const NAV = [
  { path: "/seller", label: "Overview", icon: LayoutDashboard, exact: true },
  { path: "/seller/customers", label: "Customers", icon: Users, needs: "customers" },
  // One list. It used to be two, his own rate list and his shop listings,
  // which meant the same thing to him and differed only in which half of the
  // row each screen could show. Where a product is shown is now a control on
  // the product itself, which is where he looks for it.
  { path: "/seller/products", label: "Products", icon: Package, needs: "products" },
  { path: "/seller/sales", label: "Sales", icon: ShoppingBag, needs: "sales" },
  // Marketplace orders, which are a different thing from a recorded sale.
  {
    path: "/seller/orders",
    label: "Orders",
    icon: ShoppingBag,
    flag: "MARKETPLACE",
    needs: "orders",
  },
  { path: "/seller/invoices", label: "Invoices", icon: FileText, needs: "invoices" },
  { path: "/seller/messages", label: "Messages", icon: MessageSquare, badge: "unread" },
  // Off behind FEATURES.PROMOTIONS, not deleted. See the flag for why.
  {
    path: "/seller/promotions",
    label: "Promotions",
    icon: Sparkles,
    flag: "PROMOTIONS",
  },
  {
    path: "/seller/analytics",
    label: "Analytics",
    icon: BarChart3,
    flag: "ANALYTICS",
  },
  { path: "/seller/staff", label: "Staff", icon: UserCog, ownerOnly: true },
  { path: "/seller/settings", label: "Settings", icon: Settings, ownerOnly: true },
].filter((item) => !item.flag || FEATURES[item.flag]);

/**
 * Fetch a tab's code before it is clicked.
 *
 * The pointer rests on a nav item for a moment before the click lands, and
 * that moment is usually enough to pull the chunk down. Vite serves the same
 * module React.lazy will ask for, so this is a warm cache rather than a second
 * download. Keyed by path and matched to the routes in App.jsx.
 *
 * Failures are swallowed on purpose: this is an optimisation, and a prefetch
 * that fails costs nothing because the real navigation will ask again.
 */
const PREFETCH = {
  "/seller": () => import("../pages/dashboard/Overview"),
  "/seller/customers": () => import("../pages/dashboard/Parties"),
  "/seller/products": () => import("../pages/dashboard/MyProducts"),
  "/seller/sales": () => import("../pages/dashboard/Sales"),
  "/seller/orders": () => import("../pages/dashboard/Orders"),
  "/seller/staff": () => import("../pages/dashboard/Staff"),
  "/seller/settings": () => import("../pages/dashboard/Settings"),
};

const warmed = new Set();
const prefetch = (path) => {
  if (warmed.has(path) || !PREFETCH[path]) return;
  warmed.add(path);
  PREFETCH[path]().catch(() => warmed.delete(path));
};

/**
 * What the content pane shows while a tab's code arrives.
 *
 * Shaped like a page rather than a spinner in the middle of nothing. The
 * sidebar and header are already on screen and are not going anywhere, so a
 * centred spinner here reads as the page having broken rather than as it
 * being a moment away.
 */
const PaneFallback = () => (
  <div className="mx-auto max-w-4xl animate-pulse space-y-4">
    <div className="h-7 w-48 rounded-lg bg-slate-200" />
    <div className="h-4 w-72 rounded bg-slate-200/70" />
    <div className="mt-6 space-y-3">
      <div className="h-20 rounded-2xl bg-slate-200/60" />
      <div className="h-20 rounded-2xl bg-slate-200/40" />
      <div className="h-20 rounded-2xl bg-slate-200/25" />
    </div>
  </div>
);

const SellerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, can, isOwner, staff } = useAuth();
  const { unreadCount } = useUnread();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // What this person can actually reach. The sidebar must not offer a screen
  // the server will refuse: an employee clicking "Customers" and being told no
  // is a worse experience than never seeing it. The server checks again, which
  // is the boundary; this is only politeness.
  const nav = NAV.filter(
    (item) =>
      (!item.ownerOnly || isOwner) && (!item.needs || can(item.needs)),
  );

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (item) =>
    item.exact
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path);

  const companyName =
    user?.companyName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  return (
    <div className="font-dmsans flex h-dvh overflow-hidden bg-slate-100">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-espresso text-cream transition-transform duration-300 md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <div>
            <p className="text-base font-black leading-none tracking-tight">
              <Wordmark />
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cream/40">
              Seller Workspace
            </p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1.5 text-cream/50 transition-colors hover:bg-white/10 hover:text-cream md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const active = isActive(item);
            const showBadge = item.badge === "unread" && unreadCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                onMouseEnter={() => prefetch(item.path)}
                onFocus={() => prefetch(item.path)}
                onTouchStart={() => prefetch(item.path)}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-clay text-white font-bold"
                    : "text-cream/60 hover:bg-white/5 hover:text-cream font-semibold"
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                </span>
                {showBadge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          {/* The buyer-facing shop page, not a dashboard screen, so it sits
              with the other ways out rather than in the nav list above.
              Both of these belong to the marketplace, which is switched off
              in 3.0, so they follow the same flag. */}
          {FEATURES.MARKETPLACE && user?.id && (
            <Link
              to={`/wholesaler/${user.id}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-cream/60 transition-colors hover:bg-white/5 hover:text-cream"
              title="See your shop page the way buyers see it"
            >
              <Store className="h-4 w-4" />
              My shop page
            </Link>
          )}
          {FEATURES.MARKETPLACE && (
            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-cream/60 transition-colors hover:bg-white/5 hover:text-cream"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to marketplace
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Workspace */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="-ml-2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {/* An employee is looking at his employer's shop, so the
                    header says whose it is. Two brothers with two firms and
                    one phone between them is not an unusual arrangement. */}
                {isOwner ? companyName || "Your business" : staff.worksFor}
              </p>
              <p className="truncate text-[11px] font-semibold text-slate-400">
                {isOwner ? "Wholesaler account" : "You are working here as staff"}
              </p>
            </div>
          </div>

          {/* Recording a sale is the thing a wholesaler does every day, so it
              is one tap away from every screen. */}
          <Link
            to="/seller/sales/new"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-espresso px-3 py-2 text-xs font-bold text-cream transition-colors hover:bg-clay"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Record sale</span>
          </Link>
        </header>

        {/* The boundary belongs here, around the content, not around the whole
            dashboard. With only the outer one a lazily loaded page suspended
            past the sidebar and header, so switching to a tab for the first
            time threw the entire shell away and rebuilt it behind a full
            screen spinner. Now the shell stays put and only this pane waits. */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<PaneFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default SellerLayout;
