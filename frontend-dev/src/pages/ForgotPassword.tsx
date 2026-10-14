import React, { useState } from "react";
import API from "../services/api"; // FIX: API import

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter valid email.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // FIX: Real API call - pehle fake setTimeout tha
      await API.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send reset link. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border shadow-md space-y-4">
      <h2 className="text-xl font-bold">Forgot Password?</h2>
      <p className="text-xs text-slate-500">
        Enter your registered email to receive a password reset link.
      </p>
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs ${error ? "border-rose-500" : "border-slate-200 focus:border-indigo-600"}`}
            />
            {error && <p className="text- text-rose-600 mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-2">
          <p>
            Reset link sent to <strong>{email}</strong>. Check inbox!
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
            className="text-indigo-600 font-semibold underline text- mt-2 block"
          >
            Send to different email
          </button>
        </div>
      )}
    </div>
  );
};
export default ForgotPassword;
