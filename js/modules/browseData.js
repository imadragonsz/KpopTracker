// browseData.js
// Data fetching and filtering for browse page
import {
  fetchAllGroups,
  fetchAllAlbums,
  addAlbumToUser,
  addGroupToUser,
} from "../api/browseApi.js";
import { fetchAlbums } from "../api/albumApi.js";

export async function loadAllData() {
  const allGroups = await fetchAllGroups();
  const allAlbums = await fetchAllAlbums();
  const userAlbums = await fetchAlbums();
  // Use fetchGroups from groupApi.js to get only the user's groups
  const { fetchGroups } = await import("../api/groupApi.js");
  const userGroups = await fetchGroups();
  return { allGroups, allAlbums, userAlbums, userGroups };
}

export function filterAlbums(allAlbums, group, search) {
  return allAlbums.filter((a) => {
    const matchesGroup = !group || a.group === group;
    const matchesSearch =
      a.album.toLowerCase().includes(search) ||
      a.group.toLowerCase().includes(search);
    return matchesGroup && matchesSearch;
  });
}
