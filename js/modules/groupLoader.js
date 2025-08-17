// Group loader and select population
import { fetchGroups } from "../api/groupApi.js";
import { groups } from "./albumData.js";
import { showLoading, hideLoading } from "../components/loading.js";
import { getCachedData, setCachedData } from "./cacheUtils.js";

export async function loadAndPopulateGroups() {
  try {
    showLoading();
    // Use per-user cache key for groups
    let user = null;
    try {
      const mod = await import("../auth.js");
      user = await mod.getCurrentUser();
    } catch (e) {}
    const cacheKey = user ? `groups_cache_${user.id}` : null;
    let cached = null;
    if (cacheKey) {
      cached = getCachedData(cacheKey, 300000);
    }
    if (Array.isArray(cached) && cached.length > 0) {
      groups.length = 0;
      groups.push(...cached);
    }
    // Always fetch latest from backend in background
    const fetched = await fetchGroups();
    if (Array.isArray(fetched) && fetched.length > 0) {
      groups.length = 0;
      groups.push(...fetched);
      if (cacheKey) setCachedData(cacheKey, fetched);
    }
    // Populate groupSelect dropdown
    const groupSelect = document.getElementById("groupSelect");
    if (groupSelect) {
      groupSelect.innerHTML = "";
      groups.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g.name;
        opt.textContent = g.name;
        groupSelect.appendChild(opt);
      });
    }
    // Populate filterGroup dropdown
    const filterGroup = document.getElementById("filterGroup");
    if (filterGroup) {
      filterGroup.innerHTML = '<option value="">All Groups</option>';
      groups.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g.name;
        opt.textContent = g.name;
        filterGroup.appendChild(opt);
      });
    }
    hideLoading();
  } catch (err) {
    hideLoading();
    console.error("[GroupLoader] Failed to load groups:", err);
  }
}
