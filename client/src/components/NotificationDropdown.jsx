import { Link } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

const NotificationDropdown = ({ onClose }) => {
  const { notifications, markRead, deleteNotification, markAllRead } =
    useNotifications();

  return (
    <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] max-h-[520px] overflow-hidden rounded-2xl border border-sage/20 bg-white shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-sage/15 p-4">
        <h3 className="text-sm font-bold text-espresso">Notifications</h3>
        {notifications.length > 0 && (
          <button
            className="text-xs font-semibold text-clay transition-colors hover:text-espresso"
            onClick={markAllRead}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[380px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-espresso/50">
            Nothing new right now.
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex flex-col gap-2 border-b border-sage/10 p-4 ${
                notification.is_read ? "bg-white" : "bg-clay/5"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-espresso">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-xs text-espresso/60">
                    {notification.message}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {!notification.is_read && (
                    <button
                      className="text-[11px] font-semibold text-espresso/50 transition-colors hover:text-espresso"
                      onClick={() => markRead(notification.id)}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    className="text-[11px] font-semibold text-rose-500 transition-colors hover:text-rose-600"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-espresso/40">
                <span>
                  {new Date(notification.created_at).toLocaleString()}
                </span>
                <span className="uppercase tracking-[0.08em]">
                  {notification.notification_type}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <Link
        to="/notifications"
        onClick={onClose}
        className="block border-t border-sage/15 bg-cream/60 px-4 py-3 text-center text-sm font-bold text-espresso transition-colors hover:bg-cream"
      >
        See all notifications
      </Link>
    </div>
  );
};

export default NotificationDropdown;
