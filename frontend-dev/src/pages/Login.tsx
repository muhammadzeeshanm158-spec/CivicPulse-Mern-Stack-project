import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Validation check - email aur password sahi hai ya nahi
  const validateForm = (): boolean => {
    const errors: any = {};
    if (!email.trim()) errors.email = "Email required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Valid email required.";
    if (!password) errors.password = "Password required.";
    else if (password.length < 6) errors.password = "Min 6 chars.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await API.post("/auth/login", { email, password });

      // FIX 1: Sahi response path - backend data.data me bhejta hai
      // Pehle tum response.data.user kar rahe the, sahi hai response.data.data.user
      const userData =
        response.data.data?.user || response.data.user || response.data.data;
      const tokenData =
        response.data.data?.accessToken ||
        response.data.data?.token ||
        response.data.accessToken ||
        response.data.token;

      if (userData && tokenData) {
        login(userData, tokenData); // AuthContext me save

        // FIX 2: Role lowercase check - admin, manager, officer, citizen
        const userRole = String(userData.role ?? "").toLowerCase();
        if (userRole === "admin") navigate("/admin/dashboard");
        else if (userRole === "manager") navigate("/manager/dashboard");
        else if (userRole === "officer") navigate("/officer/dashboard");
        else navigate("/dashboard"); // citizen default
      } else {
        setError("Invalid response from server. Missing token.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Login failed! Check credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')`,
      }}
    >
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-600 text-white items-center justify-center mb-4">
            📢
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-2">Sign in to CivicPulse</p>
        </div>
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3.5 rounded-xl mb-6">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email)
                  setFieldErrors({ ...fieldErrors, email: undefined });
              }}
              placeholder="name@example.com"
              className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm ${fieldErrors.email ? "border-rose-500" : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"}`}
            />
            {fieldErrors.email && (
              <p className="text- text-rose-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password)
                    setFieldErrors({ ...fieldErrors, password: undefined });
                }}
                placeholder="••••••••"
                className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm pr-11 ${fieldErrors.password ? "border-rose-500" : "border-slate-200 focus:border-indigo-600"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text- text-rose-600 mt-1">{fieldErrors.password}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>
        <footer className="mt-8 pt-6 border-t text-center text-xs text-slate-500">
          <p>
            Don't have account?{" "}
            <Link to="/register" className="text-indigo-600 font-semibold">
              Create account
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
};
export default Login;
