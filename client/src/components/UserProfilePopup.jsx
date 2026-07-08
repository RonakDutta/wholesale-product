import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const UserProfilePopup = () => {
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const popupRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const username = user.email?.split("@")[0] || "unknown";
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "Not available";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="relative inline-block text-left" ref={popupRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        type="button"
      >
        <span>{user.firstName || username}</span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="mb-3 border-b border-slate-100 pb-3">
            <div className="text-sm text-slate-500">Profile details</div>
            <div className="text-lg font-semibold text-slate-900">
              {fullName}
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Username</span>
              <span className="font-medium">{username}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Email</span>
              <span className="font-medium wrap-break-word">{user.email}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Full name</span>
              <span className="font-medium">{fullName}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Account type</span>
              <span className="font-medium capitalize">
                {user.bizType || "buyer"}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-4 w-full rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
            type="button"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfilePopup;
