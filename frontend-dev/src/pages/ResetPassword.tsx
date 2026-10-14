import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from "../services/api";

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<any>({}); const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // URL?token=xyz

  const validateForm = (): boolean => {
    const errors: any = {};
    if (!newPassword) errors.newPassword = 'Required'; else if (newPassword.length < 6) errors.newPassword = 'Min 6 chars';
    if (!confirmPassword) errors.confirmPassword = 'Confirm required'; else if (newPassword !== confirmPassword) errors.confirmPassword = 'Not match';
    setFieldErrors(errors); return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!validateForm()) return;
    setLoading(true);
    try {
      // FIX: Real API - pehle fake setTimeout tha
      await API.post('/auth/reset-password', { token, new_password: newPassword, newPassword });
      navigate('/login');
    } catch (err: any) { setFieldErrors({ newPassword: err.response?.data?.message }); }
    finally { setLoading(false); }
  };
  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border shadow-md space-y-4">
      <h2 className="text-xl font-bold">Set New Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div><label className="text-xs font-semibold">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs" />{fieldErrors.newPassword && <p className="text- text-rose-600">{fieldErrors.newPassword}</p>}</div>
        <div><label className="text-xs font-semibold">Confirm</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs" />{fieldErrors.confirmPassword && <p className="text- text-rose-600">{fieldErrors.confirmPassword}</p>}</div>
        <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50">{loading ? 'Updating...' : 'Reset Password'}</button>
      </form>
    </div>
  );
};
export default ResetPassword;