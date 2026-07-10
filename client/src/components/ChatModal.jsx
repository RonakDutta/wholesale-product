// import { useState, useEffect, useRef } from "react";
// import {
// 	Send,
// 	ArrowLeft,
// 	X,
// 	ShieldCheck,
// 	MessageSquareText,
// } from "lucide-react";
// import ModalShell from "./ModalShell";
// import { useSocket } from "../context/SocketContext";

// const ChatModal = ({
// 	vendorName,
// 	productName,
// 	onBack,
// 	onClose,
// 	receiverId,
// 	userId,
// }) => {
// 	const socket = useSocket();
// 	const [messages, setMessages] = useState([]);
// 	const [draft, setDraft] = useState("");
// 	const messagesEndRef = useRef(null);

// 	// 1. Fetch message history (REST)
// 	useEffect(() => {
// 		const fetchHistory = async () => {
// 			try {
// 				const res = await fetch(`/api/messages/${receiverId}`, {
// 					headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
// 				});
// 				const data = await res.json();
// 				setMessages(data);
// 			} catch (err) {
// 				console.error("Failed to fetch messages", err);
// 			}
// 		};
// 		if (receiverId) fetchHistory();
// 	}, [receiverId]);

// 	// 2. Socket listeners
// 	useEffect(() => {
// 		if (!socket) return;

// 		const handleNewMessage = (msg) => {
// 			// Only add if it's from the same receiver (or to us)
// 			if (msg.sender_id === receiverId || msg.receiver_id === receiverId) {
// 				setMessages((prev) => [...prev, msg]);
// 			}
// 		};

// 		socket.on("new_message", handleNewMessage);
// 		socket.on("message_sent", (msg) => {
// 			// echo from server – we can add it, but it's already added optimistically
// 			// You might want to replace the optimistic message with the server version.
// 			setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
// 		});

// 		return () => {
// 			socket.off("new_message", handleNewMessage);
// 			socket.off("message_sent");
// 		};
// 	}, [socket, receiverId]);

// 	// Scroll to bottom
// 	useEffect(() => {
// 		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
// 	}, [messages]);

// 	const handleSend = () => {
// 		if (!draft.trim() || !socket) return;
// 		const text = draft.trim();

// 		// Optimistic addition
// 		const tempMsg = {
// 			id: Date.now(),
// 			sender_id: "me",
// 			receiver_id: receiverId,
// 			message_text: text,
// 			created_at: new Date().toISOString(),
// 		};
// 		setMessages((prev) => [...prev, tempMsg]);
// 		socket.emit("send_message", { receiverId, text });
// 		setDraft("");
// 	};

// 	// System message (display at top)
// 	const systemText = `You're starting a conversation with ${vendorName || "the seller"} about ${productName || "this product"}.`;

// 	return (
// 		<ModalShell onClose={onClose}>
// 			<div className="flex h-[70vh] sm:h-140 flex-col">
// 				<div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
// 					<button
// 						type="button"
// 						onClick={onBack}
// 						className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
// 					>
// 						<ArrowLeft className="h-3.5 w-3.5" />
// 						Back
// 					</button>
// 					<div className="text-center">
// 						<p className="text-sm font-bold text-slate-900">
// 							{vendorName || "Seller"}
// 						</p>
// 						<p className="text-[10px] text-slate-400 truncate max-w-40">
// 							{productName}
// 						</p>
// 					</div>
// 					<button
// 						onClick={onClose}
// 						className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
// 						aria-label="Close"
// 					>
// 						<X className="h-4 w-4" />
// 					</button>
// 				</div>

