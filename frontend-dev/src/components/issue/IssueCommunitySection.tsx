import React, { useState, useId } from "react";
import {
  ThumbsUp,
  Bell,
  BellOff,
  MessageSquare,
  CornerDownRight,
  Flag,
  EyeOff,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// FIX 1: MySQL ke hisab se Comment type - id: number, _id optional
// Pehle _id: string tha (Mongo), ab id: number hai (MySQL)
export interface CommentType {
  id: number; // FIX: MySQL primary key - number
  _id?: string; // backward compat ke liye optional
  user: {
    id: number; // FIX: user id bhi number
    _id?: string;
    name: string;
    avatar?: string;
  };
  text: string;
  parent_id?: number | null; // FIX: Backend parent_id bhejta hai, parentId nahi
  parentId?: string | null; // purana field
  created_at?: string; // FIX: Backend created_at bhejta hai
  createdAt: string;
  is_reported?: boolean;
  isReported?: boolean;
  is_hidden?: boolean;
  isHidden?: boolean;
  replies?: CommentType[];
}

interface IssueCommunitySectionProps {
  issueId: number | string; // FIX: number bhi accept karo
  initialUpvotes: number;
  isUpvotedByMe: boolean;
  isFollowedByMe: boolean;
  comments: CommentType[];
  onUpvoteToggle: () => void;
  onFollowToggle: () => void;
  onAddComment: (
    text: string,
    parentId?: number | string | null,
  ) => Promise<void>;
  onReportComment: (commentId: number | string) => Promise<void>;
  onModerateComment?: (
    commentId: number | string,
    isHidden: boolean,
  ) => Promise<void>;
}

const IssueCommunitySection: React.FC<IssueCommunitySectionProps> = ({
  initialUpvotes,
  isUpvotedByMe,
  isFollowedByMe,
  comments,
  onUpvoteToggle,
  onFollowToggle,
  onAddComment,
  onReportComment,
  onModerateComment,
}) => {
  const { user } = useAuth();
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | string | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mainCommentInputId = useId();

  // FIX 2: Helper functions - MySQL id aur Mongo _id dono ko handle karenge
  const getCommentId = (c: any): number | string => c.id ?? c._id;
  const getParentId = (c: any) => c.parent_id ?? c.parentId;
  const getCreatedAt = (c: any) => c.created_at || c.createdAt;
  const getIsHidden = (c: any) => c.is_hidden ?? c.isHidden;

  // Top-level comments: jinka parent_id null hai
  const rootComments = comments.filter((c) => !getParentId(c));
  const getReplies = (parentId: number | string) =>
    comments.filter((c) => String(getParentId(c)) === String(parentId));

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setSubmitting(true);
    await onAddComment(newCommentText.trim(), null); // null = top-level comment
    setNewCommentText("");
    setSubmitting(false);
  };

  const handleReplySubmit = async (parentId: number | string) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onAddComment(replyText.trim(), parentId); // parentId ke saath reply
    setReplyText("");
    setReplyingToId(null);
    setSubmitting(false);
  };

  return (
    <section
      aria-label="Community discussion and actions"
      className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6"
    >
      {/* 1. Action Bar: Upvote & Follow */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {/* Upvote Button - toggle hota hai */}
          <button
            type="button"
            onClick={onUpvoteToggle}
            aria-pressed={isUpvotedByMe}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${isUpvotedByMe ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
          >
            <ThumbsUp
              className={`w-4 h-4 ${isUpvotedByMe ? "fill-white" : ""}`}
            />
            <span>{isUpvotedByMe ? "Upvoted" : "Upvote"}</span>
            <span
              className={`ml-1 px-2 py-0.5 text-xs rounded-full ${isUpvotedByMe ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-800 font-bold"}`}
            >
              {initialUpvotes}
            </span>
          </button>

          {/* Follow Button - notification ke liye */}
          <button
            type="button"
            onClick={onFollowToggle}
            aria-pressed={isFollowedByMe}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${isFollowedByMe ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
          >
            {isFollowedByMe ? (
              <>
                <BellOff className="w-4 h-4 text-emerald-700" />
                <span>Following</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-slate-600" />
                <span>Follow Updates</span>
              </>
            )}
          </button>
        </div>
        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <span>{comments.length} Comments</span>
        </div>
      </div>

      {/* 2. New Comment Input - naya comment likhne ke liye */}
      <form onSubmit={handleCommentSubmit} className="space-y-3">
        <label
          htmlFor={mainCommentInputId}
          className="block text-xs font-bold text-slate-800 uppercase"
        >
          Leave a comment
        </label>
        <div className="flex gap-2">
          <textarea
            id={mainCommentInputId}
            rows={2}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Share an update or ask a question..."
            className="flex-1 p-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none resize-none transition"
          />
          <button
            type="submit"
            disabled={submitting || !newCommentText.trim()}
            className="px-4 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1 shrink-0 self-end py-3"
          >
            <Send className="w-3.5 h-3.5" /> Post
          </button>
        </div>
      </form>

      {/* 3. Comments List - Threaded comments (reply ke saath) */}
      <div className="space-y-4 pt-4" role="list" aria-label="Comment threads">
        {rootComments.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-6">
            No comments yet. Be the first to start the conversation!
          </p>
        ) : (
          rootComments.map((comment) => {
            const replies = getReplies(getCommentId(comment));
            const userRole = String((user as any)?.role ?? "").toLowerCase();
            const isUserAdminOrOfficer =
              userRole === "admin" ||
              userRole === "officer" ||
              userRole === "manager";
            const isHidden = getIsHidden(comment);

            return (
              <div
                key={String(getCommentId(comment))}
                role="listitem"
                className="border border-slate-200/80 rounded-xl p-4 space-y-3 bg-slate-50/50"
              >
                {isHidden ? (
                  <div className="flex items-center gap-2 text-slate-600 text-xs italic bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                    <EyeOff className="w-4 h-4 text-slate-500" /> This comment
                    has been hidden by moderators.
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {comment.user.name}
                        </span>
                        <span className="text- text-slate-600 font-medium">
                          {new Date(getCreatedAt(comment)).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onReportComment(getCommentId(comment))}
                          className="text-slate-600 hover:text-amber-600 text- font-semibold flex items-center gap-1 transition"
                        >
                          <Flag className="w-3 h-3" /> Report
                        </button>
                        {isUserAdminOrOfficer && onModerateComment && (
                          <button
                            type="button"
                            onClick={() =>
                              onModerateComment(getCommentId(comment), true)
                            }
                            className="text-slate-600 hover:text-rose-600 text- font-semibold flex items-center gap-1 transition"
                          >
                            <ShieldAlert className="w-3 h-3" /> Hide
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed mb-2">
                      {comment.text}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyingToId(
                          replyingToId === getCommentId(comment)
                            ? null
                            : getCommentId(comment),
                        )
                      }
                      className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <CornerDownRight className="w-3 h-3" /> Reply
                    </button>
                  </div>
                )}

                {replyingToId === getCommentId(comment) && (
                  <div className="mt-3 ml-4 pl-3 border-l-2 border-indigo-200 space-y-2">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${comment.user.name}...`}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setReplyingToId(null)}
                        className="px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplySubmit(getCommentId(comment))}
                        disabled={submitting || !replyText.trim()}
                        className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}

                {replies.length > 0 && (
                  <div
                    className="mt-3 ml-4 pl-3 border-l-2 border-slate-200 space-y-3"
                    role="list"
                    aria-label="Replies"
                  >
                    {replies.map((reply) => (
                      <div
                        key={String(getCommentId(reply))}
                        role="listitem"
                        className="bg-white p-3 rounded-lg border border-slate-200/80"
                      >
                        {getIsHidden(reply) ? (
                          <p className="text-xs text-slate-500 italic">
                            Reply hidden by moderator.
                          </p>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-slate-900">
                                {reply.user.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onReportComment(getCommentId(reply))
                                }
                                className="text-slate-600 hover:text-amber-600 text- p-0.5 rounded-md"
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-800">
                              {reply.text}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default IssueCommunitySection;
