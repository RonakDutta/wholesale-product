import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-espresso/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-espresso/60">
        <span>© {new Date().getFullYear()} markethub</span>
        <div className="flex items-center gap-6">
          <Link to="/about" className="hover:text-espresso">
            About
          </Link>
          <Link to="/support" className="hover:text-espresso">
            Support
          </Link>
          <a
            href="https://wa.me/910000000000"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-espresso"
          >
            <MessageCircle size={16} />
            WhatsApp us
          </a>
        </div>
      </div>
    </footer>
  );
}
