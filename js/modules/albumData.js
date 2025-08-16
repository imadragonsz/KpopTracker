// Album/group/year data loading, filtering, sorting, pagination
import { getCachedData, setCachedData, isDataDifferent } from "./cacheUtils.js";

export let albums = [];
export let groups = [];
export let filterText = "";
export let sortBy = "group";
export let editingId = null;
export let currentAlbumPage = 1;
export const ALBUMS_PER_PAGE = 10;
export const VERSIONS_PER_PAGE = 4;

export function filterAlbums(albums, filterText, filterGroup, filterYear) {
  const text = filterText.toLowerCase();
  const groupVal = filterGroup && filterGroup.value ? filterGroup.value : "";
  const yearVal = filterYear && filterYear.value ? filterYear.value : "";
  return albums.filter((item) => {
    const matchesText =
      item.group.toLowerCase().includes(text) ||
      item.album.toLowerCase().includes(text) ||
      item.year.toString().includes(text);
    const matchesGroup = !groupVal || item.group === groupVal;
    const matchesYear = !yearVal || item.year.toString() === yearVal;
    return matchesText && matchesGroup && matchesYear;
  });
}

export function sortAlbums(albums, sortBy) {
  return albums.slice().sort((a, b) => {
    if (sortBy === "year") {
      return parseInt(a.year) - parseInt(b.year);
    }
    return a[sortBy].localeCompare(b[sortBy]);
  });
}

export function getTotalAlbumCount(albums) {
  return albums.reduce((total, album) => {
    if (Array.isArray(album.versions) && album.versions.length > 0) {
      return total + album.versions.length;
    }
    return total + 1;
  }, 0);
}

// Add more data-related functions as needed
