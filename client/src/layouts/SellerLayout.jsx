import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageSquare,
  FileText,
  Settings,
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

// Wholesale 3.0 nav. "Customers" sits second because the customer book is the
// thing a wholesaler opens the app for. The marketplace-era entries are kept
// but only shown when the marketplace flag is on, so nothing is deleted.
const NAV = [
  { path: "/seller", label: "Overview", icon: LayoutDashboard, exact: true },
  { path: "/seller/customers", label: "Customers", icon: Users },
  { path: "/seller/products", label: "Rate list", icon: Package },
  { path: "/seller/sales", label: "Sales", icon: ShoppingBag },
  // Marketplace orders, which are a different thing from a recorded sale.
  {
    path: "/seller/orders",
    label: "Orders",
    icon: ShoppingBag,
    flag: "MARKETPLACE",
  },
  { path: "/seller/invoices", label: "Invoices", icon: FileText },
  { path: "/seller/messages", label: "Messages", icon: MessageSquare, badge: "unread" },
  {
    path: "/seller/promotions",
    label: "Promotions",
    icon: Sparkles,
    flag: "MARKETPLACE",
  },
  {
    path: "/seller/analytics",
    label: "Analytics",
    icon: BarChart3,
    flag: "ANALYTICS",
  },
  { path: "/seller/settings", label: "Settings", icon: Settings },
].filter((item) => !item.flag || FEATURES[item.flag]);

const SellerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useUnread();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
              market<span className="text-clay">place.</span>
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
          {NAV.map((item) => {
            const active = isActive(item);
            const showBadge = item.badge === "unread" && unreadCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
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
                {companyName || "Your business"}
              </p>
              <p className="text-[11px] font-semibold text-slate-400">
                Wholesaler account
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SellerLayout;
