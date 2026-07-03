import React from "react";
import { MessageSquare } from "lucide-react";

const ContactVendorBtn = ({ vendorId, vendorName, productName }) => {
  const handleChatRouting = () => {
    console.log(
      `Routing to chat for vendor ${vendorId} regarding ${productName}`,
    );
  };

  return (
    <button
      onClick={handleChatRouting}
      className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 bg-transparent text-espresso border border-sage/50 rounded-sm hover:bg-sage/10 transition-colors cursor-pointer"
      aria-label={`Discuss ${productName} with ${vendorName}`}
    >
      <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">
        Message
      </span>
    </button>
  );
};

export default ContactVendorBtn;
