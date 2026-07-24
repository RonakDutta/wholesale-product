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
			// receiverId may be a string (from the URL param) or a number
			// (from the chat list); coerce so the comparison is reliable.
			const rid = Number(receiverIdRef.current);
			if (msg.sender_id === rid || msg.receiver_id === rid) {
				setMessages((prev) => [...prev, msg]);
			}
		};

		const handleMessageSent = (msg) => {
			// reconcile optimistic temp message with the real server one
			setMessages((prev) =>
				prev.map((m) => (m.tempId && m.tempId === msg.tempId ? msg : m)),
			);
		};

		const handleMessageError = ({ tempId }) => {
			// drop the optimistic message that failed to send
			if (!tempId) return;
			setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
		};

		socket.on("new_message", handleNewMessage);
		socket.on("message_sent", handleMessageSent);
		socket.on("message_error", handleMessageError);
		return () => {
			socket.off("new_message", handleNewMessage);
			socket.off("message_sent", handleMessageSent);
			socket.off("message_error", handleMessageError);
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
