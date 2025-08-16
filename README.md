> ⚠️ **Disclaimer:**
>
> This project is intended to run locally or within a closed/private network. Because the Supabase API keys are included in the frontend code, they will be visible to anyone with access to the site. **Do not deploy this project to a public server unless you understand the security implications and have taken appropriate precautions.**

> 🤖 **Note:**
>
> This project was created by imadragonsz with the help of [GitHub Copilot](https://github.com/features/copilot).

# K-Pop Album Tracker

![GitHub repo size](https://img.shields.io/github/repo-size/imadragonsz/KpopTracker?color=43c6ac)
![GitHub last commit](https://img.shields.io/github/last-commit/imadragonsz/KpopTracker?color=43c6ac)

K-Pop Album Tracker is a web application for K-Pop fans to manage, track, and visualize their physical album collections. It features a modern, responsive UI and uses Supabase for authentication and data storage.

---

# K-Pop Album Tracker

K-Pop Album Tracker is a web application for K-Pop fans to manage, track, and visualize their physical album collections. It features a modern, responsive UI and uses Supabase for authentication and data storage.

---

## ✨ Features

- 🎵 **Album Collection Management:** Add, edit, and delete albums and versions, including group, release date, and special versions.
- 👥 **Group Management:** Organize albums by K-Pop group and view group-specific stats.
- 📊 **Profile & Stats:** View your collection stats, most collected group, recent activity, and manage your account details.
- 📱 **Responsive Design:** Mobile-friendly and accessible UI using Bootstrap 5.
- 💾 **Export/Import:** Export your collection as CSV or JSON, and import data to migrate or backup your collection.
- 🔐 **Authentication:** Secure login and account management with Supabase.
- 🕒 **Recent Activity:** See your most recently added and updated albums at a glance.

---

---

## 🚀 Getting Started

1. **Clone the repository:**

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

   ***

   ```

   - Repeat similar policies for `groups` and `members` tables.
   - For more details, see the [Supabase Auth docs](https://supabase.com/docs/guides/auth).
   ```

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome! Please open an issue or submit a pull request on GitHub.

---

## 📝 License

MIT License

---

Made with ♥ for the K-Pop community.

---
