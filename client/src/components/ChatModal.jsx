import { useState } from "react";
import {
  Send,
  ArrowLeft,
  X,
  ShieldCheck,
  MessageSquareText,
} from "lucide-react";
import ModalShell from "./ModalShell";

const ChatModal = ({ vendorName, productName, onBack, onClose }) => {
  const [messages, setMessages] = useState([
    {
      sender: "system",
      text: `You're starting a conversation with ${vendorName || "the seller"} about ${productName || "this product"}.`,
    },
  ]);
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, { sender: "buyer", text: draft.trim() }]);
    setDraft("");
    // TODO: replace with a real send once the websocket layer is wired up
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex h-[70vh] sm:h-140 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">
              {vendorName || "Seller"}
            </p>
            <p className="text-[10px] text-slate-400 truncate max-w-40">
              {productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {messages.length <= 1 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <MessageSquareText className="h-9 w-9 text-slate-200" />
              <p className="max-w-55 text-xs text-slate-400">
                {messages[0]?.text}
              </p>
            </div>
          ) : (
            messages.map((m, i) =>
              m.sender === "system" ? (
                <div
                  key={i}
                  className="mx-auto max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-center text-[11px] text-slate-500"
                >
                  {m.text}
                </div>
              ) : (
                <div
                  key={i}
                  className="max-w-[75%] self-end rounded-lg bg-clay px-3 py-2 text-sm text-white"
                >
                  {m.text}
                </div>
              ),
            )
          )}
        </div>
        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            Real-time delivery is coming soon — the vendor won't see this yet.
          </div>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-clay"
            />
            <button
              onClick={handleSend}
              className="flex items-center justify-center rounded-lg bg-clay px-3 text-white"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

export default ChatModal;
