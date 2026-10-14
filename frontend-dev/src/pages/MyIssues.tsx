import React, { useState, useEffect, useId, useMemo } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { PaginationControls } from "../components/PaginationControls";
import { useDebounce } from "../hooks/useDebounce";
import {
  Search,
  MapPin,
  Clock,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  XCircle,
} from "lucide-react";

// MySQL wala interface - id number hai
interface IssueItem {
  id: number;
  _id?: string;
  ticket_number: string;
  title: string;
  category?: string;
  category_name?: string;
  area?: string;
  area_name?: string;
  status: string;
  priority: string;
  created_at?: string;
  createdAt?: string;
}

const MyIssues: React.FC = () => {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // search me debounce lagaya taaki har letter pe api na lage
  const searchInputId = useId();
  const statusFilterId = useId();
  const sortSelectId = useId();

  // Id nikalne ka helper - MySQL aur Mongo dono support
  const getId = (item: any) => item.id?? item._id;
  const getCategory = (i: any) => i.category_name || i.category;
  const getArea = (i: any) => i.area_name || i.area;
  const getCreatedAt = (i: any) => i.created_at || i.createdAt;

  // Apne issues fetch karne ka function - backend se /my-issues
  const fetchMyIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get(`/issues/my-issues?page=${page}&limit=8`);
      setIssues(res.data.data || res.data.issues || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyIssues();
  }, [page]);

  // Issue wapas lene ka function - sirf pending wale pe chalega
  const handleWithdraw = async (issueId: number | string) => {
    if (!window.confirm("Withdraw issue?")) return;
    try {
      await API.delete(`/issues/${issueId}`);
      setIssues((prev) =>
        prev.filter((item) => String(getId(item))!== String(issueId)),
      );
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  // Search + filter + sorting ka logic - frontend pe hi filter ho raha hai
  const filteredIssues = useMemo(() => {
    return issues
     .filter((issue) => {
        const matchesSearch =
          issue.title
           .toLowerCase()
           .includes(debouncedSearchTerm.toLowerCase()) ||
          issue.ticket_number
           ?.toLowerCase()
           .includes(debouncedSearchTerm.toLowerCase()) ||
          getCategory(issue)
           .toLowerCase()
           .includes(debouncedSearchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "all" ||
          String(issue.status).toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      })
     .sort((a, b) =>
        sortBy === "newest"
         ? new Date(getCreatedAt(b)).getTime() -
            new Date(getCreatedAt(a)).getTime()
          : new Date(getCreatedAt(a)).getTime() -
            new Date(getCreatedAt(b)).getTime(),
      );
  }, [issues, debouncedSearchTerm, statusFilter, sortBy]);

  // Status badge ka color - pending, progress, resolved
  const getStatusBadge = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === "pending")
      return (
        <span className="bg-amber-50 text-amber-800 text- font-bold px-2.5 py-1 rounded-full uppercase flex gap-1 items-center">
          <Hourglass className="w-3 h-3" /> Pending
        </span>
      );
    if (s.includes("progress"))
      return (
        <span className="bg-blue-50 text-blue-800 text- font-bold px-2.5 py-1 rounded-full uppercase flex gap-1 items-center">
          <Clock className="w-3 h-3" /> In Progress
        </span>
      );
    if (s === "resolved")
      return (
        <span className="bg-emerald-50 text-emerald-800 text- font-bold px-2.5 py-1 rounded-full uppercase flex gap-1 items-center">
          <CheckCircle2 className="w-3 h-3" /> Resolved
        </span>
      );
    return (
      <span className="bg-rose-50 text-rose-800 text- font-bold px-2.5 py-1 rounded-full uppercase flex gap-1 items-center">
        <XCircle className="w-3 h-3" /> {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Top heading wala card - border hata diya */}
      <div className="flex justify-between bg-white p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold">My Reported Issues</h1>
          <p className="text-xs text-slate-600 mt-1">Track your complaints.</p>
        </div>
        <Link
          to="/report-issue"
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
        >
          + Report New Issue
        </Link>
      </div>

      {/* Search aur filter wala section - border hata diya */}
      <div className="bg-white p-4 rounded-2xl flex gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            id={searchInputId}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          id={statusFilterId}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          id={sortSelectId}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {/* Loading / Error / Data wala hissa */}
      {loading? (
        <div className="min-h- flex items-center justify-center text-sm font-semibold">
          <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></span>
          Loading...
        </div>
      ) : error? (
        <div className="bg-rose-50 p-4 rounded-xl text-rose-900 text-xs flex gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredIssues.map((issue) => (
              // Har issue ka card - border hata diya, shadow add kiya
              <div
                key={String(getId(issue))}
                className="bg-white p-5 rounded-2xl flex justify-between gap-4 shadow-sm hover:shadow-md transition"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="bg-slate-100 font-mono text- font-bold px-2 py-0.5 rounded">
                      #{issue.ticket_number || String(getId(issue)).slice(-6)}
                    </span>
                    {getStatusBadge(issue.status)}
                    <span className="bg-indigo-50 text-indigo-800 text- font-bold px-2 py-0.5 rounded-full">
                      {getCategory(issue)}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm">{issue.title}</h3>
                  <div className="flex gap-4 text-xs text-slate-600">
                    <span className="flex gap-1 items-center">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" /> {getArea(issue)}
                    </span>
                    <span className="flex gap-1 items-center">
                      <Clock className="w-3.5 h-3.5" /> {new Date(getCreatedAt(issue)).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 self-center">
                  <Link
                    to={`/issue/${getId(issue)}`}
                    className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold flex gap-1 items-center hover:bg-slate-200"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                  {/* Sirf pending wala hi withdraw ho sakta hai */}
                  {String(issue.status).toLowerCase() === "pending" && (
                    <button
                      onClick={() => handleWithdraw(getId(issue))}
                      className="px-3 py-2 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold flex gap-1 items-center hover:bg-rose-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Withdraw
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};
export default MyIssues;