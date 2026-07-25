import { useNotifications } from "../context/NotificationContext";

const NotificationDropdown = ({ onClose }) => {
  const { notifications, markRead, deleteNotification, markAllRead } =
    useNotifications();

  return (
    <div className="absolute right-0 mt-2 w-96 max-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl z-50">
      <div className="flex items-center justify-between gap-2 p-4 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
        <button
          className="text-xs text-slate-500 hover:text-slate-900"
          onClick={() => {
            markAllRead();
          }}
        >
          Mark all read
        </button>
      </div>
      <div className="max-h-[440px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex flex-col gap-2 border-b border-slate-100 p-4 ${notification.is_read ? "bg-slate-50" : "bg-slate-100"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {notification.message}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    className="text-[11px] text-slate-500 hover:text-slate-900"
                    onClick={() => markRead(notification.id)}
                  >
                    Mark read
                  </button>
                  <button
                    className="text-[11px] text-rose-500 hover:text-rose-600"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
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
      <button
        onClick={onClose}
        className="w-full border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        Close
      </button>
    </div>
  );
};

export default NotificationDropdown;
