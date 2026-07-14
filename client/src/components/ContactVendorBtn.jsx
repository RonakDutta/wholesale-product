import { useState } from "react";
import { MessageSquare } from "lucide-react";
import ContactChoiceModal from "./ContactChoiceModal";
import WhatsAppModal from "./WhatsAppModal";

const ContactVendorBtn = ({
  vendorId,
  vendorName,
  company,
  productName,
  vendorPhone,
  productImage,
  trigger,
}) => {
  const [view, setView] = useState(null); // null | "choice" | "whatsapp"
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
          vendorId={vendorId}
          vendorName={vendorName}
          company={company}
          productName={productName}
          onClose={() => setView(null)}
          onSelectWhatsApp={() => setView("whatsapp")}
        />
      )}

      {view === "whatsapp" && (
        <WhatsAppModal
          vendorId={vendorId}
          vendorName={vendorName}
          productName={productName}
          vendorPhone={vendorPhone}
          productImage={productImage}
          onBack={() => setView("choice")}
          onClose={() => setView(null)}
        />
      )}
    </>
  );
};

export default ContactVendorBtn;
