import React from "react";
import {
  Loader2,
  AlertCircle,
  Inbox,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

// 1. Loading State - Jab data load ho raha ho to spinner dikhao
export const LoadingState: React.FC<{ message?: string }> = ({
  message = "Loading data, please wait...", // default message
}) => (
  <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
    {/* Spinner animation - data aane tak ghumta rahega */}
    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    <p className="text-xs font-medium text-slate-500">{message}</p>
  </div>
);

// 2. Empty State - Jab koi data na ho (0 issues)
interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void; // Button press pe kya karna hai
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No Data Found",
  description = "There are no records to display at the moment.",
  actionLabel,
  onAction,
}) => (
  <div className="py-16 px-4 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
    <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl w-fit mx-auto">
      <Inbox className="w-8 h-8" />
    </div>
    <h3 className="text-slate-800 font-bold text-sm">{title}</h3>
    <p className="text-slate-400 text-xs max-w-sm mx-auto">{description}</p>
    {/* Agar action button dena hai to dikhao - jaise "Report New Issue" */}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition inline-flex items-center gap-1.5 mt-2"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

// 3. Error State - Jab API fail ho jaye
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void; // Retry button ka function
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "An error occurred while loading data.",
  onRetry,
}) => (
  <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
    <div className="flex items-center gap-2.5">
      <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
      <span className="font-medium">{message}</span>
    </div>
    {/* Retry button - user dubara try kar sakta hai */}
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition flex items-center gap-1 shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    )}
  </div>
);

// 4. Success Banner - Jab kaam successful ho jaye (Issue report hua)
export const SuccessBanner: React.FC<{
  message: string;
  onClose?: () => void;
}> = ({ message, onClose }) => (
  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-2xs">
    <div className="flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
      <span className="font-semibold">{message}</span>
    </div>
    {/* Close button - banner band karne ke liye */}
    {onClose && (
      <button
        onClick={onClose}
        className="text-emerald-600 font-bold text-sm px-1"
      >
        ×
      </button>
    )}
  </div>
);
