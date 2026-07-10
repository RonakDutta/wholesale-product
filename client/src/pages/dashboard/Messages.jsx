// import { useState, useEffect, useRef } from "react";
// import { useSocket } from "../../context/SocketContext";
// import { Search, Send, Paperclip, MoreVertical, Building2 } from "lucide-react";

// const mockChats = [
// 	{
// 		id: 1,
// 		sender_name: "Rajesh Kumar",
// 		company: "PackRight India",
// 		lastMessage: "What is the best price for 5000 units?",
// 		timestamp: new Date().toISOString(), // or "2025-01-15T10:24:00"
// 		unread: 2,
// 	},
// 	{
// 		id: 2,
// 		sender_name: "Amit Singh",
// 		company: "LogiPal Solutions",
// 		lastMessage: "The payment has been processed.",
// 		timestamp: new Date(Date.now() - 3600000).toISOString(),
// 		unread: 0,
// 	},
// 	{
// 		id: 3,
// 		sender_name: "Priya Sharma",
// 		company: "Global Exports Ltd.",
// 		lastMessage: "Can you arrange expedited shipping to Delhi?",
// 		timestamp: new Date(Date.now() - 86400000).toISOString(),
// 		unread: 0,
// 	},
// ];

// const mockConversation = [
// 	{
// 		id: 1,
// 		sender_id: 1, // the other user (Rajesh)
// 		message_text:
// 			"Hello! I am interested in your Premium Industrial Packaging Cartons.",
// 		created_at: new Date(Date.now() - 3600000).toISOString(),
// 	},
// 	{
// 		id: 2,
// 		sender_id: 1,
// 		message_text: "What is the best price for 5000 units?",
// 		created_at: new Date(Date.now() - 1800000).toISOString(),
// 	},
// 	{
// 		id: 3,
// 		sender_id: "me", // sent by the current user (will be styled as sent)
// 		message_text: "We can offer $2.50 per unit for bulk orders.",
// 		created_at: new Date(Date.now() - 600000).toISOString(),
// 	},
// ];

// const Messages = () => {
// 	const socket = useSocket();
// 	const [chats, setChats] = useState([]); // list of conversations
// 	const [activeChatId, setActiveChatId] = useState(null);
// 	const [conversation, setConversation] = useState([]);
// 	const [messageInput, setMessageInput] = useState("");
// 	const [loading, setLoading] = useState(true);
// 	const messagesEndRef = useRef(null);

// 	// 1. Fetch all chats (mock)
// 	useEffect(() => {
// 		const fetchChats = async () => {
// 			setLoading(true);
// 			// Use mock data
// 			setChats(mockChats);
// 			if (mockChats.length > 0) {
// 				setActiveChatId(mockChats[0].id);
// 			}
// 			setLoading(false);
// 		};
// 		fetchChats();
// 	}, []);

// 	// 2. Fetch conversation when activeChatId changes (mock)
// 	useEffect(() => {
// 		if (!activeChatId) return;
// 		// Simulate loading conversation – you could filter by sender_id if you want
// 		setConversation(mockConversation);
// 	}, [activeChatId]);

// 	// 3. Socket listeners
// 	useEffect(() => {
// 		if (!socket) return;

// 		// New message from someone else (or echo from ourselves)
// 		const handleNewMessage = (msg) => {
// 			// Update chat list: increment unread if not active, move to top
// 			setChats((prev) => {
// 				const updated = prev.map((chat) => {
// 					if (chat.id === msg.sender_id) {
// 						return {
// 							...chat,
// 							lastMessage: msg.message_text,
// 							unread: chat.unread + 1,
// 							timestamp: msg.created_at,
// 						};
// 					}
// 					return chat;
// 				});
// 				// Sort by latest timestamp
// 				return updated.sort(
// 					(a, b) => new Date(b.timestamp) - new Date(a.timestamp),
// 				);
// 			});

// 			// If the active chat is with the sender, append to conversation
// 			if (activeChatId === msg.sender_id) {
// 				setConversation((prev) => [...prev, { ...msg, type: "received" }]);
// 			}
// 		};

// 		socket.on("new_message", handleNewMessage);
// 		socket.on("message_sent", (msg) => {
// 			// echo from server – we already added it via handleNewMessage, but you can also handle separately
// 		});

// 		return () => {
// 			socket.off("new_message", handleNewMessage);
// 			socket.off("message_sent");
// 		};
// 	}, [socket, activeChatId]);

