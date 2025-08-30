// Load environment variables first
require("dotenv").config();

// --- Required modules (must be at the top) ---
const express = require("express");
const sharp = require("sharp");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const http = require("http");
const util = require("util");
const { createClient } = require("@supabase/supabase-js");

// Set up logging to files
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFile = fs.createWriteStream(path.join(logsDir, "server.log"), {
  flags: "a",
});
const errorFile = fs.createWriteStream(path.join(logsDir, "error.log"), {
  flags: "a",
});

// Custom logger that writes to both console and file
const logger = new console.Console({ stdout: logFile, stderr: errorFile });

// Redirect console.log and console.error
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  originalLog.apply(console, args);
  logger.log(new Date().toISOString(), ...args);
};

console.error = (...args) => {
  originalError.apply(console, args);
  logger.error(new Date().toISOString(), ...args);
};

// --- Photocard Gallery Backend ---
const app = express();

// Ensure assets directory exists
const assetsDir = path.join(__dirname, "assets");
if (!fs.existsSync(assetsDir)) {
  console.log("Creating assets directory...");
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Setup photocards directory
const photocardsDir = path.join(assetsDir, "photocards");
if (!fs.existsSync(photocardsDir)) {
  console.log("Creating photocards directory...");
  fs.mkdirSync(photocardsDir, { recursive: true });
}
const photocardUpload = multer({ dest: photocardsDir });

// Serve static photocards
if (fs.existsSync(photocardsDir)) {
  app.use("/photocards", express.static(photocardsDir));
}

// List all photocards (returns [{filename, originalname, size, uploaded, groupId, memberId}])
app.get("/api/photocards", (req, res) => {
  if (!fs.existsSync(photocardsDir)) return res.json([]);
  const files = fs
    .readdirSync(photocardsDir)
    .filter((f) => !f.endsWith(".meta.json"));
  // Only use the largest size (1200.webp) as the canonical photocard entry
  const mainFiles = files.filter((f) => /-1200\.webp$/.test(f));
  const photocards = mainFiles.map((fname) => {
    // Remove -1200.webp to get the base for meta lookup
    const base = fname.replace(/-1200\.webp$/, "");
    const metaPath = path.join(photocardsDir, base + ".meta.json");
    let meta = {};
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      } catch {}
    }
    return {
      filename: fname,
      url: `/photocards/${base}`,
      originalname: meta.originalname || fname,
      size: meta.size || null,
      uploaded: meta.uploaded || null,
      groupId: meta.groupId || null,
      memberId: meta.memberId || null,
    };
  });
  res.json(photocards);
});

// --- Supabase Admin Middleware ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function requireAdmin(req, res, next) {
  // You must extract the user id from your auth/session system
  // For example, if you use a JWT in Authorization header:
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Not authenticated" });
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user)
    return res.status(401).json({ error: "Not authenticated" });
  const { data, error: roleError } = await supabase
    .from("user_roles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();
  if (roleError || !data?.is_admin)
    return res.status(403).json({ error: "Admins only" });
  req.user = user;
  next();
}

// Upload one or more photocards
app.post(
  "/api/photocards/upload",
  requireAdmin,
  photocardUpload.array("photocard"),
  async (req, res) => {
    if (!req.files || !req.files.length)
      return res.status(400).json({ error: "No file(s) uploaded." });
    const groupId = req.body.groupId || null;
    const memberId = req.body.memberId || null;
    const SIZES = [400, 800, 1200];
    const results = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = file.path.replace(ext, "");
      try {
        for (const size of SIZES) {
          const outPath = `${base}-${size}.webp`;
          await sharp(file.path)
            .resize({
              width: size,
              height: 1200,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 80 })
            .toFile(outPath);
        }
        // Replace original with largest size (for legacy use)
        const largestPath = `${base}-1200.webp`;
        fs.unlinkSync(file.path);
        fs.copyFileSync(largestPath, file.path);
        file.mimetype = "image/webp";
        file.size = fs.statSync(file.path).size;
      } catch (err) {
        console.error("Image optimization failed:", err);
      }
      const meta = {
        originalname: file.originalname,
        size: file.size,
        uploaded: Date.now(),
        groupId,
        memberId,
      };
      fs.writeFileSync(file.path + ".meta.json", JSON.stringify(meta));
      results.push({
        filename: file.filename,
        url: `/photocards/${file.filename}`,
      });
    }
    res.json({ uploaded: results });
  }
);

// Delete a photocard
app.post("/api/photocards/delete", express.json(), requireAdmin, (req, res) => {
  const { filename } = req.body;
  if (!filename)
    return res.status(400).json({ error: "No filename provided." });
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
if (!fs.existsSync(uploadsDir)) {
  console.log("Creating uploads directory...");
  fs.mkdirSync(uploadsDir, { recursive: true });
}
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
app.use("/js", (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  express.static(path.join(__dirname, "js"))(req, res, next);
});
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

// Serve Supabase configuration
app.get("/api/config", (req, res) => {
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  });
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

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Simple server start with better logging
const PORT = process.env.PORT || 3000;

console.log("Starting server initialization...");

// Create HTTP server instance
const server = http.createServer(app);

// For PM2: Export both app and server
module.exports = { app, server };

// Handle graceful shutdown
function cleanup() {
  console.log("Shutting down server...");
  server.close(() => {
    console.log("Server closed.");
    // Don't exit process when running under PM2
    if (!process.env.PM2_USAGE) {
      process.exit(0);
    }
  });
}

// Setup signal handlers
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  cleanup();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  cleanup();
});

// Start server if running directly (not through PM2)
if (require.main === module) {
  try {
    console.log("Starting server...");

    server.listen(PORT, "0.0.0.0", () => {
      console.log("----------------------------------------");
      console.log(`Server running on port ${PORT}`);
      console.log(`Local access via: http://localhost:${PORT}`);
      console.log(`Network access via: http://0.0.0.0:${PORT}`);
      console.log("Make sure nginx is configured to proxy to this port");
      console.log("----------------------------------------");
    });

    server.on("error", (error) => {
      console.error("Server error:", error.message);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use!`);
      }
      cleanup();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    cleanup();
  }
} else {
  // When running through PM2, start server immediately
  console.log("Starting server in PM2 mode...");
  try {
    server.listen(PORT, "0.0.0.0", () => {
      console.log("----------------------------------------");
      console.log(`Server running on port ${PORT}`);
      console.log(`Local access via: http://localhost:${PORT}`);
      console.log(`Network access via: http://0.0.0.0:${PORT}`);
      console.log("----------------------------------------");
    });

    server.on("error", (error) => {
      console.error("Server error:", error.message);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use!`);
      }
      cleanup();
    });
  } catch (error) {
    console.error("Error starting server in PM2 mode:", error);
    cleanup();
  }
}
