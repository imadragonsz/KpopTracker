<div align="center">
  <img src="https://img.shields.io/github/repo-size/imadragonsz/KpopTracker?color=43c6ac" alt="Repo Size" />
  <img src="https://img.shields.io/github/last-commit/imadragonsz/KpopTracker?color=43c6ac" alt="Last Commit" />
</div>

# K-Pop Album Tracker

<p align="center">
  <b>✨ The ultimate web app for K-Pop fans to manage, track, and visualize their album collections! ✨</b><br>
  <i>Modern, responsive, and powered by Supabase.</i>
</p>

---

## 🚀 Features

- **Album Collection Management:** Add, edit, and delete albums and versions, including group, release date, and special versions.
- **Photocard Gallery:** Upload, view, and manage photocard images in a responsive gallery UI. Bulk upload and group/member tagging supported.
- **Group & Member Filtering:** Filter your photocard gallery by group and member.
- **Group Management:** Organize albums and photocards by K-Pop group and view group-specific stats.
- **Profile & Stats:** View collection stats, most collected group, and recent activity.
- **Native Date Picker:** All date fields use a styled, dark-themed native date input for best compatibility.
- **Responsive Design:** Mobile-friendly UI using Bootstrap 5.
- **Export/Import:** Export your collection as CSV or JSON, and import data to migrate or backup your collection.
- **Authentication:** Secure login and account management with Supabase.
- **Admin Controls:** Only admins can manage groups and albums (edit/delete).
- **Pagination & Sorting:** Browse albums and photocards with pagination and sorting.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Choices.js
- **Backend:** Node.js, Express, Multer, Sharp
- **Database & Auth:** Supabase (PostgreSQL, Auth)
- **Image Processing:** Sharp (for photocard resizing)

---

## 🏁 Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/imadragonsz/KpopTracker.git
   cd KpopTracker
   ```
2. **Configure Supabase:**
   - Set up a Supabase project and update the API keys in `js/api/supabaseClient.js`.
3. **Set up your Supabase database:**

   - **Required tables:**
     - `albums`
     - `groups`
     - `members`
     - `user_album_versions`
     - `user_roles`
   - In the `user_roles` table, make sure at least one user has `is_admin` set to `TRUE` (see example below).
   - Enable Row Level Security (RLS) and add policies to restrict access to user-owned data.

   **Example `user_roles` row:**

   ```
   | user_id                               | is_admin |
   |---------------------------------------|----------|
   | 123e4567-e89b-12d3-a456-426614174000  | TRUE     |
   ```

4. **Install dependencies (for backend features):**
   ```sh
   npm install
   ```
5. **Start the backend server (optional, for photocard/image API):**
   ```sh
   node server.cjs
   ```
6. **Open `index.html` in your browser to start using the app locally.**

---

## 📸 Screenshots

<details>
<summary>Click to expand</summary>

_No screenshots yet 😊_

</details>

---

## 📄 License

MIT
