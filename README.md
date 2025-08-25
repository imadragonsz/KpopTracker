<div align="center">
   <img src="https://img.shields.io/github/repo-size/imadragonsz/KpopTracker?color=43c6ac" alt="Repo Size" />
   <img src="https://img.shields.io/github/last-commit/imadragonsz/KpopTracker?color=43c6ac" alt="Last Commit" />
</div>

<h1 align="center">K-Pop Album Tracker</h1>

<p align="center">
   <b>✨ The ultimate web app for K-Pop fans to manage, track, and visualize their album collections! ✨</b><br>
   <i>Modern, responsive, and powered by Supabase.</i>
</p>

---

## Features

- **Album Collection Management:** Add, edit, and delete albums and versions, including group, release date, and special versions.
- **Photocard Gallery:** Upload, view, and manage photocard images in a responsive gallery UI.
- **Group & Member Filtering:** Filter your photocard gallery by group and member.
- **Bulk Photocard Upload:** Upload multiple photocards at once with group and member tagging.
- **Group Management:** Organize albums and photocards by K-Pop group and view group-specific stats.
- **Profile & Stats:** View collection stats, most collected group, and recent activity.
- **Modern Date Picker:** All date fields use a dark-themed Flatpickr calendar.
- **Responsive Design:** Mobile-friendly UI using Bootstrap 5.
- **Export/Import:** Export your collection as CSV or JSON, and import data to migrate or backup your collection.
- **Authentication:** Secure login and account management with Supabase.
- **Recent Activity:** See your most recently added and updated albums and photocards.
- **Admin Controls:** Only admins can manage groups and albums (edit/delete).
- **Pagination & Sorting:** Browse albums with pagination and sorting by group, album, or release date.

---

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/imadragonsz/KpopTracker.git
   cd KpopTracker
   ```
2. **Configure Supabase:**
   - Set up a Supabase project and update the API keys in `js/api/supabaseClient.js`.
3. **Set up your Supabase database:**
   - Create the `albums`, `groups`, and `members` tables as described in the code comments.
   - Enable Row Level Security (RLS) and add policies to restrict access to user-owned data.
4. **Open `index.html` in your browser to start using the app locally.**

---

## Disclaimer

This project is intended for local or private use. Supabase API keys are included in the frontend code. **Do not deploy publicly without understanding the security implications.**

---

## License

MIT
