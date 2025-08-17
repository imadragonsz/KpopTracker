// Album loader and page initialization logic
import { fetchAlbums } from "../api/albumApi.js";
import { albums } from "./albumData.js";
import { renderAlbums } from "./albumUI.js";
import { showLoading, hideLoading } from "../components/loading.js";
import { getCachedData, setCachedData } from "./cacheUtils.js";

export async function loadAndRenderAlbums() {
  try {
    showLoading();
    // console.time("Album load+render");
    // Get current user for per-user cache key
    let user = null;
    try {
      const mod = await import("../auth.js");
      user = await mod.getCurrentUser();
    } catch (e) {}
    const cacheKey = user ? `albums_cache_${user.id}` : null;

    // Try to load from localStorage cache first

    // Use cache with 5 min expiration (300000 ms)
    let cached = null;
    if (cacheKey) {
      cached = getCachedData(cacheKey, 300000);
    }
    if (Array.isArray(cached) && cached.length > 0) {
      albums.length = 0;
      albums.push(...cached);
      if (
        typeof window !== "undefined" &&
        typeof window.updateAlbumFilters === "function"
      ) {
        window.updateAlbumFilters();
      } else {
        await renderAlbums();
      }
    }

    // Always fetch latest from backend in background
    // console.time("Album fetch");
    const fetched = await fetchAlbums();
    // console.timeEnd("Album fetch");
    if (Array.isArray(fetched)) {
      albums.length = 0;
      albums.push(...fetched);
      // Update cache
      if (cacheKey) {
        setCachedData(cacheKey, fetched);
      }
      if (
        typeof window !== "undefined" &&
        typeof window.updateAlbumFilters === "function"
      ) {
        window.updateAlbumFilters();
      } else {
        await renderAlbums();
      }
    }
    // console.timeEnd("Album load+render");
    hideLoading();
  } catch (err) {
    hideLoading();
    console.error("[AlbumLoader] Failed to load albums:", err);
  }
}
