// Utility to populate the year select dropdown
export function populateYearSelect() {
  const yearSelect = document.getElementById("year");
  if (!yearSelect) return;
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = "";
  for (let y = currentYear; y >= 2000; y--) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    yearSelect.appendChild(option);
  }
}
