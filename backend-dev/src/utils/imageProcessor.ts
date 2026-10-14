import sharp from "sharp";
import path from "path";
import fs from "fs";

export const processImage = async (file: Express.Multer.File): Promise<{ filename: string; thumbnail: string }> => {
  const uploadDir = path.join("uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const filename = `image-${uniqueSuffix}.webp`;
  const thumbnailName = `thumb-${uniqueSuffix}.webp`;

  const outputPath = path.join(uploadDir, filename);
  const thumbnailPath = path.join(uploadDir, thumbnailName);

  // 1. Main image compress aur resize karna (Max width 1200px, WebP format)
  await sharp(file.path)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath);

  // 2. Thumbnail banana (Width 300px, WebP format)
  await sharp(file.path)
    .resize({ width: 300, withoutEnlargement: true })
    .webp({ quality: 70 })
    .toFile(thumbnailPath);

  // Temporary uploaded file ko delete karna (jo multer ne save ki thi)
  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  return {
    filename,
    thumbnail: thumbnailName,
  };
};