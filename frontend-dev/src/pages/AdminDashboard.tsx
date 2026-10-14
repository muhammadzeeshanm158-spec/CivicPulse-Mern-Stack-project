import React, { useState, useEffect, useId } from "react";
import API from "../services/api";
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  Search,
  UserCheck,
  RefreshCw,
  X,
  FileText,
  MapPin,
  Send,
  Building2,
} from "lucide-react";

// FIX 1: MySQL type - id: number, _id optional rakha backward compat ke liye
export interface Officer {
  id: number; // FIX: MySQL number
  _id?: string;
  name: string;
  email: string;
  department?: string;
}

export interface Issue {
  id: number; // FIX: MySQL id
  _id?: string;
  title: string;
  description: string;
  category?: string;
  category_name?: string; // FIX: Backend category_name bhejta hai
  priority: "High" | "Medium" | "Low" | "Critical";
  status:
    | "Pending"
    | "In Progress"
    | "Resolved"
    | "Rejected"
    | "pending"
    | "in_progress"
    | "resolved";
  location?: string;
  area_name?: string; // FIX: area_name
  address?: string;
  imageUrl?: string;
  before_image_url?: string;
  createdByName?: string;
  createdAt?: string;
  created_at?: string;
  assignedOfficer?: Officer | number | string; // id bhi ho sakta hai
  assigned_officer_id?: number;
  officerRemarks?: string;
}

