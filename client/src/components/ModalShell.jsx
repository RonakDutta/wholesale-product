import { useEffect } from "react";
import { createPortal } from "react-dom";

const ModalShell = ({ onClose, children, maxWidth = "max-w-md" }) => {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-slate-950/70"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} sm:mx-4 rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[85vh] flex flex-col overflow-hidden`}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div
          className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 transparent",
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ModalShell;
