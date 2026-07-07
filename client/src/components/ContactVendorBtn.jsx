import { useState } from "react";
import { MessageSquare, X } from "lucide-react";

const ContactVendorBtn = ({
  vendorId,
  vendorName,
  productName,
  vendorPhone,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(
    `Hi ${vendorName || "seller"}, I’m interested in ${productName || "this product"} and would like to discuss pricing and availability.`,
  );

  const normalizedPhone = String(vendorPhone || "919999911111").replace(
    /\D/g,
    "",
  );
  const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

  const suggestedMessages = [
    `Hi ${vendorName || "seller"}, I’m interested in ${productName || "this product"} and would like to discuss pricing and availability.`,
    `Hello! I would like to know the minimum order quantity and bulk pricing for ${productName || "this product"}.`,
    `Hi, can you share the latest stock availability and delivery timeline for ${productName || "this product"}?`,
    `Hello, I’m comparing suppliers and would love to know your best offer for ${productName || "this product"}.`,
  ];

  const handleSelectSuggestion = (suggestion) => {
    setMessage(suggestion);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 bg-transparent text-espresso border border-sage/50 rounded-sm hover:bg-sage/10 transition-colors cursor-pointer"
        aria-label={`Discuss ${productName} with ${vendorName}`}
      >
        <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">
          Message
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-clay">
                  Direct WhatsApp
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  Message {vendorName || "the seller"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close message dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* <p className="mt-3 text-sm leading-6 text-slate-600">
              This frontend-only preview opens a WhatsApp chat with the seller using your drafted message.
            </p> */}

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">
                  Suggested messages
                </label>
                <span className="text-[11px] text-slate-400">Tap to use</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestedMessages.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="rounded-full border border-sage/40 bg-sage/5 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-clay hover:bg-clay/10 hover:text-clay"
                  >
                    {suggestion.length > 48
                      ? `${suggestion.slice(0, 48)}...`
                      : suggestion}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Your message
            </label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-clay focus:bg-white"
            />

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Preview only</span>
              <span>Opens in a new tab</span>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-sm border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <MessageSquare className="h-4 w-4" />
                Open WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactVendorBtn;
