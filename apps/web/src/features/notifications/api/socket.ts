import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

const API_URL = import.meta.env.VITE_API_URL || "";

export const connectNotificationSocket = (): Socket => {
	if (socket?.connected) return socket;
	socket = io(`${API_URL}/notifications`, {
		path: "/socket.io",
		transports: ["polling", "websocket"],
		withCredentials: true,
	});
	return socket;
};

export const getNotificationSocket = () => socket;

export const disconnectNotificationSocket = () => {
	socket?.disconnect();
	socket = null;
};
