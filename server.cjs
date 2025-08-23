// --- Required modules (must be at the top) ---
const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

// --- Photocard Gallery Backend ---
const app = express();
const photocardsDir = path.join(__dirname, "assets", "photocards");
const photocardUpload = multer({ dest: photocardsDir });

// Serve static photocards
if (fs.existsSync(photocardsDir)) {
  app.use("/photocards", express.static(photocardsDir));
}

// List all photocards (returns [{filename, originalname, size, uploaded, groupId, memberId}])
app.get("/api/photocards", (req, res) => {
  if (!fs.existsSync(photocardsDir)) return res.json([]);
  const files = fs.readdirSync(photocardsDir).filter(f => !f.endsWith(".meta.json"));
  const photocards = files.map(fname => {
    const metaPath = path.join(photocardsDir, fname + ".meta.json");
    let meta = {};
    if (fs.existsSync(metaPath)) {
      try { meta = JSON.parse(fs.readFileSync(metaPath, "utf8")); } catch {}
    }
    return {
      filename: fname,
      url: `/photocards/${fname}`,
      originalname: meta.originalname || fname,
      size: meta.size || null,
      uploaded: meta.uploaded || null,
      groupId: meta.groupId || null,
      memberId: meta.memberId || null
    };
  });
  res.json(photocards);
});

// Upload one or more photocards
app.post("/api/photocards/upload", photocardUpload.array("photocard"), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: "No file(s) uploaded." });
  const groupId = req.body.groupId || null;
  const memberId = req.body.memberId || null;
  const results = [];
  for (const file of req.files) {
    const meta = {
      originalname: file.originalname,
      size: file.size,
      uploaded: Date.now(),
      groupId,
      memberId
    };
    fs.writeFileSync(file.path + ".meta.json", JSON.stringify(meta));
    results.push({ filename: file.filename, url: `/photocards/${file.filename}` });
  }
  res.json({ uploaded: results });
});

// Delete a photocard
app.post("/api/photocards/delete", express.json(), (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "No filename provided." });
  const filePath = path.join(photocardsDir, filename);
  const metaPath = filePath + ".meta.json";
  let deleted = false;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    deleted = true;
  }
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  res.json({ success: deleted });
});

// Multer setup for image uploads (cross-platform)
const uploadsDir = path.join(__dirname, "assets", "uploads");
const upload = multer({ dest: uploadsDir });

// List uploaded images endpoint (must be after app, fs, uploadsDir are defined)
app.get("/api/list-uploads", (req, res) => {
  // Group images by group name from .meta.json
  const files = fs
    .readdirSync(uploadsDir)
    .filter((f) => !f.endsWith(".meta.json"));
  const grouped = {};
  for (const fname of files) {
    const metaPath = path.join(uploadsDir, fname + ".meta.json");
    let group = "Ungrouped";
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        if (meta.group) group = meta.group;
      } catch {}
    }
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(`/uploads/${fname}`);
  }
  res.json({ imagesByGroup: grouped });
});
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files

app.use("/styles", express.static(path.join(__dirname, "styles")));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/pages", express.static(path.join(__dirname, "pages")));
app.use(
  "/components",
  express.static(path.join(__dirname, "pages", "components"))
);
app.use(express.urlencoded({ extended: true }));

// Try to serve uploaded images statically, but don't break if folder is missing
if (fs.existsSync(uploadsDir)) {
  app.use("/uploads", express.static(uploadsDir));
  // Image upload endpoint with duplicate check
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded.");
    // Check for duplicate: same original name and size
    const uploadedSize = req.file.size;
    const uploadedOrigName = req.file.originalname;
    const group = req.body.group || req.body.albumGroup || "Ungrouped";
    const files = fs.readdirSync(uploadsDir);
    for (const fname of files) {
      const fpath = path.join(uploadsDir, fname);
      try {
        const stat = fs.statSync(fpath);
        // Multer does not save original name, so store a .meta file for each upload
        const metaPath = fpath + ".meta.json";
        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
          if (
            meta.originalname === uploadedOrigName &&
            stat.size === uploadedSize
          ) {
            // If group is missing in meta and provided in upload, update meta file
            if (
              (!meta.group || meta.group === "Ungrouped") &&
              group &&
              group !== "Ungrouped"
            ) {
              meta.group = group;
              fs.writeFileSync(metaPath, JSON.stringify(meta));
            }
            // Remove the just-uploaded duplicate file
            fs.unlinkSync(req.file.path);
            // Return existing file URL
            return res.json({ url: `/uploads/${fname}` });
          }
        }
      } catch {}
    }
    // Save meta file for this upload, including group info
    const meta = { originalname: uploadedOrigName, size: uploadedSize, group };
    fs.writeFileSync(req.file.path + ".meta.json", JSON.stringify(meta));
    res.json({ url: `/uploads/${req.file.filename}` });
  });
} else {
  console.warn(
    `[WARN] Uploads directory not found at ${uploadsDir}. Uploads and /uploads route are disabled.`
  );
  // Optionally, respond with 503 for upload attempts
  app.post("/api/upload", (req, res) => {
    res.status(503).json({ error: "Uploads are currently unavailable." });
  });
}

// Delete uploaded images endpoint
app.post("/api/delete-uploads", express.json(), (req, res) => {
  const { images, group } = req.body;
  console.log("[DELETE-UPLOADS] Request received:", { images, group });
  if (!Array.isArray(images) || !images.length) {
    console.warn("[DELETE-UPLOADS] No images provided.");
    return res.status(400).json({ error: "No images provided." });
  }
  let deleted = 0;
  let errors = [];
  for (const url of images) {
    // url is like /uploads/filename
    const fname = url.split("/uploads/")[1];
    if (!fname) {
      console.warn(`[DELETE-UPLOADS] Invalid image url: ${url}`);
      errors.push(url);
      continue;
    }
    const filePath = path.join(uploadsDir, fname);
    const metaPath = filePath + ".meta.json";
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[DELETE-UPLOADS] Deleted file: ${filePath}`);
        deleted++;
      } else {
        console.warn(`[DELETE-UPLOADS] File not found: ${filePath}`);
      }
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
        console.log(`[DELETE-UPLOADS] Deleted meta: ${metaPath}`);
      } else {
        console.warn(`[DELETE-UPLOADS] Meta not found: ${metaPath}`);
      }
    } catch (err) {
      console.error(`[DELETE-UPLOADS] Error deleting ${filePath}:`, err);
      errors.push(url);
    }
  }
  if (errors.length) {
    console.error(`[DELETE-UPLOADS] Some images could not be deleted:`, errors);
    return res
      .status(500)
      .json({ error: "Some images could not be deleted.", errors });
  }
  console.log(`[DELETE-UPLOADS] Deleted ${deleted} images successfully.`);
  res.json({ success: true, deleted });
});

// Dynamic main page (unprotected)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
});

// Dynamic route for allowed HTML pages in /pages

const allowedPages = [
  "index",
  "albumCollection",
  "groupManagement",
  "profile",
  "browse",
  "photocardGallery",
];
app.get("/:page.html", (req, res, next) => {
  const page = req.params.page;
  if (allowedPages.includes(page)) {
    res.sendFile(path.join(__dirname, "pages", `${page}.html`));
  } else {
    next();
  }
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

// Export app for use with node .
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
