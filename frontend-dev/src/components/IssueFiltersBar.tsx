import React, { useId } from "react";
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  X,
  SlidersHorizontal,
  Navigation,
} from "lucide-react";

export interface FilterState {
  search: string;
  category: string; // Yeh category_id ho sakta hai future me, abhi string hai
  status: string;
  area: string; // area_id ho sakta hai
  dateFrom: string;
  dateTo: string;
  nearMeRadius: string;
}

interface IssueFiltersBarProps {
  filters: FilterState;
  onFilterChange: (updated: Partial<FilterState>) => void;
  onReset: () => void;
  categoriesList?: string[];
  areasList?: string[];
}

const IssueFiltersBar: React.FC<IssueFiltersBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  categoriesList = [
    "Pothole",
    "Water Supply",
    "Garbage/Waste",
    "Street Light",
    "Drainage",
    "Traffic",
  ],
  areasList = [
    "Zone A - Central",
    "Zone B - North",
    "Zone C - South",
    "Zone D - East",
  ],
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const searchInputId = useId();
  const statusSelectId = useId();
  const categorySelectId = useId();
  const areaSelectId = useId();
  const dateFromId = useId();
  const dateToId = useId();
  const radiusSelectId = useId();

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
      {/* Primary Search - Title, ticket_number se search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            Search issues by title, description, or ticket number
          </label>
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            id={searchInputId}
            type="text"
            placeholder="Search by issue title, description, or ticket #..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "" })}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 p-0.5 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {/* Status Filter - pending, in_progress, resolved */}
          <div className="flex-1 sm:flex-none">
            <label htmlFor={statusSelectId} className="sr-only">
              Filter by status
            </label>
            <select
              id={statusSelectId}
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Advanced Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${showAdvanced ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Drawer - Category, Area, Date, Radius */}
      {showAdvanced && (
        <div
          id="advanced-filters-drawer"
          className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3"
        >
          <div className="space-y-1">
            <label
              htmlFor={categorySelectId}
              className="text- font-bold text-slate-600 uppercase"
            >
              Category
            </label>
            <select
              id={categorySelectId}
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label
              htmlFor={areaSelectId}
              className="text- font-bold text-slate-600 uppercase"
            >
              Area / Ward
            </label>
            <select
              id={areaSelectId}
              value={filters.area}
              onChange={(e) => onFilterChange({ area: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="all">All Areas</option>
              {areasList.map((a, i) => (
                <option key={i} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label
              htmlFor={dateFromId}
              className="text- font-bold text-slate-600 uppercase"
            >
              Date From
            </label>
            <input
              id={dateFromId}
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={dateToId}
              className="text- font-bold text-slate-600 uppercase"
            >
              Date To
            </label>
            <input
              id={dateToId}
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFilterChange({ dateTo: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={radiusSelectId}
              className="text- font-bold text-slate-600 uppercase flex items-center gap-1"
            >
              <Navigation className="w-3 h-3 text-indigo-600" /> Near Me Radius
            </label>
            <select
              id={radiusSelectId}
              value={filters.nearMeRadius}
              onChange={(e) => onFilterChange({ nearMeRadius: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="all">Any Distance</option>
              <option value="1">Within 1 km</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueFiltersBar;
