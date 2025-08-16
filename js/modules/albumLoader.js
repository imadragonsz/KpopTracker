// Album loader and page initialization logic
import { fetchAlbums } from "../api/albumApi.js";
import { albums } from "./albumData.js";
import { renderAlbums } from "./albumUI.js";

export async function loadAndRenderAlbums() {
  try {
    const fetched = await fetchAlbums();
    albums.length = 0;
    if (Array.isArray(fetched)) {
      // Parse each version string as JSON if possible
      albums.push(...fetched);
    }
    renderAlbums();
  } catch (err) {
    console.error("[AlbumLoader] Failed to load albums:", err);
  }
}
