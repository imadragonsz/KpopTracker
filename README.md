

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

> ⚠️ **Disclaimer:**<br>
> This project is intended to run locally or within a closed/private network. Because the Supabase API keys are included in the frontend code, they will be visible to anyone with access to the site. **Do not deploy this project to a public server unless you understand the security implications and have taken appropriate precautions.**

> 🤖 **Note:**<br>
> This project was created by imadragonsz with the help of <a href="https://github.com/features/copilot">GitHub Copilot</a>.

---

## ✨ Features


<table>
   <tr>
      <td>🎵 <b>Album Collection Management</b></td>
      <td>Add, edit, and delete albums and versions, including group, release date, and special versions.</td>
   </tr>
   <tr>
      <td>�️ <b>Photocard Gallery</b></td>
      <td>Upload, view, and manage your photocard images in a modern, responsive gallery UI.</td>
   </tr>
   <tr>
      <td>🔍 <b>Group & Member Filtering</b></td>
      <td>Filter your photocard gallery by group and member for quick browsing.</td>
   </tr>
   <tr>
      <td>⬆️ <b>Bulk Photocard Upload</b></td>
      <td>Upload multiple photocards at once with group and member tagging.</td>
   </tr>
   <tr>
      <td>�👥 <b>Group Management</b></td>
      <td>Organize albums and photocards by K-Pop group and view group-specific stats.</td>
   </tr>
   <tr>
      <td>📊 <b>Profile & Stats</b></td>
      <td>View your collection stats, most collected group, recent activity, and manage your account details.</td>
   </tr>
   <tr>
      <td>📅 <b>Modern Date Picker</b></td>
      <td>All date fields use a modern, dark-themed Flatpickr calendar (1980–2030) for consistent, user-friendly date selection.</td>
   </tr>
   <tr>
      <td>📱 <b>Responsive Design</b></td>
      <td>Mobile-friendly and accessible UI using Bootstrap 5.</td>
   </tr>
   <tr>
      <td>💾 <b>Export/Import</b></td>
      <td>Export your collection as CSV or JSON, and import data to migrate or backup your collection.</td>
   </tr>
   <tr>
      <td>🔐 <b>Authentication</b></td>
      <td>Secure login and account management with Supabase.</td>
   </tr>
   <tr>
      <td>🕒 <b>Recent Activity</b></td>
      <td>See your most recently added and updated albums and photocards at a glance.</td>
   </tr>
</table>

---

## 🚀 Getting Started

<details>
<summary><b>Expand for setup instructions</b></summary>

1. **Clone the repository:**

   ```sh
   git clone https://github.com/imadragonsz/KpopTracker.git
   cd KpopTracker
   ```

2. **Open the project in VS Code or your preferred editor.**

3. **Configure Supabase:**
   - Set up a Supabase project and update the API keys in `js/api/supabaseClient.js`.
   - Example `js/api/supabaseClient.js`:

     ```js
     // js/api/supabaseClient.js
     import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

     // Replace with your own Supabase project URL and anon/public key
     const SUPABASE_URL = "https://your-project-id.supabase.co";
     const SUPABASE_ANON_KEY = "your-anon-key";

     export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
     ```

4. **Set up your Supabase database:**
   - You will need at least three tables: `albums`, `groups`, and `members`. Here is an example SQL command to create the basic structure:

     ```sql
     -- Albums table
     create table if not exists public.albums (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        group text not null,
        versions jsonb,
        created_at timestamptz default now(),
        updated_at timestamptz default now(),
        user_id uuid references auth.users(id)
     );

     -- Groups table
     create table if not exists public.groups (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        created_at timestamptz default now(),
        user_id uuid references auth.users(id)
     );

     -- Members table
     create table if not exists public.members (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        group_id uuid references public.groups(id),
        birthday date,
        position text,
        created_at timestamptz default now(),
        user_id uuid references auth.users(id)
     );
     ```

   - Adjust or extend these tables as needed (e.g., add more fields, indexes, or relationships).

5. **Set up Supabase authentication (account-related setup):**
   - In the [Supabase dashboard](https://app.supabase.com/), go to the **Authentication** section.
   - Under **Providers**, enable **Email** (and optionally other providers like Google, GitHub, etc.).
   - Under **Policies**, make sure your tables (albums, groups, members) have Row Level Security (RLS) enabled and add policies to allow users to read/write their own data. Example policies:

     ```sql
     -- Allow users to access only their own albums
     create policy "Users can access their own albums" on public.albums
        for all
        using (user_id = auth.uid());

     -- Allow users to access only their own groups
     create policy "Users can access their own groups" on public.groups
        for all
        using (user_id = auth.uid());

     -- Allow users to access only their own members
     create policy "Users can access their own members" on public.members
        for all
        using (user_id = auth.uid());
     ```

   - Repeat similar policies for `groups` and `members` tables.
   - For more details, see the [Supabase Auth docs](https://supabase.com/docs/guides/auth).

6. **Date Picker:**
   - All date pickers are automatically initialized with Flatpickr (no extra setup needed). If you add new date fields, use the `date-picker` class for instant calendar support.

</details>

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!<br>
Please open an issue or submit a pull request on GitHub.

---

## 📝 License

This project is licensed under the MIT License.
