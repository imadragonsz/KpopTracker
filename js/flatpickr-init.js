// Flatpickr initialization for all date inputs

function initFlatpickrOnAll() {
  document
    .querySelectorAll('input[type="date"], input.date-picker')
    .forEach((input) => {
      // Prevent double-initialization
      if (input._flatpickr) return;
      flatpickr(input, {
        dateFormat: "Y-m-d",
        allowInput: true,
        theme: "dark",
        disableMobile: true,
        minDate: "1980-01-01",
        maxDate: "2030-12-31",
        defaultDate: input.value || undefined,
        onOpen: function (selectedDates, dateStr, instance) {
          if (input.value) {
            instance.setDate(input.value, false);
          }
        },
      });
    });
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", initFlatpickrOnAll);

// Expose for dynamic use (e.g., after modals open)
window.initFlatpickrOnAll = initFlatpickrOnAll;

// Optionally, auto-initialize after any Bootstrap modal is shown
document.addEventListener("shown.bs.modal", () => {
  setTimeout(initFlatpickrOnAll, 10);
});
