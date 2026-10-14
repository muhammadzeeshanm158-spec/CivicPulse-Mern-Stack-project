import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationDropdown from "../../components/layout/NotificationDropdown";
import {
  Menu,
  X,
  Building2,
  MapPin,
  BarChart2,
  User,
  LogOut,
  LayoutDashboard,
  Shield,
  FileText,
} from "lucide-react";

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // FIX 1: Role ko hamesha lowercase me convert karo - backend "admin" bhejta hai, "ADMIN" nahi
  // Isi bug ki wajah se Admin login karke bhi Citizen menu dikh raha tha
  const userRole = String(user?.role ?? "").toLowerCase();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  // Keyboard: ESC press pe mobile menu band
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
      <nav
        aria-label="Main Navigation"
        className="max-w-7xl mx-auto px-4 sm:px-6"
      >
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 rounded-xl p-1"
          >
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
              Civic<span className="text-indigo-600">Pulse</span>
            </span>
          </Link>

          {/* Desktop Links - FIX 2: Ab lowercase role check kar rahe hain */}
          <div className="hidden md:flex items-center gap-1" role="menubar">
            {userRole === "citizen" && (
              <>
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${isActive("/dashboard") ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/my-issues"
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${isActive("/my-issues") ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  My Complaints
                </Link>
              </>
            )}
            {userRole === "admin" && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${isActive("/admin/dashboard") ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  Overview
                </Link>
                <Link
                  to="/admin/panel"
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${isActive("/admin/panel") ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  Admin Panel
                </Link>
              </>
            )}
            {userRole === "manager" && (
              <Link
                to="/manager/dashboard"
                className="px-3 py-2 rounded-xl text-xs font-semibold"
              >
                Manager Portal
              </Link>
            )}
            {userRole === "officer" && (
              <Link
                to="/officer/dashboard"
                className="px-3 py-2 rounded-xl text-xs font-semibold"
              >
                Tasks Queue
              </Link>
            )}

            <Link
              to="/public-map"
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${isActive("/public-map") ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-100"}`}
            >
              Public Map
            </Link>
            <Link
              to="/transparency"
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${isActive("/transparency") ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-100"}`}
            >
              Transparency
            </Link>
          </div>

          {/* Right Controls */}
          <div className="hidden md:flex items-center gap-3">
            <NotificationDropdown />
            <Link
              to="/profile"
              className="p-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition"
            >
              <User className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationDropdown />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer - yahan bhi lowercase role check */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 shadow-lg"
        >
          <div className="p-3 bg-slate-50 rounded-xl mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">
                {user?.name || "User"}
              </p>
              <p className="text- text-slate-600 uppercase font-semibold">
                {userRole || "Citizen"}
              </p>
            </div>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              View Profile
            </Link>
          </div>

          {userRole === "citizen" && (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-600" /> Citizen
                Dashboard
              </Link>
              <Link
                to="/my-issues"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                <FileText className="w-4 h-4 text-indigo-600" /> My Complaints
              </Link>
            </>
          )}
          {userRole === "admin" && (
            <>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-600" /> Admin
                Overview
              </Link>
              <Link
                to="/admin/panel"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                <Shield className="w-4 h-4 text-indigo-600" /> Admin Panel
              </Link>
            </>
          )}
          {/*... baaki manager/officer same lowercase se */}
          <Link
            to="/public-map"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            <MapPin className="w-4 h-4 text-rose-500" /> Interactive Public Map
          </Link>
          <Link
            to="/transparency"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            <BarChart2 className="w-4 h-4 text-emerald-600" /> Public
            Transparency
          </Link>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition pt-2 border-t border-slate-100"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
