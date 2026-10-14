import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import path from "path";
import fs from "fs";

// 💾 File ko memory buffer mein hold karte hain taaki Sharp se process ki ja sake.
const memoryBufferStorage = multer.memoryStorage();

// ✅ Allowed MIME types (PDF requirement: jpg/png/webp)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// 📤 Multer instance — memory storage + limits + MIME filter
export const upload = multer({
  storage: memoryBufferStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // ✅ 5MB per file (PDF requirement)
    files: 5,                  // ✅ Max 5 files (PDF requirement)
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Invalid file type! Only JPG, PNG, and WEBP images are allowed. 🚫"));
    }
    cb(null, true);
  },
});

// ============================================================
// 🛡️ MIDDLEWARE: Magic Number Check & Image Compression (Sharp)
// ============================================================
export const processUploadedImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file && (!req.files || (req.files as Express.Multer.File[]).length === 0)) {
      return next(); // Agar koi file nahi aayi toh agle middleware par jao
    }

    const files = req.file ? [req.file] : (req.files as Express.Multer.File[]);
    const uploadDir = path.join("uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const processedFiles = [];

    for (const file of files) {
      // 1. 🛡️ Magic Number Security Check (Buffer inspection)
      const detectedType = await fileTypeFromBuffer(file.buffer);
      if (!detectedType || !["jpg", "jpeg", "png", "webp"].includes(detectedType.ext)) {
        return res.status(400).json({ 
          success: false, 
          error: `Security Alert: File content does not match allowed image types for ${file.originalname} ❌` 
        });
      }

      // 2. ⚡ Sharp Compression & Resizing (PDF Requirement)
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filename = `image-${uniqueSuffix}.webp`;
      const thumbnailName = `thumb-${uniqueSuffix}.webp`;

      const outputPath = path.join(uploadDir, filename);
      const thumbnailPath = path.join(uploadDir, thumbnailName);

      // Main image resize (Max width 1200px, WebP format, Quality 80)
      await sharp(file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

      // Thumbnail image resize (Width 300px, WebP format, Quality 70)
      await sharp(file.buffer)
        .resize({ width: 300, withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(thumbnailPath);

      // Processed data ko request object mein attach kar dena
      processedFiles.push({
        originalName: file.originalname,
        filename,
        thumbnail: thumbnailName,
        path: `/uploads/${filename}`
      });
    }

    // Request mein processed files save karlein taaki controller mein use ho sakein
    (req as any).processedFiles = processedFiles;
    next();
  } catch (error: any) {
    console.error("Image processing error:", error);
    return res.status(500).json({ success: false, error: "Error while processing and compressing images." });
  }
};

// ============================================================
// 🛡️ WRAPPER: Multer errors ko user-friendly JSON banana
// ============================================================
export const handleUploadErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, error: "File too large! Max 5MB per image. ❌" });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ success: false, error: "Too many files! Max 5 images allowed. ❌" });
    }
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message || "Upload failed." });
  }
  next();
};