import { io } from "socket.io-client";

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.X:3000"; // ⚠️ change to your IP

const socket = io(SOCKET_URL, {
  autoConnect: false, 
});

export default socket;