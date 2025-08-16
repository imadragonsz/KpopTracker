// Group loader and select population
import { fetchGroups } from "../api/groupApi.js";
import { groups } from "./albumData.js";

export async function loadAndPopulateGroups() {
  try {
    const fetched = await fetchGroups();
    groups.length = 0;
    if (Array.isArray(fetched)) {
      groups.push(...fetched);
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
  } catch (err) {
    console.error("[GroupLoader] Failed to load groups:", err);
  }
}
