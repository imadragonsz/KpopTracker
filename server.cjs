const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(__dirname));
app.use("/pages", express.static(path.join(__dirname, "pages")));
app.use(express.urlencoded({ extended: true }));
// Dynamic main page (unprotected)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Export app for use with node .
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
