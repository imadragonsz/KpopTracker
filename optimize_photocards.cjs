// Batch optimize all images in assets/photocards to WebP using sharp
// Usage: node optimize_photocards.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const photocardsDir = path.join(__dirname, "assets", "photocards");

const SIZES = [400, 800, 1200]; // Responsive widths
const MAX_HEIGHT = 1200;
const QUALITY = 80;

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".webp") return; // Already optimized
  const base = filePath.replace(ext, "");
  try {
    for (const size of SIZES) {
      const outPath = `${base}-${size}.webp`;
      await sharp(filePath)
        .resize({
          width: size,
          height: MAX_HEIGHT,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: QUALITY })
        .toFile(outPath);
      console.log(`Generated: ${path.basename(outPath)}`);
    }
    // Replace original with largest size (for legacy use)
    const largestPath = `${base}-${Math.max(...SIZES)}.webp`;
    fs.unlinkSync(filePath);
    fs.copyFileSync(largestPath, filePath);
    console.log("Replaced original with:", path.basename(largestPath));
  } catch (err) {
    console.error("Failed to optimize", filePath, err);
  }
}

async function optimizeAll() {
  const files = fs.readdirSync(photocardsDir);
  for (const file of files) {
    const filePath = path.join(photocardsDir, file);
    if (fs.statSync(filePath).isFile() && !file.endsWith(".meta.json")) {
      await optimizeImage(filePath);
    }
  }
  console.log("Batch optimization complete.");
}

optimizeAll();
