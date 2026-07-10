import { io } from "socket.io-client";

let socket = null;

export const getSocket = (token) => {
	if (socket && socket.auth?.token !== token) {
		socket.disconnect();
		socket = null;
	}
	if (!socket) {
		socket = io(import.meta.env.VITE_API_BASE_URL, {
			auth: { token },
			autoConnect: true,
		});
	}
	return socket;
};
export const disconnectSocket = () => {
	socket?.disconnect();
	socket = null;
};
