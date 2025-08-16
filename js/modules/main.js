// Main entry point for album collection page

import { setupAlbumEventHandlers } from "./albumEvents.js";

import { loadAndRenderAlbums } from "./albumLoader.js";

import { loadAndPopulateGroups } from "./groupLoader.js";
import { populateYearSelect } from "./yearUtils.js";

function runWhenBootstrapAndDOMReady(fn) {
  function checkReady() {
    if (
      (document.readyState === "complete" ||
        document.readyState === "interactive") &&
      window.bootstrap &&
      window.bootstrap.Modal
    ) {
      setTimeout(fn, 0);
    } else {
      setTimeout(checkReady, 50);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkReady);
  } else {
    checkReady();
  }
}

function albumPageInit() {
  setupAlbumEventHandlers();
  populateYearSelect();
  loadAndPopulateGroups();
  loadAndRenderAlbums();
}

runWhenBootstrapAndDOMReady(albumPageInit);
