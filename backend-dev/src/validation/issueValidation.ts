import type { Response, Request, NextFunction } from "express";

// ============================================================
// 📝 ISSUE VALIDATION
// ============================================================
// Citizen jab naya issue report kare, to data validate karta hai.
//
// ⚠️ MISSING:
// - Title minimum length (2+ chars)
// - Description minimum length (10+ chars)
// - Latitude/longitude required (PDF ke mutabiq location mandatory)
// - Duplicate check (controller mein hona chahiye)
export const validateIssue = (req: Request, res: Response, next: NextFunction) => {
  const { title, description, location, category_id, latitude, longitude } = req.body;

  if (!title || title.trim() === "") {
    return res.status(400).json({ success: false, message: "Title is required! 📝" });
  }

  // ✅ ADD: title min length
  if (title.trim().length < 3) {
    return res.status(400).json({ success: false, message: "Title must be at least 3 characters! 📝" });
  }

  if (!description || description.trim() === "") {
    return res.status(400).json({ success: false, message: "Description is required! 📄" });
  }

  // ✅ ADD: description min length
  if (description.trim().length < 10) {
    return res.status(400).json({ success: false, message: "Description must be at least 10 characters! 📄" });
  }

  if (!location || location.trim() === "") {
    return res.status(400).json({ success: false, message: "Location is required! 📍" });
  }

  if (!category_id || isNaN(Number(category_id))) {
    return res.status(400).json({ success: false, message: "Valid category_id is required! 🏷️" });
  }

  // ⚠️ PDF ke mutabiq location (lat/lng) mandatory hai — lekin aapne optional rakha hai.
  // Agar location pin ke bina report allow nahi karni to required karo:
  // if (latitude === undefined || longitude === undefined) {
  //   return res.status(400).json({ success: false, message: "Latitude and longitude are required! 🌐" });
  // }

  if (latitude !== undefined && latitude !== null && isNaN(Number(latitude))) {
    return res.status(400).json({ success: false, message: "Latitude must be a valid number! 🌐" });
  }

  if (longitude !== undefined && longitude !== null && isNaN(Number(longitude))) {
    return res.status(400).json({ success: false, message: "Longitude must be a valid number! 🌐" });
  }

  next();
};

// ============================================================
// ⭐ RATING VALIDATION
// ============================================================
// Resolution rating 1-5 + feedback check.
export const validateRatingInput = (req: Request, res: Response, next: NextFunction) => {
  const { rating, feedback } = req.body;

  if (!rating || isNaN(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ success: false, error: "Rating is required and must be a number between 1 and 5! ⭐" });
  }

  if (!feedback || feedback.trim() === "") {
    return res.status(400).json({ success: false, error: "Feedback comment text is required! 📄" });
  }

  // ✅ ADD: feedback max length
  if (feedback.length > 1000) {
    return res.status(400).json({ success: false, error: "Feedback must be under 1000 characters! 📄" });
  }

  next();
};

// ============================================================
// 🛠️ MODERATION VALIDATION
// ============================================================
// Comment moderation ke liye sirf "approved" ya "rejected" allow.
export const validateModerationInput = (req: Request, res: Response, next: NextFunction) => {
  const { status } = req.body;
  const allowedModerationStates = ["approved", "rejected"];

  if (!status || !allowedModerationStates.includes(status)) {
    return res.status(400).json({ success: false, error: "Valid moderation action status ('approved' or 'rejected') is required! ⚠️" });
  }

  next();
};

// ============================================================
// 🛠️ ABUSE REPORT VALIDATION
// ============================================================
// ✅ Achha — item_type aur reason validate ho rahe hain.
export const validateAbuseReportInput = (req: Request, res: Response, next: NextFunction) => {
  const { item_type, reported_item_id, reason } = req.body;
  const validTypes = ["comment", "issue", "user"];
  const validReasons = ["Spam", "Harassment", "Nudity", "Fake Profile", "Inappropriate"];

  if (!item_type || !validTypes.includes(item_type)) {
    return res.status(400).json({ success: false, error: "Valid item_type ('comment', 'issue', 'user') is required! ⚠️" });
  }
  if (!reported_item_id || isNaN(Number(reported_item_id))) {
    return res.status(400).json({ success: false, error: "A valid reported_item_id identifier is required! ❌" });
  }
  if (!reason || !validReasons.includes(reason)) {
    return res.status(400).json({ success: false, error: "A valid standard abuse reporting reason selection is mandatory! 📋" });
  }

  next();
};

// ============================================================
// 🛠️ GEO COORDINATES VALIDATION (OPTIONAL)
// ============================================================
// Note: yeh optional check hai — lat/lng agar diye hain to valid hone chahiye.
export const validateGeoCoordinatesInput = (req: Request, res: Response, next: NextFunction) => {
  const { lat, lng } = req.query;

  if (lat && isNaN(Number(lat))) {
    return res.status(400).json({ success: false, error: "Latitude coordinate metadata value format is invalid! 🌐" });
  }
  if (lng && isNaN(Number(lng))) {
    return res.status(400).json({ success: false, error: "Longitude coordinate metadata value format is invalid! 🌐" });
  }

  next();
};

// ============================================================
// 🛠️ REVERSE GEO VALIDATION (REQUIRED)
// ============================================================
// Reverse geocoding ke liye lat/lng mandatory.
export const validateReverseGeoInput = (req: Request, res: Response, next: NextFunction) => {
  const { lat, lng } = req.query;

  if (!lat || isNaN(Number(lat))) {
    return res.status(400).json({ success: false, error: "Latitude parameter value is missing or invalid! 🌐" });
  }
  if (!lng || isNaN(Number(lng))) {
    return res.status(400).json({ success: false, error: "Longitude parameter value is missing or invalid! 🌐" });
  }

  next();
};

// ============================================================
// 🛠️ SEARCH FILTERS VALIDATION
// ============================================================
// Pagination aur category filters validate karta hai.
export const validateSearchFiltersInput = (req: Request, res: Response, next: NextFunction) => {
  const { category_id, page, limit } = req.query;

  if (category_id && isNaN(Number(category_id))) {
    return res.status(400).json({ success: false, error: "Filter category_id must be a valid numeric identifier! 🏷️" });
  }
  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    return res.status(400).json({ success: false, error: "Pagination page index parameter must be a positive integer! 🔢" });
  }
  if (limit && (isNaN(Number(limit)) || Number(limit) < 1)) {
    return res.status(400).json({ success: false, error: "Pagination limit constraint bounds must be a positive integer! 🔢" });
  }
  // ✅ ADD: limit max cap
  if (limit && Number(limit) > 100) {
    return res.status(400).json({ success: false, error: "Limit cannot exceed 100! 🔢" });
  }

  next();
};