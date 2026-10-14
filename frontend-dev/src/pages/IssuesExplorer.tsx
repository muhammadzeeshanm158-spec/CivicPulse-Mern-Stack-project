import React, { useState, useEffect } from "react";
import IssueFiltersBar, { FilterState } from "../components/IssueFiltersBar";
import Pagination from "../components/Pagination";
import IssueCard, { Issue } from "../components/IssueCard";
import { AlertCircle, FileSearch, Loader2 } from "lucide-react";
import API from "../services/api";

export const IssuesExplorer: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "all",
    status: "all",
    area: "all",
    dateFrom: "",
    dateTo: "",
    nearMeRadius: "all",
  });

  // FIX: Helper - MySQL id + Mongo _id dono support
  const getId = (issue: any): number | string => issue.id ?? issue._id;

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
    setPage(1);
  };
  const handleResetFilters = () => {
    setFilters({
      search: "",
      category: "all",
      status: "all",
      area: "all",
      dateFrom: "",
      dateTo: "",
      nearMeRadius: "all",
    });
    setPage(1);
  };

  const fetchFilteredIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "8",
        ...(filters.search && { search: filters.search }),
        ...(filters.category !== "all" && { category: filters.category }),
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.area !== "all" && { area: filters.area }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.nearMeRadius !== "all" && { radius: filters.nearMeRadius }),
      });
      const res = await API.get(`/issues?${queryParams.toString()}`);
      setIssues(res.data.data || res.data.issues || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredIssues();
  }, [filters, page]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      <IssueFiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />
      {loading ? (
        <div className="py-20 flex flex-col items-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs">Fetching...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex gap-3 text-xs">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : issues.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border space-y-3">
          <FileSearch className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm">No Issues Found</h3>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold"
          >
            Reset
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {issues.map((issue: any) => (
              <IssueCard key={String(getId(issue))} issue={issue} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(newPage: number) => setPage(newPage)}
          />
        </div>
      )}
    </div>
  );
};
export default IssuesExplorer;



