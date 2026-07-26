import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageSquare,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const DashboardLayout = () => {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      path: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      path: "/dashboard/products",
      label: "My Products",
      icon: Package,
      exact: false,
    },
    {
      path: "/dashboard/orders",
      label: "Orders",
      icon: ShoppingBag,
      exact: false,
    },
    {
      path: "/dashboard/promotions",
      label: "Promotions",
      icon: Sparkles,
      exact: false,
    },
    {
      path: "/messages",
      label: "Messages",
      icon: MessageSquare,
      exact: false,
    },
    {
      path: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      exact: false,
    },
  ];

  const checkIsActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="font-dmsans min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col h-screen transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 ${
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center">
            <Link
              to="/"
              className="text-xl font-black tracking-tighter text-espresso select-none"
            >
              market<span className="text-clay">place.</span>
            </Link>
            <span className="ml-2 bg-sage/20 text-espresso text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">
              Seller
            </span>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = checkIsActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-clay/10 text-clay font-bold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-espresso font-semibold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-5 h-5 ${isActive ? "text-clay" : "text-slate-400"}`}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            {/* Hamburger Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 hover:text-clay rounded-lg cursor-pointer transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-espresso line-clamp-1">
              Supplier Portal
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-5">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-clay focus:ring-2 focus:ring-clay/20 outline-none w-64 transition-all"
              />
            </div>

            <button className="relative p-2 text-slate-500 hover:bg-sage/20 rounded-full transition-colors cursor-pointer">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>

            <button className="p-2 text-slate-500 hover:bg-sage/20 rounded-full transition-colors cursor-pointer">
              <Bell className="w-5 h-5" />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-semibold">
                Sign Out
              </span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
