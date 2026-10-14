import React, { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Loader2 } from "lucide-react";

import MainLayout from "./components/layout/MainLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";

// ============ FIX 1: ProtectedRoute + Back Button Fix ============
const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // FIX: Back button se dashboard open na ho - har render pe token check
  useEffect(() => {
    const handlePopState = () => {
      const currentToken = localStorage.getItem("token");
      if (!currentToken) {
        window.location.replace("/login");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const user = JSON.parse(userStr);
      const userRole = String(user.role || "").toLowerCase();
      const allowed = allowedRoles.map((r) => r.toLowerCase());
      if (!allowed.includes(userRole)) {
        if (userRole === "admin")
          return <Navigate to="/admin/dashboard" replace />;
        if (userRole === "officer")
          return <Navigate to="/officer/dashboard" replace />;
        if (userRole === "manager")
          return <Navigate to="/manager/dashboard" replace />;
        return <Navigate to="/dashboard" replace />;
      }
    } catch {
      localStorage.clear();
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};

// ============ FIX 2: Root Redirect - Login First ============
const RootRedirect = () => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = String(user.role || "").toLowerCase();
    if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
    if (role === "officer") return <Navigate to="/officer/dashboard" replace />;
    if (role === "manager") return <Navigate to="/manager/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
};

// ============ FIX 3: Logout ke baad Back Button Block Component ============
const LogoutBlocker: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  useEffect(() => {
    // Browser cache disable - back button pe purana dashboard na dikhe
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.history.pushState(null, "", "/login");
        navigate("/login", { replace: true });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate]);
  return <>{children}</>;
};

// Lazy Pages
const CitizenDashboard = lazy(() => import("./pages/CitizenDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const OfficerDashboard = lazy(() => import("./pages/OfficerDashboard"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicMap = lazy(() => import("./pages/PublicMap"));
const IssueDetail = lazy(() => import("./pages/IssueDetail"));
const MyIssues = lazy(() => import("./pages/MyIssues"));
const Transparency = lazy(() => import("./pages/Transparency"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ReportIssue = lazy(() => import("./pages/ReportIssue"));
const IssuesExplorer = lazy(() => import("./pages/IssuesExplorer"));
const Home = lazy(() => import("./pages/Home"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h- flex flex-col items-center justify-center text-slate-700 font-semibold text-xs">
    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
    <p>Loading Module...</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LogoutBlocker>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* FIX: / pe ab login first - Home /home pe shift */}
              <Route path="/" element={<RootRedirect />} />
              <Route
                path="/home"
                element={
                  <MainLayout>
                    <Home />
                  </MainLayout>
                }
              />

              {/* Shared Auth Routes */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["citizen", "admin", "officer", "manager"]}
                  />
                }
              >
                <Route
                  path="/profile"
                  element={
                    <MainLayout>
                      <Profile />
                    </MainLayout>
                  }
                />
                <Route
                  path="/public-map"
                  element={
                    <MainLayout>
                      <PublicMap />
                    </MainLayout>
                  }
                />
                <Route
                  path="/issue/:id"
                  element={
                    <MainLayout>
                      <IssueDetail />
                    </MainLayout>
                  }
                />
                <Route
                  path="/transparency"
                  element={
                    <MainLayout>
                      <Transparency />
                    </MainLayout>
                  }
                />
                <Route
                  path="/issues"
                  element={
                    <MainLayout>
                      <IssuesExplorer />
                    </MainLayout>
                  }
                />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["citizen"]} />}>
                <Route
                  path="/dashboard"
                  element={
                    <MainLayout>
                      <CitizenDashboard />
                    </MainLayout>
                  }
                />
                <Route
                  path="/my-issues"
                  element={
                    <MainLayout>
                      <MyIssues />
                    </MainLayout>
                  }
                />
                <Route
                  path="/report-issue"
                  element={
                    <MainLayout>
                      <ReportIssue />
                    </MainLayout>
                  }
                />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route
                  path="/admin/dashboard"
                  element={
                    <MainLayout>
                      <AdminDashboard />
                    </MainLayout>
                  }
                />
                <Route
                  path="/admin/panel"
                  element={
                    <MainLayout>
                      <AdminPanel />
                    </MainLayout>
                  }
                />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["officer"]} />}>
                <Route
                  path="/officer/dashboard"
                  element={
                    <MainLayout>
                      <OfficerDashboard />
                    </MainLayout>
                  }
                />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["manager"]} />}>
                <Route
                  path="/manager/dashboard"
                  element={
                    <MainLayout>
                      <ManagerDashboard />
                    </MainLayout>
                  }
                />
              </Route>

              <Route
                path="/404"
                element={
                  <MainLayout>
                    <NotFound />
                  </MainLayout>
                }
              />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </LogoutBlocker>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
