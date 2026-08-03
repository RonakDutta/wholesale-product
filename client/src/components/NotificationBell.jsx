import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import NotificationDropdown from "./NotificationDropdown";

const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Nothing to show, and nothing to fetch, until someone is signed in.
  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={bellRef}>
      <button
        className="relative rounded-full p-2 text-espresso/60 transition-colors hover:bg-sage/10 hover:text-espresso"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
};

export default NotificationBell;
