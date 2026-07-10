import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const token = localStorage.getItem("token");

	useEffect(() => {
		if (!token) return;

		const newSocket = io(
			import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
			{
				auth: { token },
				withCredentials: true,
			},
		);

		setSocket(newSocket);

		return () => {
			newSocket.disconnect();
		};
	}, [token]);

	return (
		<SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
	);
};

export const useSocket = () => useContext(SocketContext);
