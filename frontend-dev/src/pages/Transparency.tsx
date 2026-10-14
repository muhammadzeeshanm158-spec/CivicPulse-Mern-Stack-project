import React, { useState, useEffect, useId } from "react";
import API from "../services/api";
import {
  BarChart2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Filter,
  TrendingUp,
  FileCheck2,
  RefreshCw,
  Search
} from "lucide-react";

interface AreaStat {
  area: string;
  reported: number;
  resolved: number;
  medianTimeHours: number;
}

interface MonthlyTrend {
  month: string;
  reported: number;
  resolved: number;
}

interface TransparencyData {
  totalReported: number;
  totalResolved: number;
  avgMedianTimeHours: number;
  areaStats: AreaStat[];
  monthlyTrends: MonthlyTrend[];
}

const Transparency: React.FC = () => {
  const [data, setData] = useState<TransparencyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Accessibility Unique IDs
  const searchInputId = useId();
  const areaFilterId = useId();

  const fetchTransparencyData = async () => {
    try {
      setLoading(true);
      setError(null);
      // FIX: Backend me /public/transparency route nahi hai to /transparency/public ya /issues/stats try karo
      // Pehle /public/transparency, fail hua to /transparency, fail hua to /issues/stats
      let res;
      try {
        res = await API.get(
          `/public/transparency${selectedArea!== "all"? `?area=${selectedArea}` : ""}`
        );
      } catch {
        try {
          res = await API.get(`/transparency${selectedArea!== "all"? `?area=${selectedArea}` : ""}`);
        } catch {
          // Last fallback - admin stats se banao
          res = await API.get(`/admin/stats`);
        }
      }
      setData(res.data.data || res.data);
    } catch (err: any) {
      console.error("Failed to load transparency metrics:", err);
      // FIX: Dummy data HATA diya - Real 0 dikhao taake pata chale backend connect nahi
      setError(err.response?.data?.message || "Backend transparency API not found. Please run npm run seed");
      setData({
        totalReported: 0,
        totalResolved: 0,
        avgMedianTimeHours: 0,
        areaStats: [],
        monthlyTrends: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransparencyData();
  }, [selectedArea]);

  const filteredAreaStats = data?.areaStats?.filter((item) =>
    item.area.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg" aria-hidden="true">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Municipal Transparency Dashboard</h1>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Real-time public performance tracking, area breakdown, and resolution benchmarks.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchTransparencyData}
          aria-label="Refresh transparency metrics"
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Refresh Data
        </button>
      </div>

      {/* STATE 1: LOADING STATE */}
      {loading? (
        <div role="status" aria-live="polite" className="min-h- flex flex-col items-center justify-center text-slate-700 text-sm gap-3 font-semibold">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <p className="text-xs font-bold text-slate-700">Fetching public metrics & area benchmarks...</p>
        </div>
      ) : error? (
        /* STATE 2: ERROR STATE - FIX: Ab dummy nahi, error dikhega */
        <div role="alert" className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-900 text-xs flex flex-col gap-2 font-semibold">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="font-bold text-sm">Backend API not connected - Showing empty state</p>
              <p className="mt-0.5">{error}</p>
              <p className="mt-2 text-">Fix: cd backend-dev && npm run seed && npm run dev</p>
            </div>
          </div>
        </div>
      ) :!data || (data.totalReported === 0 && data.areaStats.length === 0)? (
        /* STATE 3: EMPTY STATE */
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 space-y-3 font-semibold text-slate-700">
          <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
          <h3 className="text-slate-900 font-bold text-sm">No Performance Data Available</h3>
          <p className="text-slate-600 text-xs">Public metrics will populate as issues get reported and resolved. Run npm run seed in backend.</p>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="region" aria-label="Performance Summary KPIs">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl" aria-hidden="true">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-bold">Total Issues Reported</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{data.totalReported}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl" aria-hidden="true">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-bold">Total Issues Resolved</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{data.totalResolved}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl" aria-hidden="true">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-bold">Median Resolution Time</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{data.avgMedianTimeHours} hrs</h3>
              </div>
            </div>
          </div>

          {/* 12-Month Trend Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                <h2 className="font-bold text-slate-900 text-sm">12-Month Resolution Trend</h2>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1 text-indigo-700">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs" aria-hidden="true"></span> Reported
                </span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" aria-hidden="true"></span> Resolved
                </span>
              </div>
            </div>

            <div className="pt-4 pb-2">
              <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-3 px-2" role="region" aria-label="Monthly trends bar chart">
                {data.monthlyTrends.map((item, idx) => {
                  const maxVal = Math.max(...data.monthlyTrends.map((t) => Math.max(t.reported, t.resolved))) || 1;
                  const reportedHeight = Math.round((item.reported / maxVal) * 100);
                  const resolvedHeight = Math.round((item.resolved / maxVal) * 100);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-36">
                        <div
                          style={{ height: `${reportedHeight}%` }}
                          className="w-1/2 bg-indigo-500 rounded-t-xs transition-all group-hover:bg-indigo-600 relative"
                          title={`Reported (${item.month}): ${item.reported}`}
                        ></div>
                        <div
                          style={{ height: `${resolvedHeight}%` }}
                          className="w-1/2 bg-emerald-500 rounded-t-xs transition-all group-hover:bg-emerald-600 relative"
                          title={`Resolved (${item.month}): ${item.resolved}`}
                        ></div>
                      </div>
                      <span className="text- text-slate-600 font-bold">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Area-wise Statistics Table & Area Filter */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Area-Wise Performance Statistics</h2>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">Compares complaint volumes and median resolution speed across zones.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                {/* Search Bar */}
                <div className="relative w-full sm:w-48">
                  <label htmlFor={searchInputId} className="sr-only">Search area</label>
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" aria-hidden="true" />
                  <input
                    id={searchInputId}
                    type="text"
                    placeholder="Search area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                {/* Area Dropdown Filter */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  <label htmlFor={areaFilterId} className="sr-only">Filter by zone area</label>
                  <select
                    id={areaFilterId}
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="all">All Zones</option>
                    {data.areaStats.map((a, i) => (
                      <option key={i} value={a.area}>
                        {a.area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Area-wise performance statistics table">
                <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-100 uppercase text-">
                  <tr>
                    <th scope="col" className="p-3.5 pl-5">Area / Ward Zone</th>
                    <th scope="col" className="p-3.5">Issues Reported</th>
                    <th scope="col" className="p-3.5">Issues Resolved</th>
                    <th scope="col" className="p-3.5">Resolution Rate</th>
                    <th scope="col" className="p-3.5 pr-5">Median Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900 font-semibold">
                  {filteredAreaStats.length === 0? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-600">
                        No area stats found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAreaStats.map((item, idx) => {
                      const rate = item.reported > 0? Math.round((item.resolved / item.reported) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition">
                          <td className="p-3.5 pl-5 font-bold text-slate-900">{item.area}</td>
                          <td className="p-3.5">{item.reported}</td>
                          <td className="p-3.5 text-emerald-700 font-bold">{item.resolved}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}>
                                <div
                                  style={{ width: `${rate}%` }}
                                  className="bg-emerald-500 h-full rounded-full"
                                ></div>
                              </div>
                              <span className="text- font-bold text-slate-900">{rate}%</span>
                            </div>
                          </td>
                          <td className="p-3.5 pr-5 font-mono text-slate-800">{item.medianTimeHours} hrs</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Transparency;