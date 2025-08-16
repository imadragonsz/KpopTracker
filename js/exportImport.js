// Attach event listeners for export/import buttons
export function setupExportImport() {
  const exportJsonBtn = document.getElementById("export-json-btn");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const importInput = document.getElementById("import-file-input");
  if (exportJsonBtn) exportJsonBtn.onclick = exportAlbumsAsJSON;
  if (exportCsvBtn) exportCsvBtn.onclick = exportAlbumsAsCSV;
  if (importInput) {
    importInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) importAlbumsFromFile(file);
      e.target.value = ""; // reset input
    };
  }
}
// exportImport.js - Handles export and import of albums as CSV and JSON
import { fetchAlbums, addAlbum } from "./api/albumApi.js";
import { getCurrentUser } from "./auth.js";

// Utility: Convert albums array to CSV string
function albumsToCSV(albums) {
  if (!Array.isArray(albums) || albums.length === 0) return "";
  // Exclude user_id from export
  const keys = Object.keys(albums[0]).filter((k) => k !== "user_id");
  const header = keys.join(",");
  const rows = albums.map((a) =>
    keys.map((k) => JSON.stringify(a[k] ?? "")).join(",")
  );
  return [header, ...rows].join("\n");
}

// Utility: Parse CSV string to array of objects
function csvToAlbums(csv) {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const keys = header.split(",");
  return lines.map((line) => {
    const values = line
      .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((v) => v.replace(/^"|"$/g, ""));
    const obj = {};
    keys.forEach((k, i) => {
      obj[k] = values[i] ?? null;
    });
    return obj;
  });
}

// Export as JSON
async function exportAlbumsAsJSON() {
  const albums = await fetchAlbums();
  // Exclude user_id from export
  const albumsNoUserId = albums.map(({ user_id, ...rest }) => rest);
  const blob = new Blob([JSON.stringify(albumsNoUserId, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "albums.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export as CSV
async function exportAlbumsAsCSV() {
  const albums = await fetchAlbums();
  // Exclude user_id from export
  const albumsNoUserId = albums.map(({ user_id, ...rest }) => rest);
  const csv = albumsToCSV(albumsNoUserId);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "albums.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import albums from file (JSON or CSV)
async function importAlbumsFromFile(file) {
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();
  const text = await file.text();
  let albums = [];
  const resultDiv = document.getElementById("import-result");
  if (resultDiv) resultDiv.innerHTML = "";
  if (ext === "json") {
    try {
      albums = JSON.parse(text);
    } catch {
      if (resultDiv)
        resultDiv.innerHTML =
          '<div class="text-danger">Invalid JSON file.</div>';
      else alert("Invalid JSON file.");
      return;
    }
  } else if (ext === "csv") {
    try {
      albums = csvToAlbums(text);
    } catch {
      if (resultDiv)
        resultDiv.innerHTML =
          '<div class="text-danger">Invalid CSV file.</div>';
      else alert("Invalid CSV file.");
      return;
    }
  } else {
    if (resultDiv)
      resultDiv.innerHTML =
        '<div class="text-danger">Unsupported file type.</div>';
    else alert("Unsupported file type.");
    return;
  }
  const user = await getCurrentUser();
  if (!user || !user.id) {
    if (resultDiv)
      resultDiv.innerHTML =
        '<div class="text-danger">Could not determine current user. Please log in.</div>';
    else alert("Could not determine current user. Please log in.");
    return;
  }
  const existingAlbums = await fetchAlbums();
  const existingNames = new Set(
    existingAlbums.map((a) =>
      (a.name || a.album || a.title || "").toLowerCase()
    )
  );
  let imported = [],
    skipped = [];
  for (const album of albums) {
    const { id, user_id, created_at, updated_at, ...albumData } = album;
    const albumNameRaw =
      albumData.name || albumData.album || albumData.title || "";
    const albumName = albumNameRaw.toLowerCase();
    if (!albumName || existingNames.has(albumName)) {
      skipped.push(albumNameRaw || "(no name)");
      continue;
    }
    await addAlbum({ ...albumData, user_id: user.id });
    imported.push(albumNameRaw || "(no name)");
  }
  if (resultDiv) {
    resultDiv.innerHTML =
      `<div class="text-success mb-2">Imported: ${imported.length}</div>` +
      (imported.length > 0
        ? `<ul class="small text-success">${imported
            .map((n) => `<li>${n}</li>`)
            .join("")}</ul>`
        : "") +
      `<div class="text-warning mb-2">Skipped (already exists or no name): ${skipped.length}</div>` +
      (skipped.length > 0
        ? `<ul class="small text-warning">${skipped
            .map((n) => `<li>${n}</li>`)
            .join("")}</ul>`
        : "");
  }
}