// 	// Scroll to bottom when conversation updates
// 	useEffect(() => {
// 		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
// 	}, [conversation]);

// 	// 4. Send a message
// 	const handleSend = () => {
// 		if (!messageInput.trim() || !socket || !activeChatId) return;
// 		const text = messageInput.trim();
// 		// Optimistically add to UI
// 		const tempMsg = {
// 			id: Date.now(),
// 			sender_id: "me", // will be replaced by server
// 			receiver_id: activeChatId,
// 			message_text: text,
// 			created_at: new Date().toISOString(),
// 			type: "sent",
// 		};
// 		setConversation((prev) => [...prev, tempMsg]);
// 		socket.emit("send_message", { receiverId: activeChatId, text });
// 		setMessageInput("");
// 	};

// 	// Helper to find active chat details
// 	const activeChat = chats.find((chat) => chat.id === activeChatId);

// 	if (loading) return <div>Loading messages...</div>;

// 	return (
// 		<div className="h-[calc(100vh-8rem)] max-w-6xl mx-auto flex flex-col lg:flex-row bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
// 			{/* Sidebar */}
// 			<div className="w-full lg:w-80 border-r border-slate-200 flex flex-col shrink-0">
// 				<div className="p-4 border-b border-slate-100">
// 					<h2 className="text-xl font-black text-espresso mb-4">Messages</h2>
// 					<div className="relative">
// 						<Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
// 						<input
// 							type="text"
// 							placeholder="Search conversations..."
// 							className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-clay focus:ring-1 focus:ring-clay outline-none transition-all"
// 						/>
// 					</div>
// 				</div>
// 				<div className="flex-1 overflow-y-auto">
// 					{chats.map((chat) => (
// 						<div
// 							key={chat.id}
// 							onClick={() => setActiveChatId(chat.id)}
// 							className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${
// 								activeChatId === chat.id
// 									? "bg-clay/5 border-l-2 border-l-clay"
// 									: "hover:bg-slate-50 border-l-2 border-l-transparent"
// 							}`}
// 						>
// 							<div className="flex justify-between items-start mb-1">
// 								<h3 className="font-bold text-sm text-espresso truncate">
// 									{chat.sender_name}
// 								</h3>
// 								<span
// 									className={`text-[10px] font-semibold ${chat.unread ? "text-clay" : "text-slate-400"}`}
// 								>
// 									{new Date(chat.timestamp).toLocaleTimeString()}
// 								</span>
// 							</div>
// 							<div className="flex items-center gap-1.5 mb-2">
// 								<Building2 className="w-3 h-3 text-slate-400" />
// 								<span className="text-xs font-semibold text-slate-500">
// 									{chat.company}
// 								</span>
// 							</div>
// 							<div className="flex justify-between items-center">
// 								<p
// 									className={`text-xs truncate max-w-50 ${chat.unread ? "font-bold text-slate-800" : "text-slate-500"}`}
// 								>
// 									{chat.lastMessage}
// 								</p>
// 								{chat.unread > 0 && (
// 									<span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shrink-0">
// 										{chat.unread}
// 									</span>
// 								)}
// 							</div>
// 						</div>
// 					))}
// 				</div>
// 			</div>

// 			{/* Main Chat Area */}
// 			<div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
// 				{/* Header */}
// 				<div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
// 					<div className="flex items-center gap-3">
// 						<div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
// 							{activeChat?.sender_name?.[0] || "?"}
// 						</div>
// 						<div>
// 							<h3 className="font-black text-espresso text-base">
// 								{activeChat?.sender_name || "Select a chat"}
// 							</h3>
// 							<p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
// 								<Building2 className="w-3 h-3" /> {activeChat?.company || ""}
// 							</p>
// 						</div>
// 					</div>
// 					<button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
// 						<MoreVertical className="w-5 h-5" />
// 					</button>
// 				</div>

// 				{/* Messages */}
// 				<div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
// 					{conversation.map((msg) => (
// 						<div
// 							key={msg.id}
// 							className={`flex ${msg.sender_id === "me" ? "justify-end" : "justify-start"}`}
// 						>
// 							<div
// 								className={`max-w-[75%] rounded-2xl px-4 py-3 ${
// 									msg.sender_id === "me"
// 										? "bg-clay text-white rounded-br-none shadow-sm"
// 										: "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
// 								}`}
// 							>
// 								<p className="text-sm">{msg.message_text}</p>
// 								<p
// 									className={`text-[10px] mt-1.5 text-right font-medium ${
// 										msg.sender_id === "me" ? "text-white/70" : "text-slate-400"
// 									}`}
// 								>
// 									{new Date(msg.created_at).toLocaleTimeString()}
// 								</p>
// 							</div>
// 						</div>
// 					))}
// 					<div ref={messagesEndRef} />
// 				</div>

