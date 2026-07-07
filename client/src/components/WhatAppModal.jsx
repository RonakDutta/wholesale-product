import { useState } from "react";
import { MessageCircle, ArrowLeft, X } from "lucide-react";
import ModalShell from "./ModalShell";

const WhatsAppModal = ({
  vendorName,
  productName,
  vendorPhone,
  onBack,
  onClose,
}) => {
  const [message, setMessage] = useState(
    `Hi ${vendorName || "seller"}, I'm interested in ${productName || "this product"} and would like to discuss pricing and availability.`,
  );

  const normalizedPhone = String(vendorPhone || "919999911111").replace(
    /\D/g,
    "",
  );
  const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

  const suggestedMessages = [
    `Hi ${vendorName || "seller"}, I'm interested in ${productName || "this product"} and would like to discuss pricing and availability.`,
    `Hello! What's the minimum order quantity and bulk pricing for ${productName || "this product"}?`,
    `Hi, can you share stock availability and delivery timeline for ${productName || "this product"}?`,
    `Hello, I'm comparing suppliers — what's your best offer for ${productName || "this product"}?`,
  ];

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-600">
          WhatsApp
        </p>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">
          Message {vendorName || "the seller"}
        </h3>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-semibold text-slate-700">
              Suggested messages
            </label>
            <span className="text-[10px] sm:text-[11px] text-slate-400">
              Tap to use
            </span>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {suggestedMessages.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setMessage(suggestion)}
                className="w-full rounded-xl border border-sage/40 bg-sage/5 px-3.5 py-2.5 text-left text-xs sm:text-sm text-slate-700 transition hover:border-clay hover:bg-clay/10 hover:text-clay"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block text-xs sm:text-sm font-semibold text-slate-700">
          Your message
        </label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-clay focus:bg-white"
        />
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-slate-100 bg-white p-4 sm:p-5">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-sm border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
          className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Open WhatsApp
        </a>
      </div>
    </ModalShell>
  );
};

export default WhatsAppModal;
