import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, PlusCircle, Settings, HelpCircle, PanelLeftClose, PanelLeftOpen, Map } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface SidebarProps { isOpen: boolean; toggleSidebar: () => void; }

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const { user } = useAuth();

  // FIX: Role ko lowercase me laana zaroori hai kyunki backend "admin" bhejta hai, "ADMIN" nahi
  const getDashboardPath = () => {
    const role = String(user?.role?? "").toLowerCase();
    switch (role) {
      case "admin": return "/admin/dashboard";
      case "officer": return "/officer/dashboard";
      case "manager": return "/manager/dashboard";
      default: return "/dashboard"; // citizen ka default
    }
  };

  const navItems = [
    { name: "Dashboard", path: getDashboardPath(), icon: LayoutDashboard },
    { name: "Public Map", path: "/public-map", icon: Map },
    { name: "My Issues", path: "/my-issues", icon: FileText },
    { name: "Report Issue", path: "/report-issue", icon: PlusCircle },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside aria-label="Sidebar Navigation" className={`bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 ${isOpen? "w-64 p-4" : "w-16 p-2"}`}>
      <div className="space-y-4">
        <div className={`flex items-center ${isOpen? "justify-between px-1" : "justify-center"}`}>
          {isOpen && <p className="text- font-bold text-slate-500 uppercase tracking-wider">Main Menu</p>}
          <button type="button" onClick={toggleSidebar} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition" aria-label={isOpen? "Collapse Sidebar" : "Expand Sidebar"}>
            {isOpen? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path!== "/" && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} className={`flex items-center ${isOpen? "gap-3 px-3.5" : "justify-center px-2"} py-2.5 rounded-xl text-xs font-semibold transition ${isActive? "bg-indigo-600 text-white shadow-xs" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {isOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      {isOpen && (
        <div className="bg-indigo-50/80 border border-indigo-100 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-1"><HelpCircle className="w-4 h-4 text-indigo-600" /> Need Help?</div>
          <p className="text- text-slate-600 leading-relaxed">Contact municipal helpline for urgent civic issues.</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;