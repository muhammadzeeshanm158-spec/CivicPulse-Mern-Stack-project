import { Router } from "express";
import {
  issueController,
  getDashboardAnalytics,
  getIssuesByBoundingBox,
} from "../controllers/issueController.js";
import { validateIssue } from "../validation/issueValidation.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import {
  verifyToken,
  authorizeRoles,
  checkTokenBlacklist,
  isAccountActive,
  verifyOwner,
} from "../middlewares/authMiddleware.js";

const router = Router();

// ============================================================
// 🗺 1. GEOSPATIAL & SPECIFIC ROUTES - Hamesha /:id se PEHLE
// ============================================================
// PDF: Map clustering ke liye bbox + radius + nearby duplicate check

// Radius search — public (guest bhi dekh sakta hai map par)
router.get("/map/radius", issueController.getIssuesByRadius);

// BBox - Map par 500 markers max - public
router.get("/map/bounds", getIssuesByBoundingBox);
router.get("/map/bbox", issueController.getMapIssuesByBbox);

// ✅ FIX: PublicMap.tsx 404 fix - Frontend /public-map call karta hai
router.get("/public-map", issueController.getAllIssues); // ← YE MISSING THA!
router.get("/public/map", issueController.getAllIssues);
router.get("/map", issueController.getAllIssues);

// Nearby duplicate check — 100m me similar issue hai ya nahi
router.get(
  "/nearby",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.getNearbyDuplicates,
);

// Area auto-detect - Spatial polygon se
router.get(
  "/location/detect-area",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.autoDetectAreaAndCity,
);

// Reverse geocode - lat/lng se address
router.get(
  "/geo/reverse-lookup",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.reverseGeocodeLookup,
);

// Dashboard Analytics - sirf manager/admin
router.get(
  "/analytics/dashboard",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  authorizeRoles("manager", "admin"),
  getDashboardAnalytics,
);

// ============================================================
// ✅ 2. MY ISSUES - /:id SE PEHLE HONA LAZMI HAI! (YE FIX HAI)
// ============================================================
router.get(
  "/my-issues",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.getMyIssues,
);
router.get(
  "/my",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.getMyIssues,
);
router.get(
  "/user/my-issues",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.getMyIssues,
);

// ============================================================
// 🚩 3. ABUSE & MODERATION ROUTES
// ============================================================
router.post(
  "/abuse/report",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.submitAbuseReport,
);

router.patch(
  "/admin/abuse/resolve/:reportId",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  authorizeRoles("manager", "admin"),
  issueController.resolveAbuseReport,
);

router.patch(
  "/comments/:commentId/moderate",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  authorizeRoles("manager", "admin"),
  issueController.moderateComment,
);

// Cloud upload
router.post(
  "/media/cloud-upload",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  upload.single("image"),
  issueController.uploadToCloudinaryStorage,
);

// ============================================================
// 📋 4. CRUD ROUTES - Public list
// ============================================================
router.get("/", issueController.getAllIssues);
router.get("/:id/comments", issueController.getComments);
router.get("/:id/comments/approved", issueController.getApprovedComments);
router.get("/:id", issueController.getIssueById); // ← Ye hamesha last me!

// ============================================================
// 📝 5. CREATE ISSUE - Citizen report
// ============================================================
router.post(
  "/create",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  upload.array("images", 5),
  validateIssue,
  issueController.createIssue,
);

// ============================================================
// 🔄 6. STATUS, ASSIGN, DELETE, ACTIONS
// ============================================================

// Status update - Officer, Manager, Admin
router.patch(
  "/:id/status",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  authorizeRoles("officer", "manager", "admin"),
  issueController.updateIssueStatus,
);

// ✅ FIX: assignOfficerToIssue nahi, issueController.assignIssue
router.patch(
  "/:id/assign",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  authorizeRoles("manager", "admin"),
  issueController.assignIssue,
);

// Resolve with proof - Sirf assigned officer
router.patch(
  "/:id/resolve",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  authorizeRoles("officer"),
  upload.array("proofImages", 3),
  issueController.resolveIssue,
);

// Merge duplicate - Manager
router.patch(
  "/:id/merge-duplicate",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  authorizeRoles("manager", "admin"),
  issueController.mergeDuplicate,
);

// Upvote - Priority badhane ke liye
router.post(
  "/:id/upvote",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.toggleUpvote,
);
router.post(
  "/:id/follow",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.toggleFollow,
);
router.post(
  "/:id/comments",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.addComment,
);
router.post(
  "/:id/rate",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.rateResolution,
);
router.post(
  "/:id/reopen",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  issueController.reopenIssue,
);

// Delete - Sirf admin ya owner
router.delete(
  "/:id",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  verifyOwner("issues", "user_id"),
  issueController.deleteIssue,
);

export default router;