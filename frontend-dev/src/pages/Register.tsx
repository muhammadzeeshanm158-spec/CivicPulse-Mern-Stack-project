import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Link } from "react-router-dom";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation & API Error States
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  // Client-side Validation Handler
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!name.trim()) {
      errors.name = "Full Name is required.";
    } else if (name.trim().length < 3) {
      errors.name = "Name must be at least 3 characters long.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match!";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");

    // Validate inputs first
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/register", {
        name,
        email,
        password,
        role: "CITIZEN",
      });

      login(response.data.user, response.data.token);
    } catch (err: any) {
      setApiError(
        err.response?.data?.message || "Registration failed! Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 relative selection:bg-indigo-500 selection:text-white"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')`
      }}
    >
      {/* Dark & Blur Overlay */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 transition-all duration-300 my-8">
        
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 mb-4 ring-4 ring-indigo-50">
            <i className="bi bi-person-plus-fill text-xl"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Create an Account
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Join CivicPulse to improve your community
          </p>
        </header>

        {/* Main Content */}
        <main>
          {/* API Error Banner */}
          {apiError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3.5 rounded-xl mb-6 flex items-start gap-3 animate-in fade-in duration-200">
              <i className="bi bi-exclamation-triangle-fill text-rose-500 text-base shrink-0 mt-0.5"></i>
              <span className="leading-snug">{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Name Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative group">
                <i className={`bi bi-person ${fieldErrors.name ? "text-rose-500" : "text-slate-400 group-focus-within:text-indigo-600"} absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200`}></i>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                  }}
                  placeholder="John Doe"
                  className={`w-full bg-slate-50/80 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                    fieldErrors.name
                      ? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 pl-1 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle"></i> {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative group">
                <i className={`bi bi-envelope ${fieldErrors.email ? "text-rose-500" : "text-slate-400 group-focus-within:text-indigo-600"} absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200`}></i>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                  placeholder="name@example.com"
                  className={`w-full bg-slate-50/80 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                    fieldErrors.email
                      ? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 pl-1 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle"></i> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative group">
                <i className={`bi bi-lock ${fieldErrors.password ? "text-rose-500" : "text-slate-400 group-focus-within:text-indigo-600"} absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200`}></i>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-slate-50/80 border rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                    fieldErrors.password
                      ? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors duration-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"} text-base`}></i>
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 pl-1 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle"></i> {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative group">
                <i className={`bi bi-shield-lock ${fieldErrors.confirmPassword ? "text-rose-500" : "text-slate-400 group-focus-within:text-indigo-600"} absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200`}></i>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-slate-50/80 border rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                    fieldErrors.confirmPassword
                      ? "border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors duration-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"} text-base`}></i>
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 pl-1 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle"></i> {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Sign Up</span>
                  <i className="bi bi-arrow-right text-base"></i>
                </>
              )}
            </button>
          </form>
        </main>

        {/* Footer Link */}
        <footer className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          <p className="mb-2">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors duration-200"
            >
              Sign In
            </Link>
          </p>
          <p className="text-slate-400">
            CivicPulse &copy; {new Date().getFullYear()} Citizen Civic Engagement
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Register;