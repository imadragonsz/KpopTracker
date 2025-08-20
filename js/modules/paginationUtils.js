// paginationUtils.js
// Utility functions for pagination

export function getCardWidth() {
  // 220px for >=576px, 160px for <576px
  return window.innerWidth < 576 ? 160 : 220;
}

export function getCardPageSize(
  cardWidth = getCardWidth(),
  minCards = 1,
  maxCards = 6,
  gap = 16
) {
  // Dynamically get the current .container's computed width
  let containerWidth = window.innerWidth || 1200;
  const container = document.querySelector(
    ".container, .container-md, .container-sm"
  );
  if (container) {
    const style = window.getComputedStyle(container);
    containerWidth = parseFloat(style.width);
  }
  // Estimate how many cards fit, accounting for gap between cards
  let n = Math.floor((containerWidth + gap) / (cardWidth + gap));
  n = Math.max(minCards, Math.min(maxCards, n));
  // If the total width of the cards (including gaps) exceeds the container, subtract 1 card
  if (n > minCards && n * cardWidth + (n - 1) * gap > containerWidth) {
    n--;
  }
  return n;
}
