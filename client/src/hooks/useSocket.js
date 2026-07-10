import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let socket; // module-level singleton, shared across components

export const getSocket = (token) => {
	if (!socket) {
		socket = io(import.meta.env.VITE_SOCKET_URL, {
			auth: { token },
			autoConnect: true,
		});
	}
	return socket;
};
