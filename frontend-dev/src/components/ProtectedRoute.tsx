import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children?: React.ReactNode; // FIX: optional kar diya taaki Outlet wala bhi chale
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<Props> = ({ children, allowedRoles }) => {
  const { user, token } = useAuth() as any;

  // FIX 1: Token check
  if (!token || !user) return <Navigate to="/login" replace />;

  // FIX 2: Role check - lowercase + smart redirect
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = String(user.role || "").toLowerCase();
    const allowed = allowedRoles.map((r) => String(r).toLowerCase());

    if (!allowed.includes(userRole)) {
      // Agar role match nahi to uske apne dashboard pe bhejo, loop se bacho
      if (userRole === "admin")
        return <Navigate to="/admin/dashboard" replace />;
      if (userRole === "officer")
        return <Navigate to="/officer/dashboard" replace />;
      if (userRole === "manager")
        return <Navigate to="/manager/dashboard" replace />;
      return <Navigate to="/dashboard" replace />;
    }
  }

  // FIX 3: Hybrid - agar children hai to children return, nahi to Outlet (nested routes ke liye)
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
