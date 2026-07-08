import { useState } from "react";
import { MessageSquare } from "lucide-react";
import ContactChoiceModal from "./ContactChoiceModal";
import ChatModal from "./ChatModal";
import WhatsAppModal from "./WhatsAppModal";

const ContactVendorBtn = ({
  vendorId,
  vendorName,
  productName,
  vendorPhone,
  trigger,
}) => {
  const [view, setView] = useState(null); // null | "choice" | "whatsapp" | "chat"
  const openChoice = () => setView("choice");

  return (
    <>
      {trigger ? (
        trigger(openChoice)
      ) : (
        <button
          type="button"
          onClick={openChoice}
          className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 bg-transparent text-espresso border border-sage/50 rounded-sm hover:bg-sage/10 transition-colors cursor-pointer"
          aria-label={`Contact ${vendorName} about ${productName}`}
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">
            Message
          </span>
        </button>
      )}

      {view === "choice" && (
        <ContactChoiceModal
          vendorName={vendorName}
          onClose={() => setView(null)}
          onSelectWhatsApp={() => setView("whatsapp")}
          onSelectChat={() => setView("chat")}
        />
      )}
      {view === "whatsapp" && (
        <WhatsAppModal
          vendorName={vendorName}
          productName={productName}
          vendorPhone={vendorPhone}
          onBack={() => setView("choice")}
          onClose={() => setView(null)}
        />
      )}
      {view === "chat" && (
        <ChatModal
          vendorId={vendorId}
          vendorName={vendorName}
          productName={productName}
          onBack={() => setView("choice")}
          onClose={() => setView(null)}
        />
      )}
    </>
  );
};

export default ContactVendorBtn;