// 				<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
// 					{messages.length === 0 ? (
// 						<div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
// 							<MessageSquareText className="h-9 w-9 text-slate-200" />
// 							<p className="max-w-55 text-xs text-slate-400">{systemText}</p>
// 						</div>
// 					) : (
// 						<>
// 							{/* system message */}
// 							<div className="mx-auto max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-center text-[11px] text-slate-500">
// 								{systemText}
// 							</div>
// 							{/* {messages.map((m) => (
// 								<div
// 									key={m.id}
// 									className={`max-w-[75%] ${
// 										m.sender_id === "me" || m.sender_id === userId
// 											? "self-end bg-clay text-white rounded-lg px-3 py-2 text-sm"
// 											: "self-start bg-slate-100 text-slate-800 rounded-lg px-3 py-2 text-sm"
// 									}`}
// 								>
// 									{m.message_text}
// 								</div>
// 							))} */}
// 							{messages.map((msg, i) => {
// 								const prev = messages[i - 1];
// 								const next = messages[i + 1];
// 								const isOwn = msg.sender_id === currentUserId;
// 								const isFirstInGroup =
// 									!prev || prev.sender_id !== msg.sender_id;
// 								const isLastInGroup = !next || next.sender_id !== msg.sender_id;

// 								return (
// 									<MessageBubble
// 										key={msg.id}
// 										message={msg}
// 										isOwn={isOwn}
// 										isFirstInGroup={isFirstInGroup}
// 										isLastInGroup={isLastInGroup}
// 										showAvatar={!isOwn && isLastInGroup}
// 										avatarLabel={activeChat?.sender_name?.[0] || "?"}
// 									/>
// 								);
// 							})}
// 							<div ref={messagesEndRef} />
// 						</>
// 					)}
// 				</div>

// 				<div className="border-t border-slate-100 p-3">
// 					<div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-400">
// 						<ShieldCheck className="h-3 w-3 shrink-0" />
// 						Real-time delivery is coming soon — the vendor won't see this yet.
// 					</div>
// 					<div className="flex gap-2">
// 						<input
// 							value={draft}
// 							onChange={(e) => setDraft(e.target.value)}
// 							onKeyDown={(e) => e.key === "Enter" && handleSend()}
// 							placeholder="Type a message..."
// 							className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-clay"
// 						/>
// 						<button
// 							onClick={handleSend}
// 							className="flex items-center justify-center rounded-lg bg-clay px-3 text-white"
// 							aria-label="Send message"
// 						>
// 							<Send className="h-4 w-4" />
// 						</button>
// 					</div>
// 				</div>
// 			</div>
// 		</ModalShell>
// 	);
// };

// export default ChatModal;
import { useEffect, useRef } from "react";
import { ArrowLeft, X, ShieldCheck, MessageSquareText } from "lucide-react";
import ModalShell from "./ModalShell";
import { useConversation } from "../hooks/useConversation";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";

const ChatModal = ({
	vendorName,
	productName,
	onBack,
	onClose,
	receiverId,
	userId,
}) => {
	const { messages, sendMessage } = useConversation(receiverId, userId);
	const messagesEndRef = useRef(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const systemText = `You're starting a conversation with ${vendorName || "the seller"} about ${productName || "this product"}.`;

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

				<div className="flex-1 overflow-y-auto p-4 flex flex-col">
					{messages.length === 0 ? (
						<div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
							<MessageSquareText className="h-9 w-9 text-slate-200" />
							<p className="max-w-55 text-xs text-slate-400">{systemText}</p>
						</div>
					) : (
						<>
							<div className="mx-auto max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 mb-1 text-center text-[11px] text-slate-500">
								{systemText}
							</div>
							{messages.map((msg, i) => {
								const prev = messages[i - 1];
								const next = messages[i + 1];
								const isOwn = msg.sender_id === userId;
								const isFirstInGroup =
									!prev || prev.sender_id !== msg.sender_id;
								const isLastInGroup = !next || next.sender_id !== msg.sender_id;

								return (
									<MessageBubble
										key={msg.id}
										message={msg}
										isOwn={isOwn}
										isFirstInGroup={isFirstInGroup}
										isLastInGroup={isLastInGroup}
										showAvatar={!isOwn && isLastInGroup}
										avatarLabel={vendorName?.[0] || "?"}
									/>
								);
							})}
							<div ref={messagesEndRef} />
						</>
					)}
				</div>

				<div className="border-t border-slate-100 p-3">
					<div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-400">
						<ShieldCheck className="h-3 w-3 shrink-0" />
						Real-time delivery is coming soon — the vendor won't see this yet.
					</div>
					<MessageInput onSend={sendMessage} disabled={!receiverId} />
				</div>
			</div>
		</ModalShell>
	);
};

export default ChatModal;