// 				{/* Input */}
// 				<div className="p-4 bg-white border-t border-slate-200 shrink-0">
// 					<div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-clay focus-within:ring-1 focus-within:ring-clay transition-all">
// 						<button className="p-2.5 text-slate-400 hover:text-clay hover:bg-white rounded-lg transition-colors shrink-0">
// 							<Paperclip className="w-5 h-5" />
// 						</button>
// 						<textarea
// 							rows="1"
// 							placeholder="Type your message..."
// 							value={messageInput}
// 							onChange={(e) => setMessageInput(e.target.value)}
// 							onKeyDown={(e) =>
// 								e.key === "Enter" && !e.shiftKey && handleSend()
// 							}
// 							className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 resize-none text-sm text-slate-900 py-2.5 px-2 outline-none"
// 						/>
// 						<button
// 							onClick={handleSend}
// 							className="p-2.5 bg-clay text-white hover:bg-espresso rounded-lg transition-colors shrink-0 shadow-sm"
// 						>
// 							<Send className="w-4 h-4" />
// 						</button>
// 					</div>
// 				</div>
// 			</div>
// 		</div>
// 	);
// };

// export default Messages;
import { useState, useEffect, useRef } from "react";
import {
	Search,
	MoreVertical,
	Building2,
	MessageSquareText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext"; // adjust to your actual auth hook
import { useChatList } from "../../hooks/useChatList";
import { useConversation } from "../../hooks/useConversation";
import MessageBubble from "../../components/MessageBubble";
import MessageInput from "../../components/MessageInput";
import { useLocation, useNavigate, useParams } from "react-router";

const timeAgo = (iso) => {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "now";
	if (mins < 60) return `${mins}m`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h`;
	return new Date(iso).toLocaleDateString([], {
		month: "short",
		day: "numeric",
	});
};

const ChatListItem = ({ chat, active, onClick }) => (
	<div
		onClick={onClick}
		className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${
			active
				? "bg-clay/5 border-l-2 border-l-clay"
				: "hover:bg-slate-50 border-l-2 border-l-transparent"
		}`}
	>
		<div className="flex justify-between items-start mb-1 gap-2">
			<h3 className="font-bold text-sm text-espresso truncate">
				{chat.sender_name}
			</h3>
			<span
				className={`text-[10px] font-semibold shrink-0 ${
					chat.unread ? "text-clay" : "text-slate-400"
				}`}
			>
				{chat.timestamp ? timeAgo(chat.timestamp) : ""}
			</span>
		</div>
		<div className="flex items-center gap-1.5 mb-2">
			<Building2 className="w-3 h-3 text-slate-400 shrink-0" />
			<span className="text-xs font-semibold text-slate-500 truncate">
				{chat.company}
			</span>
		</div>
		<div className="flex justify-between items-center gap-2">
			<p
				className={`text-xs truncate ${
					chat.unread ? "font-bold text-slate-800" : "text-slate-500"
				}`}
			>
				{chat.lastMessage || "No messages yet"}
			</p>
			{chat.unread > 0 && (
				<span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shrink-0">
					{chat.unread}
				</span>
			)}
		</div>
	</div>
);

