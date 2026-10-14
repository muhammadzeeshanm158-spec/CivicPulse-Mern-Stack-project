import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        process.env.CLIENT_URL || "http://localhost:5173"
      ],
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // 🔐 Handshake Auth Middleware - PDF: JWT on handshake mandatory
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
    if (!token) return next(new Error("Authentication error: Token missing! ❌"));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token! 🚫"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.user?.id;
    console.log(`⚡ User connected: ID ${userId} (Socket ID: ${socket.id})`);

    // ✅ Colon format `user:` - Controller aur Scheduler ke sath match
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined personal room: user:${userId}`);
    }

    // Issue room - Live tracking/comments ke liye
    socket.on("join_issue_room", (issueId: string) => {
      socket.join(`issue:${issueId}`);
      console.log(`🔌 User ${userId} joined issue room: issue:${issueId}`);
    });

    socket.on("leave_issue_room", (issueId: string) => {
      socket.leave(`issue:${issueId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Global getter - Controllers se emit karne ke liye
export const getIO = (): Server => {
  if (!io) throw new Error("Socket.io not initialized! ❌");
  return io;
};