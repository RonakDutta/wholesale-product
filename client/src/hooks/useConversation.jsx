import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "../context/SocketContext";

export function useConversation(receiverId, currentUserId) {
	const socket = useSocket();
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(false);
	const receiverIdRef = useRef(receiverId);
	receiverIdRef.current = receiverId;

	useEffect(() => {
		if (!receiverId) return;
		let cancelled = false;

		const load = async () => {
			setLoading(true);
			try {
				const res = await fetch(`/api/messages/${receiverId}`, {
					headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
				});
				const data = await res.json();
				if (!cancelled) setMessages(data);

				// mark as read, fire-and-forget
				fetch(`/api/messages/${receiverId}/read`, {
					method: "PATCH",
					headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
				}).catch(() => {});
			} catch (err) {
				console.error("Failed to fetch messages", err);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [receiverId]);

	// Socket subscriptions
	useEffect(() => {
		if (!socket) return;

		const handleNewMessage = (msg) => {
			if (
				msg.sender_id === receiverIdRef.current ||
				msg.receiver_id === receiverIdRef.current
			) {
				setMessages((prev) => [...prev, msg]);
			}
		};

		const handleMessageSent = (msg) => {
			// reconcile optimistic temp message with the real server one
			setMessages((prev) =>
				prev.map((m) => (m.tempId && m.tempId === msg.tempId ? msg : m)),
			);
		};

		socket.on("new_message", handleNewMessage);
		socket.on("message_sent", handleMessageSent);
		return () => {
			socket.off("new_message", handleNewMessage);
			socket.off("message_sent", handleMessageSent);
		};
	}, [socket]);

	const sendMessage = useCallback(
		(text) => {
			if (!text.trim() || !socket || !receiverId) return;
			const tempId = `temp-${Date.now()}`;
			const optimisticMsg = {
				id: tempId,
				tempId,
				sender_id: currentUserId,
				receiver_id: receiverId,
				message_text: text.trim(),
				created_at: new Date().toISOString(),
			};
			setMessages((prev) => [...prev, optimisticMsg]);
			socket.emit("send_message", { receiverId, text: text.trim(), tempId });
		},
		[socket, receiverId, currentUserId],
	);

	return { messages, loading, sendMessage };
}
