// uiHelpers.js
// Shared UI helper functions for card and row creation

export function createFlexRow() {
  const row = document.createElement("div");
  row.className = "d-flex align-items-stretch flex-nowrap browse-flex-row mb-3";
  row.style.flexWrap = "nowrap";
  row.style.width = "100%";
  row.style.maxWidth = "100%";
  row.style.overflowX = "auto";
  row.style.overflowY = "visible";
  row.style.boxSizing = "border-box";
  row.tabIndex = 0;
  // Centering will be handled dynamically in renderGroupCardsRow
  return row;
}

export function createCardCol({
  width,
  isSelected = false,
  cardHtml,
  onClick,
}) {
  const col = document.createElement("div");
  col.style.width = width + "px";
  col.style.flex = `0 0 ${width}px`;
  col.style.maxWidth = width + "px";
  col.style.minWidth = width + "px";
  col.style.display = "flex";
  col.style.flexDirection = "column";
  col.style.justifyContent = "stretch";
  col.style.alignItems = "stretch";
  col.innerHTML = cardHtml;
  if (onClick) {
    col.addEventListener("click", onClick);
  }
  if (isSelected) {
    col.classList.add("border-primary", "border-2");
  }
  return col;
}
