import React, { useState, useEffect, useId } from "react";
import API from "../services/api";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Upload,
  Image as ImageIcon,
  X,
  Send,
  AlertCircle,
  FileText
} from "lucide-react";

// FIX: MySQL me id number, Mongo me _id string - backend MySQL hai
type ID = number | string;

interface AssignedIssue {
  id: ID;
  _id?: ID; // backward compat
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  area: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "pending" | "in_progress" | "resolved" | "rejected";
  sla_deadline?: string;
  createdAt: string;
  before_image?: string;
}

interface FormErrors {
  resolutionNote?: string;
  proofImage?: string;
}

const OfficerDashboard: React.FC = () => {
  const [issues, setIssues] = useState<AssignedIssue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Resolving Issue
  const [selectedIssue, setSelectedIssue] = useState<AssignedIssue | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validation States
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Accessibility Unique IDs
  const resolutionNoteId = useId();
  const proofUploadId = useId();
  const modalTitleId = useId();

  // Helper - id nikalo (MySQL id ya Mongo _id)
  const getId = (item: { id?: ID; _id?: ID }) => item.id?? item._id!;

  // Escape key listener for Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIssue) {
        setSelectedIssue(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIssue]);

  // Fetch Assigned Issues
  const fetchAssignedIssues = async () => {
    try {
      setLoading(true);
      const res = await API.get("/officer/assigned-issues");
      setIssues(res.data.data || res.data || []);
    } catch (err: any) {
      console.error("Failed to load assigned issues:", err);
      setError(err.response?.data?.message || "Failed to load assigned tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedIssues();
  }, []);

  // Image Upload Preview Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      setImagePreview(URL.createObjectURL(file));
      if (fieldErrors.proofImage) {
        setFieldErrors((prev) => ({...prev, proofImage: undefined }));
      }
    }
  };

  const clearImage = () => {
    setProofImage(null);
    setImagePreview(null);
  };

  // Client-Side Modal Validation Handler
  const validateResolutionForm = (): boolean => {
    const errors: FormErrors = {};

    if (!resolutionNote.trim()) {
      errors.resolutionNote = "Resolution note is required.";
    } else if (resolutionNote.trim().length < 10) {
      errors.resolutionNote = "Resolution note must be at least 10 characters long.";
    }

    if (!proofImage) {
      errors.proofImage = "At least one proof photo (After image) is required to resolve this issue!";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Resolution - FIX: id use, _id nahi
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setApiError(null);

    if (!validateResolutionForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("resolution_note", resolutionNote);
      formData.append("after_image", proofImage as File);
      formData.append("status", "resolved");

      await API.patch(`/officer/issues/${getId(selectedIssue)}/resolve`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSelectedIssue(null);
      setResolutionNote("");
      clearImage();
      setFieldErrors({});
      fetchAssignedIssues();
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Failed to resolve issue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Critical":
        return <span className="bg-rose-100 text-rose-900 text- font-bold px-2.5 py-0.5 rounded-full uppercase">Critical</span>;
      case "High":
        return <span className="bg-amber-100 text-amber-900 text- font-bold px-2.5 py-0.5 rounded-full uppercase">High</span>;
      case "Medium":
        return <span className="bg-blue-100 text-blue-900 text- font-bold px-2.5 py-0.5 rounded-full uppercase">Medium</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text- font-bold px-2.5 py-0.5 rounded-full uppercase">Low</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Field Officer Dashboard</h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">Manage and resolve assigned civic complaints in your area.</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-xs font-bold text-indigo-800 shrink-0">
          Assigned Tasks: {issues.length}
        </div>
      </div>

      {/* Issues List State Handling */}
      {loading? (
        <div role="status" aria-live="polite" className="min-h- flex items-center justify-center text-slate-700 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
            Loading assigned tasks...
          </div>
        </div>
      ) : error? (
        <div role="alert" className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-900 text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" /> {error}
        </div>
      ) : issues.length === 0? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 space-y-3 font-semibold text-slate-700">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-900">No pending tasks assigned!</p>
          <p className="text-xs text-slate-600">You are all caught up for today.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="region" aria-label="Assigned tasks list">
          {issues.map((issue) => (
            <div
              key={String(getId(issue))}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-slate-100 text-slate-800 font-mono text- font-bold px-2 py-0.5 rounded">
                    #{issue.ticket_number || String(getId(issue)).slice(-6)}
                  </span>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(issue.priority)}
                    <span className="bg-blue-50 text-blue-900 text- font-bold px-2 py-0.5 rounded-full uppercase">
                      {issue.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{issue.title}</h3>
                <p className="text-xs text-slate-700 line-clamp-2 font-medium">{issue.description}</p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
                    <span className="text-slate-900">{issue.area || "Location details on map"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>SLA Target: {issue.sla_deadline? new Date(issue.sla_deadline).toLocaleString() : "24-48 Hours"}</span>
                  </div>
                </div>
              </div>

              {/* Resolution Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIssue(issue);
                    setResolutionNote("");
                    clearImage();
                    setFieldErrors({});
                    setApiError(null);
                  }}
                  aria-label={`Action and resolve issue #${issue.ticket_number || String(getId(issue)).slice(-6)}: ${issue.title}`}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Action & Resolve Issue
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {selectedIssue && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl max-h- overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 id={modalTitleId} className="font-bold text-slate-900 text-base">Resolve Issue #{selectedIssue.ticket_number}</h2>
                <p className="text-xs text-slate-600 font-medium">{selectedIssue.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                aria-label="Close modal"
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {apiError && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" /> {apiError}
              </div>
            )}

            <form onSubmit={handleResolveSubmit} className="space-y-4" noValidate>
              {/* Resolution Note */}
              <div className="space-y-1.5">
                <label htmlFor={resolutionNoteId} className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" /> Resolution Note / Action Taken *
                </label>
                <textarea
                  id={resolutionNoteId}
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => {
                    setResolutionNote(e.target.value);
                    if (fieldErrors.resolutionNote) {
                      setFieldErrors({...fieldErrors, resolutionNote: undefined });
                    }
                  }}
                  placeholder="Describe the action taken to fix this issue (e.g., Pothole filled with concrete)..."
                  className={`w-full p-3 bg-slate-50 border rounded-xl text-xs text-slate-900 font-medium focus:outline-none transition ${
                    fieldErrors.resolutionNote
                     ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      : "border-slate-200 focus:ring-2 focus:ring-indigo-600"
                  }`}
                />
                {fieldErrors.resolutionNote && (
                  <p className="text- text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" aria-hidden="true" /> {fieldErrors.resolutionNote}
                  </p>
                )}
              </div>

              {/* Proof / After Image Upload */}
              <div className="space-y-1.5">
                <span className="flex items-center gap-1 text-xs font-bold text-slate-800">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" /> Proof Photo (After Resolution Image) *
                </span>

                {imagePreview? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-48 flex items-center justify-center">
                    <img src={imagePreview} alt="Proof Preview" className="object-cover h-48 w-full" />
                    <button
                      type="button"
                      onClick={clearImage}
                      aria-label="Remove uploaded proof photo"
                      className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-600"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor={proofUploadId}
                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/80 transition focus-within:ring-2 focus-within:ring-indigo-600 ${
                      fieldErrors.proofImage? "border-rose-500 bg-rose-50/30" : "border-slate-300"
                    }`}
                  >
                    <Upload className="w-6 h-6 text-slate-500 mb-1" aria-hidden="true" />
                    <span className="text-xs font-bold text-indigo-700">Click to upload After photo</span>
                    <span className="text- text-slate-500 font-semibold">PNG, JPG or JPEG allowed</span>
                    <input
                      id={proofUploadId}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </label>
                )}

                {fieldErrors.proofImage && (
                  <p className="text- text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" aria-hidden="true" /> {fieldErrors.proofImage}
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 transition focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {submitting? "Resolving..." : <><Send className="w-3.5 h-3.5" aria-hidden="true" /> Submit & Mark Resolved</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerDashboard;