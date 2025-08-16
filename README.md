# K-Pop Album Tracker

K-Pop Album Tracker is a web application designed for K-Pop fans to easily manage, track, and visualize their physical album collections. Built with a modern, responsive UI and powered by Supabase for authentication and data storage, this app helps you keep your collection organized and accessible from anywhere.

## Features

- **Album Collection Management:** Add, edit, and delete albums and versions, including details like group, release date, and special versions.
- **Group Management:** Organize albums by K-Pop group and view group-specific stats.
- **Profile & Stats:** View your collection stats, most collected group, recent activity, and manage your account details.
- **Responsive Design:** Mobile-friendly and accessible UI using Bootstrap 5.
- **Export/Import:** Export your collection as CSV or JSON, and import data to migrate or backup your collection.
- **Authentication:** Secure login and account management with Supabase.
- **Recent Activity:** See your most recently added and updated albums at a glance.

## Getting Started

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

   - You will need at least two tables: `albums` and `groups`. Here is an example SQL command to create the basic structure:

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
     ```

   - You may need to adjust or extend these tables to fit your needs (e.g., add more fields, indexes, or relationships).

## Contributing

Contributions, bug reports, and feature requests are welcome! Please open an issue or submit a pull request on GitHub.

## License

MIT License

---

Made with ♥ for the K-Pop community.