const Messages = () => {
	const { user } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const { vendorId } = useParams();
	const { chats, loading: chatsLoading, clearUnread } = useChatList();
	const [activeChatId, setActiveChatId] = useState(null);
	const [pendingChat, setPendingChat] = useState(null);
	const [search, setSearch] = useState("");
	const messagesEndRef = useRef(null);

	const { messages, sendMessage } = useConversation(activeChatId, user?.id);

	useEffect(() => {
		const incoming = location.state?.openChat;
		if (!vendorId) return;

		setActiveChatId(vendorId);
		setPendingChat({
			user_id: vendorId,
			sender_name: location.state?.vendorName || "Vendor",
			company: location.state?.company,
			lastMessage: location.state?.productName
				? `Re: ${location.state.productName}`
				: "",
			timestamp: null,
			unread: 0,
		});

		// clear the state so refreshing/back-nav doesn't re-trigger this
		navigate(location.pathname, { replace: true, state: {} });
	}, [location.state, navigate, location.pathname]);

	// default to first chat once loaded
	useEffect(() => {
		if (!activeChatId && !pendingChat && chats.length > 0) {
			setActiveChatId(chats[0].user_id);
		}
	}, [chats, activeChatId, pendingChat]);

	// once the vendor shows up in the real chat list (message actually sent),
	// drop the synthetic pending entry and use the real one
	useEffect(() => {
		if (pendingChat && chats.some((c) => c.user_id === pendingChat.user_id)) {
			setPendingChat(null);
		}
	}, [chats, pendingChat]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSelectChat = (userId) => {
		setActiveChatId(userId);
		setPendingChat(null);
		clearUnread(userId);
		navigate(`/dashboard/messages/${userId}`, { replace: true });
	};

	const activeChat =
		chats.find((c) => c.user_id === activeChatId) ??
		(pendingChat?.user_id === activeChatId ? pendingChat : null);

	const filteredChats = chats.filter((c) =>
		`${c.sender_name} ${c.company}`
			.toLowerCase()
			.includes(search.toLowerCase()),
	);

	if (chatsLoading) {
		return (
			<div className="h-[calc(100vh-8rem)] max-w-6xl mx-auto flex items-center justify-center text-sm text-slate-400">
				Loading messages...
			</div>
		);
	}

	return (
		<div className="h-[calc(100vh-8rem)] max-w-6xl mx-auto flex flex-col lg:flex-row bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
			{/* Sidebar */}
			<div className="w-full lg:w-80 border-r border-slate-200 flex flex-col shrink-0">
				<div className="p-4 border-b border-slate-100">
					<h2 className="text-xl font-black text-espresso mb-4">Messages</h2>
					<div className="relative">
						<Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search conversations..."
							className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-clay focus:ring-1 focus:ring-clay outline-none transition-all"
						/>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto">
					{/* pending (new, unsaved) chat pinned at top */}
					{pendingChat && (
						<ChatListItem
							chat={pendingChat}
							active={activeChatId === pendingChat.user_id}
							onClick={() => handleSelectChat(pendingChat.user_id)}
						/>
					)}

					{filteredChats.length === 0 && !pendingChat ? (
						<div className="p-8 text-center text-xs text-slate-400">
							{chats.length === 0 ? "No conversations yet" : "No matches found"}
						</div>
					) : (
						filteredChats.map((chat) => (
							<ChatListItem
								key={chat.user_id}
								chat={chat}
								active={activeChatId === chat.user_id}
								onClick={() => handleSelectChat(chat.user_id)}
							/>
						))
					)}
				</div>
			</div>

			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
				{activeChat ? (
					<>
						<div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
									{activeChat.sender_name?.[0] || "?"}
								</div>
								<div>
									<h3 className="font-black text-espresso text-base">
										{activeChat.sender_name}
									</h3>
									<p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
										<Building2 className="w-3 h-3" /> {activeChat.company}
									</p>
								</div>
							</div>
							<button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
								<MoreVertical className="w-5 h-5" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col">
							{messages.length === 0 ? (
								<div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
									<MessageSquareText className="h-9 w-9 text-slate-200" />
									<p className="text-xs text-slate-400">
										Say hello to {activeChat.sender_name}
									</p>
								</div>
							) : (
								messages.map((msg, i) => {
									const prev = messages[i - 1];
									const next = messages[i + 1];
									const isOwn = msg.sender_id === user?.id;
									const isFirstInGroup =
										!prev || prev.sender_id !== msg.sender_id;
									const isLastInGroup =
										!next || next.sender_id !== msg.sender_id;

									return (
										<MessageBubble
											key={msg.id}
											message={msg}
											isOwn={isOwn}
											isFirstInGroup={isFirstInGroup}
											isLastInGroup={isLastInGroup}
											showAvatar={!isOwn && isLastInGroup}
											avatarLabel={activeChat.sender_name?.[0] || "?"}
										/>
									);
								})
							)}
							<div ref={messagesEndRef} />
						</div>

						<div className="p-4 bg-white border-t border-slate-200 shrink-0">
							<MessageInput onSend={sendMessage} disabled={!activeChatId} />
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-sm text-slate-400">
						Select a conversation to start messaging
					</div>
				)}
			</div>
		</div>
	);
};

export default Messages;
