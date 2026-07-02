import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X, Search, MapPin } from "lucide-react";

const navLinks = [
  { name: "Browse", path: "/browse" },
  { name: "Categories", path: "/categories" },
  { name: "Become a Seller", path: "/sell" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream border-b border-espresso/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="text-xl font-semibold text-espresso shrink-0">
          markethub
        </Link>

        <div className="hidden md:flex items-center flex-1 max-w-md bg-white border border-espresso/15 rounded-lg px-3 h-10">
          <Search size={16} className="text-espresso/40" />
          <input
            type="text"
            placeholder="Search products, categories"
            className="w-full bg-transparent outline-none px-2 text-sm text-espresso placeholder:text-espresso/40"
          />
        </div>

        <div className="hidden md:flex items-center gap-1 text-sm text-espresso/70 shrink-0">
          <MapPin size={16} />
          <span>Delhi</span>
        </div>

        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `text-sm ${isActive ? "text-clay font-medium" : "text-espresso/70 hover:text-espresso"}`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            to="/login"
            className="text-sm text-espresso/80 hover:text-espresso"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="text-sm bg-clay text-white px-4 py-2 rounded-lg hover:bg-clay/90"
          >
            Sign up
          </Link>
        </div>

        <button
          className="md:hidden text-espresso"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-espresso/10 px-4 py-4 flex flex-col gap-4 bg-cream">
          <div className="flex items-center bg-white border border-espresso/15 rounded-lg px-3 h-10">
            <Search size={16} className="text-espresso/40" />
            <input
              type="text"
              placeholder="Search products"
              className="w-full bg-transparent outline-none px-2 text-sm text-espresso placeholder:text-espresso/40"
            />
          </div>

          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `text-sm ${isActive ? "text-clay font-medium" : "text-espresso/80"}`
              }
            >
              {link.name}
            </NavLink>
          ))}

          <div className="flex gap-3 pt-3 border-t border-espresso/10">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="flex-1 text-center text-sm border border-espresso/20 rounded-lg py-2"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              onClick={() => setMenuOpen(false)}
              className="flex-1 text-center text-sm bg-clay text-white rounded-lg py-2"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
