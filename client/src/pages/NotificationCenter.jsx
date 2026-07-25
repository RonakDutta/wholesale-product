import { useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";

const NotificationCenter = () => {
  const { notifications, loadNotifications, isLoading, page, total } =
    useNotifications();

  useEffect(() => {
    loadNotifications({ page: 1 });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Center</h1>
          <p className="text-sm text-slate-500">
            Manage your unread alerts and notification history.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">
            Recent notifications
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No notifications available.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {notification.title}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {notification.message}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${notification.is_read ? "text-slate-400" : "text-clay"}`}
                  >
                    {notification.is_read ? "Read" : "Unread"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>
                    {new Date(notification.created_at).toLocaleString()}
                  </span>
                  <span className="uppercase">
                    {notification.notification_type}
                  </span>
                  <span>{notification.channel}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 text-sm text-slate-500 bg-slate-50">
          Showing {notifications.length} of {total} notifications.
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
