// Album/group/year data loading, filtering, sorting, pagination
import { getCachedData, setCachedData, isDataDifferent } from "./cacheUtils.js";

// Example album data with releaseDate (YYYY-MM-DD)
export let albums = [
  {
    id: 1,
    group: "BTS",
    album: "MAP OF THE SOUL: 7",
    releaseDate: "2020-02-21",
    image: "",
    versions: ["Standard", "Deluxe"],
  },
  {
    id: 2,
    group: "BLACKPINK",
    album: "THE ALBUM",
    releaseDate: "2020-10-02",
    image: "",
    versions: ["Standard"],
  },
  {
    id: 3,
    group: "TWICE",
    album: "Eyes wide open",
    releaseDate: "2020-10-26",
    image: "",
    versions: ["Standard"],
  },
  // Add more albums as needed
];
export let groups = [];
export let filterText = "";
export let sortBy = "group";
export let editingId = null;
export let currentAlbumPage = 1;
export const ALBUMS_PER_PAGE = 10;
export const VERSIONS_PER_PAGE = 4;

export function filterAlbums(
  albums,
  filterText,
  filterGroup,
  filterReleaseDate
) {
  const text = filterText.toLowerCase();
  const groupVal = filterGroup && filterGroup.value ? filterGroup.value : "";
  const dateVal =
    filterReleaseDate && filterReleaseDate.value ? filterReleaseDate.value : "";
  return albums.filter((item) => {
    const matchesText =
      item.group.toLowerCase().includes(text) ||
      item.album.toLowerCase().includes(text) ||
      (item.releaseDate && item.releaseDate.includes(text));
    const matchesGroup = !groupVal || item.group === groupVal;
    let matchesDate = true;
    if (dateVal && dateVal.length === 4) {
      // Year
      matchesDate = item.releaseDate && item.releaseDate.startsWith(dateVal);
    } else if (dateVal && dateVal.length === 7) {
      // Month
      matchesDate = item.releaseDate && item.releaseDate.startsWith(dateVal);
    } else if (dateVal && dateVal.length === 10) {
      // Full date
      matchesDate = item.releaseDate === dateVal;
    }
    return matchesText && matchesGroup && matchesDate;
  });
}

export function sortAlbums(albums, sortBy) {
  return albums.slice().sort((a, b) => {
    if (sortBy === "releaseDate") {
      return (a.releaseDate || "").localeCompare(b.releaseDate || "");
    }
    const aVal = a[sortBy] != null ? String(a[sortBy]) : "";
    const bVal = b[sortBy] != null ? String(b[sortBy]) : "";
    return aVal.localeCompare(bVal);
  });
}

import { fetchUserAlbumVersions } from "../api/userAlbumVersionsApi.js";

export async function getTotalAlbumCount(albums) {
  let total = 0;
  for (const album of albums) {
    // eslint-disable-next-line no-await-in-loop
    const userVersions = await fetchUserAlbumVersions(album.id);
    if (Array.isArray(userVersions) && userVersions.length > 0) {
      total += userVersions.length;
    } else {
      total += 1;
    }
  }
  return total;
}

// Add more data-related functions as needed