const AdminDashboard: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("All");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("");
  const [updating, setUpdating] = useState<boolean>(false);

  const searchInputId = useId();
  const assignmentFilterId = useId();
  const statusFilterId = useId();
  const modalTitleId = useId();
  const officerSelectId = useId();

  // FIX 2: Helper - MySQL id aur Mongo _id dono handle karega
  const getId = (item: any): number | string => item.id ?? item._id;
  const getOfficerId = (o: any) => o.id ?? o._id;
  const getCategory = (issue: any) => issue.category_name || issue.category;
  const getArea = (issue: any) =>
    issue.area_name || issue.location || issue.address;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIssue) setSelectedIssue(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIssue]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      // FIX 3: Sahi endpoint - /admin/issues nahi, /manager/issues ya /admin/dashboard
      const [issuesRes, officersRes] = await Promise.all([
        API.get("/admin/issues"), // tumhara backend yahi hai
        API.get("/manager/officers"), // FIX: officers manager se aate hain
      ]);
      const fetchedIssues =
        issuesRes.data?.data || issuesRes.data?.issues || issuesRes.data || [];
      const fetchedOfficers =
        officersRes.data?.data ||
        officersRes.data?.officers ||
        officersRes.data ||
        [];
      setIssues(Array.isArray(fetchedIssues) ? fetchedIssues : []);
      setOfficers(Array.isArray(fetchedOfficers) ? fetchedOfficers : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !selectedOfficerId) return;
    setUpdating(true);
    try {
      // FIX 4: Assign endpoint sahi - manager/issues/:id/assign
      const issueId = getId(selectedIssue);
      await API.patch(`/manager/issues/${issueId}/assign`, {
        officerId: selectedOfficerId,
        officer_id: Number(selectedOfficerId),
      });

      // Optimistic update
      setIssues((prev) =>
        prev.map((item) => {
          if (String(getId(item)) === String(issueId)) {
            const assignedObj = officers.find(
              (o) => String(getOfficerId(o)) === String(selectedOfficerId),
            );
            return {
              ...item,
              assignedOfficer: assignedObj || (selectedOfficerId as any),
              assigned_officer_id: Number(selectedOfficerId),
            };
          }
          return item;
        }),
      );
      setSelectedIssue(null);
      setSelectedOfficerId("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to assign officer.");
    } finally {
      setUpdating(false);
    }
  };

  // Filter logic - lowercase compare
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getArea(issue).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategory(issue).toLowerCase().includes(searchQuery.toLowerCase());
    const statusLower = String(issue.status).toLowerCase();
    const selectedLower = selectedStatus.toLowerCase();
    const matchesStatus =
      selectedStatus === "All" ||
      statusLower === selectedLower ||
      statusLower === selectedLower.replace(" ", "_");
    const matchesCategory =
      selectedCategory === "All" || getCategory(issue) === selectedCategory;
    const isAssigned = Boolean(
      issue.assignedOfficer || (issue as any).assigned_officer_id,
    );
    const matchesAssignment =
      assignmentFilter === "All" ||
      (assignmentFilter === "Assigned" && isAssigned) ||
      (assignmentFilter === "Unassigned" && !isAssigned);
    return (
      matchesSearch && matchesStatus && matchesCategory && matchesAssignment
    );
  });

  const totalIssues = issues.length;
  const unassignedCount = issues.filter(
    (i) => !i.assignedOfficer && !(i as any).assigned_officer_id,
  ).length;
  const inProgressCount = issues.filter((i) =>
    String(i.status).toLowerCase().includes("progress"),
  ).length;
  const resolvedCount = issues.filter(
    (i) => String(i.status).toLowerCase() === "resolved",
  ).length;

  const getPriorityBadge = (priority: string) => {
    switch (String(priority).toLowerCase()) {
      case "high":
      case "critical":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "medium":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "low":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };
  const getStatusBadge = (status: string) => {
    const s = String(status).toLowerCase();
    if (s.includes("pending"))
      return "bg-amber-50 text-amber-800 border-amber-200";
    if (s.includes("progress"))
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    if (s === "resolved")
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (s === "rejected") return "bg-rose-50 text-rose-800 border-rose-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const categoryOptions = [
    "All",
    ...Array.from(
      new Set(
        issues
          .map((issue) => getCategory(issue))
          .filter((category): category is string => Boolean(category)),
      ),
    ),
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
            <Building2 className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">
              System Admin Control Center
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Monitor complaints, assign officers, track metrics.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchAdminData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-xs font-semibold text-white transition"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />{" "}
          Refresh Data
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              Total Issues
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalIssues}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              Needs Assignment
            </p>
            <h3 className="text-2xl font-extrabold text-rose-600 mt-1">
              {unassignedCount}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              In Progress
            </p>
            <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">
              {inProgressCount}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              Resolved
            </p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
              {resolvedCount}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id={searchInputId}
            type="text"
            placeholder="Search by title, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            id={assignmentFilterId}
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="All">All Assignments</option>
            <option value="Unassigned">Unassigned Only</option>
            <option value="Assigned">Assigned Only</option>
          </select>
          <select
            id={statusFilterId}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option === "All" ? "All Categories" : option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 text-xs p-4 rounded-xl flex justify-between">
          <span>{error}</span>
          <button onClick={fetchAdminData} className="underline">
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-semibold">Loading complaints...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold">No complaints found</h3>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b text- font-bold text-slate-600 uppercase">
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Officer</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filteredIssues.map((issue) => {
                  const officerIdVal =
                    typeof issue.assignedOfficer === "object"
                      ? getOfficerId(issue.assignedOfficer as any)
                      : issue.assignedOfficer ||
                        (issue as any).assigned_officer_id;
                  const officerObj =
                    typeof issue.assignedOfficer === "object"
                      ? (issue.assignedOfficer as Officer)
                      : officers.find(
                          (o) =>
                            String(getOfficerId(o)) === String(officerIdVal),
                        );
                  return (
                    <tr
                      key={String(getId(issue))}
                      className="hover:bg-slate-50/80"
                    >
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold truncate">{issue.title}</p>
                        <p className="text- text-slate-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          {getArea(issue)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text- font-semibold">
                          {getCategory(issue)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full border text- font-bold ${getPriorityBadge(String(issue.priority))}`}
                        >
                          {issue.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full border text- font-bold ${getStatusBadge(String(issue.status))}`}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {officerObj ? (
                          <div className="flex items-center gap-1.5 font-bold">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{officerObj.name}</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text- font-bold">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedIssue(issue);
                            setSelectedOfficerId(
                              officerObj
                                ? String(getOfficerId(officerObj))
                                : "",
                            );
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold"
                        >
                          <Users className="w-3.5 h-3.5 inline mr-1" />
                          {officerObj ? "Reassign" : "Assign"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedIssue && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b flex justify-between bg-white">
              <div>
                <span
                  className={`px-2.5 py-0.5 rounded-full border text- font-bold uppercase mb-1 ${getPriorityBadge(String(selectedIssue.priority))}`}
                >
                  {selectedIssue.priority} Priority
                </span>
                <h2 id={modalTitleId} className="text-base font-bold">
                  {selectedIssue.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignOfficer} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">
                    Category:
                  </span>
                  <span className="font-bold">
                    {getCategory(selectedIssue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">
                    Location:
                  </span>
                  <span className="font-bold">{getArea(selectedIssue)}</span>
                </div>
              </div>
              <div>
                <label
                  htmlFor={officerSelectId}
                  className="block text-xs font-bold uppercase mb-2"
                >
                  Select Officer *
                </label>
                <select
                  id={officerSelectId}
                  required
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">-- Choose Officer --</option>
                  {officers.map((officer) => (
                    <option
                      key={String(getOfficerId(officer))}
                      value={String(getOfficerId(officer))}
                    >
                      {officer.name}{" "}
                      {officer.department ? `(${officer.department})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !selectedOfficerId}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 inline mr-1" />
                  {updating ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
