import React, { createContext, useContext, useState } from "react";

interface User { id: number; name: string; email: string; role: string; }
interface AuthContextType { user: User | null; token: string | null; login: (user: any, token: string) => void; logout: () => void; }

const AuthContext = createContext<AuthContextType>({ user: null, token: null, login: () => {}, logout: () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try { const saved = localStorage.getItem("user"); return saved? JSON.parse(saved) : null; } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const login = (userData: any, tokenData: string) => {
    const normalizedUser = {
      id: userData.id?? userData._id,
      name: userData.name,
      email: userData.email,
      role: String(userData.role).toLowerCase(),
    };
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("token", tokenData);
    localStorage.setItem("pending_email", userData.email); // OTP ke liye
    setUser(normalizedUser as any);
    setToken(tokenData);
  };

const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("pending_email");
  // FIX: Back button block - replace + clear history
  window.history.pushState(null, "", "/login");
  window.location.replace("/login"); // replace se back button kaam nahi karega
};

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);