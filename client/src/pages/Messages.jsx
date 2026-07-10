import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { Search, Send, Paperclip, MoreVertical, Building2 } from "lucide-react";

const mockChats = [
  {
    id: "1",
    sender_name: "Rajesh Kumar",
    company: "PackRight India",
    lastMessage: "What is the best price for 5000 units?",
    timestamp: new Date().toISOString(),
    unread: 2,
  },
  {
    id: "2",
    sender_name: "Amit Singh",
    company: "LogiPal Solutions",
    lastMessage: "The payment has been processed.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    unread: 0,
  },
];

const mockConversation = [
  {
    id: 1,
    sender_id: "1",
    message_text:
      "Hello! I am interested in your Premium Industrial Packaging Cartons.",
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    sender_id: "1",
    message_text: "What is the best price for 5000 units?",
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 3,
    sender_id: "me",
    message_text: "We can offer $2.50 per unit for bulk orders.",
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
];

const Messages = () => {
  const [searchParams] = useSearchParams();
  const socket = useSocket();

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // 1. Fetch all chats
  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      setChats(mockChats);

      // Check if we came from a product page with a specific vendor ID
      const vendorIdFromUrl = searchParams.get("vendorId");

      if (vendorIdFromUrl) {
        // Optionally: If vendor isn't in chat list yet, you'd add a temporary chat object here
        setActiveChatId(String(vendorIdFromUrl));
      } else if (mockChats.length > 0) {
        setActiveChatId(mockChats[0].id);
      }
      setLoading(false);
    };
    fetchChats();
  }, [searchParams]);

  // 2. Fetch conversation
  useEffect(() => {
    if (!activeChatId) return;
    // Simulated DB fetch
    setConversation(mockConversation);
  }, [activeChatId]);

  // 3. Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setChats((prev) => {
        const updated = prev.map((chat) => {
          if (chat.id === msg.sender_id) {
            return {
              ...chat,
              lastMessage: msg.message_text,
              unread:
                activeChatId === msg.sender_id ? chat.unread : chat.unread + 1,
              timestamp: msg.created_at,
            };
          }
          return chat;
        });
        return updated.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );
      });

      if (activeChatId === msg.sender_id) {
        setConversation((prev) => [...prev, { ...msg, type: "received" }]);
      }
    };

    socket.on("new_message", handleNewMessage);
    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSend = () => {
    if (!messageInput.trim() || !socket || !activeChatId) return;
    const text = messageInput.trim();
    const tempMsg = {
      id: Date.now(),
      sender_id: "me",
      receiver_id: activeChatId,
      message_text: text,
      created_at: new Date().toISOString(),
      type: "sent",
    };
    setConversation((prev) => [...prev, tempMsg]);
    socket.emit("send_message", { receiverId: activeChatId, text });
    setMessageInput("");
  };

  const activeChat = chats.find((chat) => chat.id === activeChatId);

  if (loading)
    return <div className="p-10 text-center">Loading messages...</div>;

  return (
    <div className="h-[calc(100vh-8rem)] max-w-6xl mx-auto flex flex-col lg:flex-row bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-6">
      {/* Sidebar */}
      <div className="w-full lg:w-80 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xl font-black text-espresso mb-4">Messages</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-clay focus:ring-1 focus:ring-clay outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${
                activeChatId === chat.id
                  ? "bg-clay/5 border-l-2 border-l-clay"
                  : "hover:bg-slate-50 border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm text-espresso truncate">
                  {chat.sender_name}
                </h3>
                <span
                  className={`text-[10px] font-semibold ${chat.unread ? "text-clay" : "text-slate-400"}`}
                >
                  {new Date(chat.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">
                  {chat.company}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p
                  className={`text-xs truncate max-w-50 ${chat.unread ? "font-bold text-slate-800" : "text-slate-500"}`}
                >
                  {chat.lastMessage}
                </p>
                {chat.unread > 0 && (
                  <span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shrink-0">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
              {activeChat?.sender_name?.[0] || "?"}
            </div>
            <div>
              <h3 className="font-black text-espresso text-base">
                {activeChat?.sender_name || "Select a chat"}
              </h3>
              {activeChat?.company && (
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3 h-3" /> {activeChat.company}
                </p>
              )}
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === "me" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.sender_id === "me"
                    ? "bg-clay text-white rounded-br-none shadow-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
                }`}
              >
                <p className="text-sm">{msg.message_text}</p>
                <p
                  className={`text-[10px] mt-1.5 font-medium ${
                    msg.sender_id === "me"
                      ? "text-right text-white/70"
                      : "text-left text-slate-400"
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-clay focus-within:ring-1 focus-within:ring-clay transition-all">
            <button className="p-2.5 text-slate-400 hover:text-clay hover:bg-white rounded-lg transition-colors shrink-0">
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              rows="1"
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !e.shiftKey &&
                (e.preventDefault(), handleSend())
              }
              className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 resize-none text-sm text-slate-900 py-2.5 px-2 outline-none"
            />
            <button
              onClick={handleSend}
              className="p-2.5 bg-clay text-white hover:bg-espresso rounded-lg transition-colors shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
