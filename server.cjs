const express = require("express");
const path = require("path");
const app = express();

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

// Dynamic main page (unprotected)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
});

// Dynamic route for allowed HTML pages in /pages
const allowedPages = ["index", "albumCollection", "groupManagement", "profile"];
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
