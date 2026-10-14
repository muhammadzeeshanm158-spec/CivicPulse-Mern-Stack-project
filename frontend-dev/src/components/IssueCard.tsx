import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock, Tag, AlertTriangle } from "lucide-react";

export interface Issue {
  id: number;
  _id?: string;
  ticket_number?: string;
  title: string;
  category?: string;
  category_name?: string;
  area?: string;
  area_name?: string;
  status: string;
  priority?: string;
  created_at?: string;
  createdAt?: string;
  before_image_url?: string;
  image_urls?: string[];
  images?: string[];
}

const IssueCard: React.FC<{ issue: Issue }> = ({ issue }) => {
  const getId = (i: any) => i.id ?? i._id;
  const getCategory = (i: any) => i.category_name || i.category || "General";
  const getArea = (i: any) => i.area_name || i.area || "N/A";
  const getCreatedAt = (i: any) => i.created_at || i.createdAt;
  // FIX: image_urls + before_image_url + images teeno support
  const img =
    (issue as any).before_image_url ||
    (issue as any).image_urls?.[0] ||
    issue.images?.[0];

  const s = String(issue.status).toLowerCase();
  const statusColor =
    s === "pending"
      ? "bg-amber-100 text-amber-800 border border-amber-200"
      : s.includes("progress")
        ? "bg-blue-100 text-blue-800 border border-blue-200"
        : s === "resolved"
          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
          : "bg-rose-100 text-rose-800";
  const p = String(issue.priority || "Medium").toLowerCase();
  const priorityColor =
    p === "critical" || p === "high"
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : "bg-slate-100 text-slate-700 border";

  return (
    <Link
      to={`/issue/${getId(issue)}`}
      className="bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all shadow-xs overflow-hidden flex flex-col group"
    >
      {img ? (
        <img
          src={img}
          alt={issue.title}
          className="w-full h-32 object-cover group-hover:scale-[1.02] transition"
        />
      ) : (
        <div className="w-full h-32 bg-slate-100 flex items-center justify-center text- text-slate-400">
          No Image
        </div>
      )}
      <div className="p-4 space-y-2 flex-1">
        <div className="flex gap-1.5 flex-wrap">
          {/* FIX: text- ki jagah text- */}
          <span
            className={`text- font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${statusColor}`}
          >
            {String(issue.status).replace("_", " ")}
          </span>
          <span
            className={`text- font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex gap-0.5 items-center ${priorityColor}`}
          >
            <AlertTriangle className="w-3 h-3" /> {issue.priority || "Medium"}
          </span>
        </div>
        <h3 className="font-bold text-sm line-clamp-2 leading-snug">
          {issue.title}
        </h3>
        {/* FIX: text- ki jagah text- */}
        <div className="text- text-slate-600 space-y-1 font-medium">
          <div className="flex gap-1 items-center">
            <Tag className="w-3 h-3 text-indigo-500 shrink-0" />{" "}
            {getCategory(issue)}
          </div>
          <div className="flex gap-1 items-center">
            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />{" "}
            {getArea(issue)}
          </div>
          <div className="flex gap-1 items-center">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />{" "}
            {new Date(getCreatedAt(issue) || Date.now()).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Link>
  );
};
export default IssueCard;
