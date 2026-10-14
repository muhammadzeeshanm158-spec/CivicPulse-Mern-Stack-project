import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PaginationControls } from "../components/PaginationControls";
import {
  ArrowLeft,
  MapPin,
  Tag,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Flame,
  MessageSquare,
  Send,
  Loader2,
  History,
} from "lucide-react";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// FIX 1: MySQL type - id number, _id optional, snake_case support
interface Comment {
  id: number;
  _id?: string;
  user: { name: string; role: string };
  text: string;
  created_at?: string;
  createdAt?: string;
}
interface TimelineEvent {
  id: number;
  status: string;
  action_by: string;
  role: string;
  comment?: string;
  timestamp: string;
}
interface IssueDetailData {
  id: number;
  _id?: string;
  ticket_number: string;
  title: string;
  description: string;
  category?: string;
  category_name?: string;
  area?: string;
  area_name?: string;
  address: string;
  latitude: number;
  longitude: number;
  issue_images?: string[];
  before_image_url?: string;
  after_image_url?: string;
  status: string;
  priority: string;
  sla_deadline?: string;
  reporter?: {
    name: string;
    email: string;
    isAnonymous?: boolean;
    is_anonymous?: boolean;
  };
  assigned_officer?: { name: string; department: string; phone?: string };
  resolution_info?: {
    resolved_at: string;
    remarks: string;
    proof_images: string[];
  };
  timeline: TimelineEvent[];
}

const IssueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // URL param string hoga
  const navigate = useNavigate();
  const [issue, setIssue] = useState<IssueDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [totalCommentPages, setTotalCommentPages] = useState(1);

  // Helpers
  const getId = (c: any) => c.id ?? c._id;
  const getCreatedAt = (c: any) => c.created_at || c.createdAt;
  const getCategory = (i: any) => i.category_name || i.category;
  const getArea = (i: any) => i.area_name || i.area;

  useEffect(() => {
    const fetchIssueDetail = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/issues/${id}`);
        setIssue(res.data.data || res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchIssueDetail();
  }, [id]);

  const fetchComments = async () => {
    if (!id) return;
    try {
      const res = await API.get(
        `/issues/${id}/comments?page=${commentPage}&limit=5`,
      );
      setComments(res.data.data || res.data.comments || []);
      setTotalCommentPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    fetchComments();
  }, [id, commentPage]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    if (!newComment.trim()) {
      setCommentError("Comment empty");
      return;
    }
    if (newComment.trim().length < 5) {
      setCommentError("Min 5 chars");
      return;
    }
    try {
      setCommentSubmitting(true);
      await API.post(`/issues/${id}/comments`, { text: newComment });
      setNewComment("");
      fetchComments();
    } catch (err: any) {
      setCommentError(err.response?.data?.message || "Failed");
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h- flex items-center justify-center text-sm">
        <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></span>
        Loading...
      </div>
    );
  if (error || !issue)
    return (
      <div className="bg-rose-50 border p-6 rounded-2xl text-rose-700 text-sm">
        <p className="font-semibold flex gap-2">
          <AlertCircle className="w-5 h-5" /> Not found
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs"
        >
          Go Back
        </button>
      </div>
    );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex justify-between bg-white p-6 rounded-2xl border shadow-xs">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-slate-500 flex gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex gap-2 flex-wrap">
            <span className="bg-indigo-50 border text-indigo-700 font-mono text-xs px-2.5 py-1 rounded-lg">
              #{issue.ticket_number || `ISS-${issue.id}`}
            </span>
            <span className="text- font-bold px-2.5 py-1 rounded-full uppercase bg-amber-100">
              {String(issue.status).replace("_", " ")}
            </span>
            <span className="text- font-bold px-2.5 py-1 rounded-full bg-slate-100 flex gap-1">
              <Flame className="w-3 h-3" /> {issue.priority}
            </span>
          </div>
          <h1 className="text-xl font-bold pt-1">{issue.title}</h1>
        </div>
        <div className="bg-slate-50 border p-3.5 rounded-xl text-right">
          <p className="text- font-semibold text-slate-400 uppercase flex justify-end gap-1">
            <Clock className="w-3 h-3" /> SLA
          </p>
          <p className="text-xs font-bold mt-1">
            {issue.sla_deadline
              ? new Date(issue.sla_deadline).toLocaleString()
              : "24-48 Hours"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border space-y-4">
            <h2 className="text-sm font-bold uppercase flex gap-2 border-b pb-3">
              <FileText className="w-4 h-4 text-indigo-600" /> Info
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400">Category</p>
                <p className="font-semibold flex gap-1">
                  <Tag className="w-3.5 h-3.5" /> {getCategory(issue)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Area</p>
                <p className="font-semibold">{getArea(issue)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400">Address</p>
                <p className="font-semibold flex gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />{" "}
                  {issue.address}
                </p>
              </div>
            </div>
            <p className="text-xs bg-slate-50 p-4 rounded-xl border">
              {issue.description}
            </p>
            {issue.issue_images && (
              <div className="grid grid-cols-5 gap-2">
                {issue.issue_images.map((img, idx) => (
                  <a key={idx} href={img} target="_blank">
                    <img
                      src={img}
                      alt=""
                      className="w-full h-20 object-cover rounded-xl border"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-2xl border space-y-3">
            <h2 className="text-sm font-bold uppercase flex gap-2">
              <MapPin className="w-4 h-4 text-rose-500" /> Location
            </h2>
            <div className="h-56 rounded-xl overflow-hidden border">
              <MapContainer
                center={[issue.latitude || 24.86, issue.longitude || 67.0]}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker
                  position={[issue.latitude || 24.86, issue.longitude || 67.0]}
                >
                  <Popup>{issue.title}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border space-y-4">
            <h2 className="text-sm font-bold uppercase flex gap-2">
              <MessageSquare className="w-4 h-4" /> Comments
            </h2>
            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                rows={2}
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  if (commentError) setCommentError(null);
                }}
                placeholder="Add comment..."
                className={`w-full p-3 bg-slate-50 border rounded-xl text-xs ${commentError ? "border-rose-500" : "border-slate-200"}`}
              />
              {commentError && (
                <p className="text- text-rose-600">{commentError}</p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={commentSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex gap-1"
                >
                  {commentSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Post
                    </>
                  )}
                </button>
              </div>
            </form>
            <div className="space-y-3">
              {comments.map((c) => (
                <div
                  key={String(getId(c))}
                  className="p-3 bg-slate-50 rounded-xl border text-xs"
                >
                  <div className="flex justify-between">
                    <span className="font-bold">{c.user?.name}</span>
                    <span className="text- text-slate-400">
                      {new Date(
                        getCreatedAt(c) || Date.now(),
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600">{c.text}</p>
                </div>
              ))}
              <PaginationControls
                currentPage={commentPage}
                totalPages={totalCommentPages}
                onPageChange={setCommentPage}
              />
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase flex gap-1">
              <User className="w-3.5 h-3.5" /> Reporter
            </p>
            {issue.reporter?.isAnonymous || issue.reporter?.is_anonymous ? (
              <div className="bg-slate-50 p-2.5 rounded-xl text-xs italic">
                Anonymous
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold">
                  {issue.reporter?.name || "Citizen"}
                </p>
                <p className="text- text-slate-500">{issue.reporter?.email}</p>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-2xl border space-y-4">
            <h2 className="text-sm font-bold uppercase flex gap-2">
              <History className="w-4 h-4" /> Timeline
            </h2>
            {issue.timeline?.map((event) => (
              <div key={event.id} className="text-xs">
                <p className="font-bold capitalize">
                  {event.status.replace("_", " ")}
                </p>
                <p className="text- text-slate-500">By {event.action_by}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default IssueDetail;
