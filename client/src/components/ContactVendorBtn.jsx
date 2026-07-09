import { useState } from "react";
import { MessageSquare } from "lucide-react";
import ContactChoiceModal from "./ContactChoiceModal";
import ChatModal from "./ChatModal";
import WhatsAppModal from "./WhatsAppModal";
import api from "../utils/axios";
import { toast } from "sonner";

const ContactVendorBtn = ({
  vendorId,
  vendorName,
  productName,
  vendorPhone,
  productId,
  trigger,
}) => {
  const [view, setView] = useState(null); // null | "choice" | "whatsapp" | "chat"
  const [loading, setLoading] = useState(false);
  const [dynamicWhatsappUrl, setDynamicWhatsappUrl] = useState(null);
  const openChoice = () => setView("choice");

  const handleWhatsAppClick = async () => {
    if (productId) {
      setLoading(true);
      try {
        const response = await api.get(`/api/products/${productId}/contact`, {
          params: { supplierId: vendorId }
        });

        if (response.data.success && response.data.whatsappUrl) {
          setDynamicWhatsappUrl(response.data.whatsappUrl);
          setView("whatsapp");
        } else {
          toast.error(response.data.message || 'Failed to generate WhatsApp link');
        }
      } catch (error) {
        console.error('Failed to contact supplier:', error);
        if (error.response?.status === 401) {
          toast.error('Please login to contact suppliers');
        } else if (error.response?.status === 403) {
          toast.error('Only buyers can contact suppliers');
        } else {
          toast.error('Failed to connect with supplier');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback to hardcoded phone if no productId
      setView("whatsapp");
    }
  };

  return (
    <>
      {trigger ? (
        trigger(openChoice)
      ) : (
        <button
          type="button"
          onClick={openChoice}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 bg-transparent text-espresso border border-sage/50 rounded-sm hover:bg-sage/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Contact ${vendorName} about ${productName}`}
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-espresso border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                Loading...
              </span>
            </>
          ) : (
            <>
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                Message
              </span>
            </>
          )}
        </button>
      )}

      {view === "choice" && (
        <ContactChoiceModal
          vendorName={vendorName}
          onClose={() => setView(null)}
          onSelectWhatsApp={handleWhatsAppClick}
          onSelectChat={() => setView("chat")}
        />
      )}
      {view === "whatsapp" && (
        <WhatsAppModal
          vendorName={vendorName}
          productName={productName}
          vendorPhone={vendorPhone}
          dynamicWhatsappUrl={dynamicWhatsappUrl}
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
