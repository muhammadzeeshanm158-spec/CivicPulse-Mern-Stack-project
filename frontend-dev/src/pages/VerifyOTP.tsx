import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let interval: any = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    } else {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);
  const handleChange = (value: string, index: number) => {
    if (value && isNaN(Number(value))) return;
    setError("");
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== "" && index < 5) inputRefs.current[index + 1]?.focus();
  };
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  // FIX: Real API - pehle fake tha
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setError("Enter 6 digits");
      return;
    }
    setLoading(true);
    try {
      await API.post("/auth/verify-otp", {
        otp: otpString,
        email: localStorage.getItem("pending_email"),
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };
  const handleResend = async () => {
    if (!canResend) return;
    try {
      await API.post("/auth/resend-otp", {
        email: localStorage.getItem("pending_email"),
      });
      setTimer(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
    } catch (err: any) {
      setError("Failed to resend");
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border shadow-md">
      <h2 className="text-xl font-bold mb-1">Verify Email</h2>
      <p className="text-xs text-slate-500 mb-6">Enter 6-digit code.</p>
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border p-2.5 rounded-xl mb-4">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="flex justify-between gap-2 my-4">
          {otp.map((data, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              value={data}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-11 h-12 text-center text-lg font-bold bg-slate-50 border rounded-xl"
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>
      <div className="mt-4 text-center text-xs">
        {canResend ? (
          <button
            onClick={handleResend}
            className="text-indigo-600 font-semibold"
          >
            Resend OTP
          </button>
        ) : (
          <p>
            Resend in <span className="font-bold">{timer}s</span>
          </p>
        )}
      </div>
    </div>
  );
};
export default VerifyOTP;
