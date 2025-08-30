// Batch optimize all images in assets/photocards to WebP using sharp
// Usage: node optimize_photocards.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const photocardsDir = path.join(__dirname, 'assets', 'photocards');
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 80;

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webp') return; // Already optimized
  const outPath = filePath + '.webp';
  try {
    await sharp(filePath)
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outPath);
    fs.unlinkSync(filePath);
    fs.renameSync(outPath, filePath);
    console.log('Optimized:', path.basename(filePath));
  } catch (err) {
    console.error('Failed to optimize', filePath, err);
  }
}

async function optimizeAll() {
  const files = fs.readdirSync(photocardsDir);
  for (const file of files) {
    const filePath = path.join(photocardsDir, file);
    if (fs.statSync(filePath).isFile() && !file.endsWith('.meta.json')) {
      await optimizeImage(filePath);
    }
  }
  console.log('Batch optimization complete.');
}

optimizeAll();
