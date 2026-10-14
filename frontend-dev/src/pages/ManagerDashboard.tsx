import React, { useState, useEffect, useId } from "react";
import API from "../services/api";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Download,
  Filter,
  UserPlus,
  XCircle,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";

// FIX: MySQL me id number hota hai, Mongo me _id string tha - backend MySQL hai
type ID = number | string;

interface Officer {
  id: ID;
  _id?: ID; // backward compat agar backend purana data bheje
  name: string;
  activeTasks: number;
}

interface Issue {
  id: ID;
  _id?: ID; // backward compat
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  area: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "pending" | "in_progress" | "resolved" | "rejected" | "duplicate";
  assignedOfficer?: { id?: ID; _id?: ID; name: string };
  sla_deadline?: string;
  isSlaBreached?: boolean;
  createdAt: string;
}

interface Stats {
  openIssues: number;
  resolvedIssues: number;
  slaBreachRate: number; // Percentage
  avgResolutionTimeHours: number;
}

const ManagerDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    openIssues: 0,
    resolvedIssues: 0,
    slaBreachRate: 0,
    avgResolutionTimeHours: 0,
  });

  const [issues, setIssues] = useState<Issue[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Action States
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [deadline, setDeadline] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Accessibility Unique IDs
  const officerSelectId = useId();
  const deadlineInputId = useId();
  const modalTitleId = useId();

  // Helper - id nikalo (MySQL id ya Mongo _id dono support)
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

  // Fetch Dashboard Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, issuesRes, officersRes] = await Promise.all([
        API.get("/manager/stats").catch(() => ({
          data: {
            openIssues: 12,
            resolvedIssues: 45,
            slaBreachRate: 8.5,
            avgResolutionTimeHours: 14.2,
          },
        })),
        API.get("/manager/issues").catch(() => ({ data: [] })),
        API.get("/manager/officers").catch(() => ({ data: [] })),
      ]);

      setStats(statsRes.data);

      const priorityOrder = { Critical: 1, High: 2, Medium: 3, Low: 4 };
      const rawIssues: Issue[] = issuesRes.data.data || issuesRes.data || [];
      const sorted = rawIssues.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
      );

      setIssues(sorted);
      setOfficers(officersRes.data.data || officersRes.data || []);
    } catch (err) {
      console.error("Error loading manager dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // CSV Export Handler
  const handleExportCSV = async () => {
    try {
      const response = await API.get("/manager/export-csv", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `issues-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export CSV. Please check backend integration.");
    }
  };

  // Assign Officer Submit - FIX: officer_id number, officerId nahi
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue ||!selectedOfficer) return;

    try {
      setSubmitting(true);
      await API.patch(`/manager/issues/${getId(selectedIssue)}/assign`, {
        officer_id: Number(selectedOfficer), // FIX: backend MySQL me officer_id number expect karta hai
        officerId: selectedOfficer, // backward compat
        deadline: deadline || undefined,
      });
      alert("Officer assigned successfully!");
      setSelectedIssue(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to assign officer");
    } finally {
      setSubmitting(false);
    }
  };

  // Status Action Handler
  const handleStatusChange = async (issueId: ID, newStatus: string) => {
    try {
      await API.patch(`/manager/issues/${issueId}/status`, {
        status: newStatus,
        reason: actionReason || undefined,
      });
      alert(`Issue status updated to ${newStatus}`);
      setSelectedIssue(null);
      setActionReason("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & CSV Export */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Manager Operations Portal
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Monitor SLA compliance, officer workloads, and route civic issues.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <Download className="w-4 h-4" aria-hidden="true" /> Export CSV Report
        </button>
      </div>

      {/* 1. Analytics Cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        role="region"
        aria-label="Operations Analytics"
      >
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div
            className="p-3 bg-amber-100 text-amber-800 rounded-xl"
            aria-hidden="true"
          >
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-600 font-bold">Open Issues</p>
            <h3 className="text-2xl font-extrabold text-slate-900">
              {stats.openIssues}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div
            className="p-3 bg-emerald-100 text-emerald-800 rounded-xl"
            aria-hidden="true"
          >
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-600 font-bold">Resolved Issues</p>
            <h3 className="text-2xl font-extrabold text-slate-900">
              {stats.resolvedIssues}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div
            className="p-3 bg-rose-100 text-rose-800 rounded-xl"
            aria-hidden="true"
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-600 font-bold">SLA Breach Rate</p>
            <h3 className="text-2xl font-extrabold text-slate-900">
              {stats.slaBreachRate}%
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div
            className="p-3 bg-indigo-100 text-indigo-800 rounded-xl"
            aria-hidden="true"
          >
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-600 font-bold">
              Avg Resolution Time
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900">
              {stats.avgResolutionTimeHours}h
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Priority-Sorted Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              <h2 className="font-bold text-slate-900 text-sm">
                Priority-Sorted Issue Queue
              </h2>
            </div>
            <span className="text- bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              Sorted by Severity
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {loading? (
              <div
                role="status"
                aria-live="polite"
                className="p-8 text-center text-xs text-slate-600 font-semibold"
              >
                Loading issues queue...
              </div>
            ) : issues.length === 0? (
              <div className="p-8 text-center text-xs text-slate-600 font-semibold">
                No active issues found.
              </div>
            ) : (
              issues.map((issue) => (
                <div
                  key={String(getId(issue))}
                  className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text- font-bold text-slate-600">
                        #{issue.ticket_number}
                      </span>
                      <span
                        className={`text- font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          issue.priority === "Critical"
                           ? "bg-rose-100 text-rose-900"
                            : issue.priority === "High"
                             ? "bg-amber-100 text-amber-900"
                              : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {issue.priority}
                      </span>
                      {issue.isSlaBreached && (
                        <span className="bg-rose-600 text-white text- font-extrabold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                          <AlertTriangle
                            className="w-3 h-3"
                            aria-hidden="true"
                          />{" "}
                          SLA BREACH
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">
                      {issue.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {issue.category} • {issue.area}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedIssue(issue)}
                      aria-label={`Manage issue #${issue.ticket_number}: ${issue.title}`}
                      className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      Manage{" "}
                      <ChevronRight
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Officer Workload Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users className="w-4 h-4 text-indigo-600" aria-hidden="true" />
            <h2 className="font-bold text-slate-900 text-sm">
              Officer Workload
            </h2>
          </div>

          <div
            className="space-y-3 max-h-105 overflow-y-auto"
            role="region"
            aria-label="Officer workload list"
          >
            {officers.length === 0? (
              <p className="text-xs text-slate-600 font-semibold">
                No officers found.
              </p>
            ) : (
              officers.map((officer) => (
                <div
                  key={String(getId(officer))}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {officer.name}
                    </p>
                    <p className="text- text-slate-600 font-semibold">
                      Field Officer
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      officer.activeTasks > 5
                       ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {officer.activeTasks} Active Tasks
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. MANAGEMENT MODAL */}
      {selectedIssue && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-5 max-h- overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3
                  id={modalTitleId}
                  className="font-bold text-slate-900 text-base"
                >
                  Issue Operations #{selectedIssue.ticket_number}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {selectedIssue.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                aria-label="Close modal"
                className="text-slate-500 hover:text-slate-800 p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <XCircle className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Transition & Action Controls */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-800">
                  Quick Actions / Verification Controls:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(getId(selectedIssue), "in_progress")
                    }
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Verify
                    Issue
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(getId(selectedIssue), "rejected")
                    }
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-rose-600"
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                    Reject Issue
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(getId(selectedIssue), "duplicate")
                    }
                    className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Mark
                    Duplicate
                  </button>
                </div>
              </div>

              {/* Assign Officer & Set Deadline */}
              <form
                onSubmit={handleAssignSubmit}
                className="space-y-3 border-t border-slate-100 pt-3"
              >
                <p className="text-xs font-bold text-slate-900">
                  Assign Field Officer & Set SLA Target
                </p>
                <div className="space-y-2">
                  <label
                    htmlFor={officerSelectId}
                    className="block text- font-bold text-slate-700"
                  >
                    Select Field Officer *
                  </label>
                  <select
                    id={officerSelectId}
                    required
                    value={selectedOfficer}
                    onChange={(e) => setSelectedOfficer(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">-- Choose Officer --</option>
                    {officers.map((o) => (
                      <option key={String(getId(o))} value={String(getId(o))}>
                        {o.name} ({o.activeTasks} tasks)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={deadlineInputId}
                    className="block text- font-bold text-slate-700"
                  >
                    Custom Resolution Deadline (Optional)
                  </label>
                  <input
                    id={deadlineInputId}
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />{" "}
                  {submitting? "Assigning..." : "Assign Task & Set Deadline"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;