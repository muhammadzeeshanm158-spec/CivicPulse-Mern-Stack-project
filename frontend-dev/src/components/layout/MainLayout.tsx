import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useAuth } from "../../context/AuthContext";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Sidebar open/close state - user toggle kar sakta hai
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, token } = useAuth();

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // FIX: Socket real-time connection - Backend io.to(`user:${userId}`) se notification bhejta hai
  useEffect(() => {
    if (!user?.id || !token) return;

    // Socket connect - VITE_API_URL se base URL nikalo ( /api/v1 hata ke )
    const baseUrl = (import.meta as any).env.VITE_API_URL?.replace('/api/v1','') || 'http://localhost:5000';
    
    // ✅ FIX: Token clean karo - Bearer hatao agar hai to
    const cleanToken = token.replace('Bearer ', '').trim();
    
    console.log("🔐 Socket connecting for user:", user.id);

    const socket = io(baseUrl, {
      auth: { token: cleanToken }, // ✅ Raw token
      withCredentials: true,
      transports: ["websocket", "polling"], // ✅ websocket pehle
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection log - Viva me dikha sakte ho
    socket.on("connect", () => {
      console.log(`✅ Socket connected: user:${user.id} room joined - ID: ${socket.id}`);
    });

    // ✅ FIX: 400 Bad Request fix - connect_error handle karo
    socket.on("connect_error", (error: any) => {
      console.log("❌ Socket connect_error:", error.message);
      // Agar auth fail hai to logout kar do
      if (error.message.includes("Authentication") || error.message.includes("Token")) {
        console.log("🔒 Auth failed, clearing session...");
        // localStorage.clear(); // Uncomment if auto-logout chahiye
        // window.location.href = "/login";
      }
    });

    // Backend se: io.to(`user:${userId}`).emit(`user:${userId}`, notification)
    socket.on(`user:${user.id}`, (notification: any) => {
      console.log("🔔 New Notification:", notification);
      // TODO: Bell icon update + toast
      // Example: show toast "Your issue ${notification.issue_id} status changed to ${notification.status}"
    });

    // ✅ FIX: Backend notification:new event bhi suno
    socket.on("notification:new", (notification: any) => {
      console.log("🔔 Notification:new:", notification);
    });

    socket.on("issue:created", (data: any) => {
      console.log("📍 New Issue Created:", data);
    });

    // Issue specific updates: issue:${issueId} room
    socket.on(`issue:${user.id}`, (update: any) => {
      console.log("📍 Issue Update:", update);
    });

    // Status changed event
    socket.on("statusChanged", (update: any) => {
      console.log("🔄 Status Changed:", update);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    // Cleanup on logout
    return () => {
      socket.disconnect();
      console.log("🔌 Socket disconnected");
    };
  }, [user?.id, token]);

  return (
    // Full height layout - flex-col taake footer hamesha bottom me rahe
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <Header />
      <div className="flex flex-1 relative">
        {/* Sidebar - collapsible hai */}
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        {/* Main content area - yahan har page ka content ayega */}
        <main id="main-content" tabIndex={-1} className="flex-1 transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8 w-full min-w-0 focus:outline-none">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default MainLayout;