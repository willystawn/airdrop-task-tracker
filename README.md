
# Airdrop Task Tracker (Sumber Rejeki)

A web application designed to help users efficiently manage and track tasks related to cryptocurrency airdrops. It features various reset categories for tasks (daily, weekly, countdown, specific hours/days), sub-task management, customizable tags, and user-specific data powered by Supabase.

## ✨ Features

*   **Task Management**: Create, edit, and delete airdrop-related tasks.
*   **Flexible Reset Categories**:
    *   Daily resets (at midnight WIB).
    *   24-hour countdown resets from completion.
    *   Specific Hours countdown (e.g., every 3 hours from completion).
    *   Weekly resets (e.g., every Monday at midnight WIB).
    *   Specific day(s) of the week resets.
*   **Sub-tasks**: Break down complex tasks into smaller, manageable steps, each with optional independent reset logic.
*   **Completion Tracking**: Mark tasks and sub-tasks as complete/incomplete.
*   **Next Reset Timers**: Visual countdowns for when tasks or sub-tasks will become available again.
*   **Customizable Tags**: Organize tasks with global, color-coded tags. Users can define their own tags.
*   **Filtering & Sorting**:
    *   Filter tasks by category, tags, and search text.
    *   Option to show/hide completed tasks.
    *   Sort tasks by creation date, title, or next reset time.
*   **User Accounts**: Tasks and tags are user-specific, identified by a User ID (UUID).
*   **Responsive Design**: Modern and clean UI, usable on various screen sizes.
*   **Initial Data Seeding**: Pre-populates with sample tasks and tags for new users.
*   **Gemini API Integration**: Uses Google Gemini API for potential AI-powered features. The API key is managed via environment variables.

## ቴክ Tech Stack

*   **Frontend**: React, TypeScript, TailwindCSS
*   **Backend**: Supabase (PostgreSQL Database, Auth (indirectly via User ID))
*   **Build/Module System**: ES Modules with `importmap` (suitable for development or simple deployments). For production, a build tool like Vite is recommended to handle environment variables and optimize assets.
*   **AI Integration**: Google Gemini API (via `@google/genai`)

## 🚀 Prerequisites

*   Node.js (latest LTS version recommended, primarily if using a build tool like Vite)
*   `npm` or `yarn` (if using a build tool)
*   A Supabase Account (for database and backend services)
*   A Google Gemini API Key

## 🛠️ Setup and Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/airdrop-task-tracker.git # Replace with your repo URL
    cd airdrop-task-tracker
    ```

2.  **Install Dependencies (if using a build tool like Vite)**
    The project uses ES modules directly imported via an `importmap` in `index.html`. If you integrate a build tool like Vite (recommended for managing environment variables securely and for production builds), you'd run:
    ```bash
    # npm install
    # or
    # yarn install
    ```
    For the current direct browser setup, dependencies are fetched via CDN (esm.sh).

3.  **Supabase Setup**

    *   **Create a Supabase Project**:
        *   Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
        *   Navigate to Project Settings -> API. Note your Project URL and `anon` key.
    *   **Database Schema**:
        You need to set up the following tables in your Supabase SQL Editor.

        **`profiles` Table:** Stores user information.
        ```sql
        CREATE TABLE public.profiles (
            id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            username TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
        -- Optional: Trigger to automatically update 'updated_at'
        CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER set_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_set_timestamp();

        -- Optional: Function to populate profiles from auth.users (if using Supabase Auth for sign-ups)
        -- This app uses direct UUID input, so manual profile creation or this function is needed.
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.profiles (id, username)
          VALUES (NEW.id, NEW.email); -- Or use another source for username
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
        ```

        **`global_tags` Table:** Stores user-defined global tags.
        ```sql
        CREATE TABLE public.global_tags (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            color_classes TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            UNIQUE(user_id, text) -- Ensure unique tag text per user
        );
        ```

        **`managed_tasks` Table:** Stores the tasks.
        ```sql
        CREATE TABLE public.managed_tasks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            logo_url TEXT,
            is_completed BOOLEAN NOT NULL DEFAULT FALSE,
            category TEXT NOT NULL, -- e.g., "Daily", "24h Countdown"
            specific_reset_days INTEGER[], -- Array of day numbers (0-6 for Sun-Sat)
            specific_reset_hours INTEGER, -- e.g., 3 for every 3 hours
            last_completion_timestamp TIMESTAMPTZ,
            next_reset_timestamp TIMESTAMPTZ,
            tags TEXT[], -- Array of tag strings
            sub_tasks JSONB, -- Array of SubTask objects
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );

        -- Trigger for 'updated_at' on managed_tasks
        CREATE TRIGGER set_managed_tasks_updated_at
        BEFORE UPDATE ON public.managed_tasks
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_set_timestamp();
        ```
        *Structure for `sub_tasks` JSONB field (array of objects):*
        ```json
        {
          "title": "string",
          "isCompleted": "boolean",
          "category": "string (TaskResetCategory) | null",
          "specific_reset_hours": "number | null",
          "last_completion_timestamp": "string (ISO timestamp) | null",
          "next_reset_timestamp": "string (ISO timestamp) | null"
        }
        ```

    *   **Row Level Security (RLS) Policies**:
        Enable RLS for `profiles`, `global_tags`, and `managed_tasks` tables.
        Here are example policies. **Adjust them based on your security needs.**

        For `profiles`:
        ```sql
        -- Allow users to read their own profile
        CREATE POLICY "Allow individual read access"
        ON public.profiles FOR SELECT
        USING (auth.uid() = id);

        -- Allow users to update their own profile
        CREATE POLICY "Allow individual update access"
        ON public.profiles FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
        ```
        *(Note: The `handle_new_user` trigger handles inserts into `profiles`. If users can create/update their own profiles directly via client, ensure appropriate policies.)*

        For `global_tags`:
        ```sql
        -- Allow users to manage their own tags
        CREATE POLICY "Allow full access for user's own tags"
        ON public.global_tags FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        ```

        For `managed_tasks`:
        ```sql
        -- Allow users to manage their own tasks
        CREATE POLICY "Allow full access for user's own tasks"
        ON public.managed_tasks FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        ```

4.  **Environment Variables**
    This application uses `import.meta.env` to access environment variables, which is a standard feature in build tools like Vite. Create a `.env` file in the project root:

    ```env
    # Supabase Project Credentials
    VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

    # Google Gemini API Key
    VITE_GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
    ```
    Replace `YOUR_SUPABASE_PROJECT_URL`, `YOUR_SUPABASE_ANON_KEY`, and `YOUR_GOOGLE_GEMINI_API_KEY` with your actual credentials.
    **Important**: These variables are embedded into the client-side bundle by the build tool. Ensure your `.env` file is not committed to public repositories if it contains sensitive information and you are not using a build step that properly handles them for client-side exposure. The `VITE_` prefix is a Vite convention to expose variables to client-side code.

5.  **Running the Application (Development)**
    *   **With a build tool like Vite (Recommended):**
        If you have set up Vite, run:
        ```bash
        npm run dev
        # or
        # yarn dev
        ```
        Vite will serve the application, handle Hot Module Replacement (HMR), and make environment variables from your `.env` file available via `import.meta.env`.

    *   **Directly with a simple HTTP server (for the current `importmap` setup without Vite):**
        The use of `import.meta.env` in `supabaseClient.ts` means a simple static server **will not** typically process `.env` files and inject these variables. For this to work without a build tool, you would need to manually replace `import.meta.env.VITE_SUPABASE_URL` etc., in `supabaseClient.ts` with your actual keys (not recommended for anything beyond very basic local testing) or use a more advanced server setup.
        **Using a build tool like Vite is highly recommended for proper environment variable management.**
        If you are using the `importmap` approach without Vite, the environment variables in `supabaseClient.ts` as `import.meta.env.*` will be undefined unless the serving mechanism specifically provides them.

6.  **Building for Production (with a build tool like Vite)**
    ```bash
    npm run build
    # or
    # yarn build
    ```
    This will create a `dist` folder (or similar) with optimized static assets ready for deployment.

## 🖥️ Usage

1.  **Login**:
    *   Open the application in your browser.
    *   You will be prompted to enter a **User ID**. This must be a valid UUID corresponding to an existing user `id` in your Supabase `auth.users` table (which should also have a corresponding entry in the `profiles` table).
    *   For testing, you might need to manually create a user in your Supabase dashboard (Authentication -> Users -> Add User) and then ensure a corresponding entry exists in `public.profiles` (or rely on the `handle_new_user` trigger if you enabled Supabase Auth sign-ups). Then, copy the User ID (UUID) from the Supabase dashboard.

2.  **Main Interface (Feature Management Page)**:
    *   **Add New Task**: Click the "Add New Task" button. Fill in the details, including title, description, reset category, specific reset parameters (days/hours if applicable), tags, and sub-tasks.
    *   **Manage Tags**: Expand the "Manage Tags" section to add new global tags with randomly assigned colors or delete existing ones. These tags can then be applied to tasks.
    *   **Filtering and Sorting**: Use the controls to filter tasks by search term, category, or selected tags. Sort tasks by various criteria like creation date, title, or next reset time.
    *   **Task Interaction**:
        *   Click the circle/check icon to toggle task completion.
        *   Expand a task to see its description, sub-tasks, tags, and reset information.
        *   Toggle sub-task completion individually.
        *   Edit or delete tasks using the icons that appear on hover.
    *   **Logout**: Click the logout icon to clear your session.

## 🤝 Contributing

Contributions are welcome! If you have suggestions or want to improve the application, please feel free to:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourAmazingFeature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
5.  Push to the branch (`git push origin feature/YourAmazingFeature`).
6.  Open a Pull Request.

Please ensure your code follows the existing style.

## 💡 Feedback and Suggestions

We'd love to hear your feedback or any suggestions you might have to improve this Airdrop Task Tracker!
Please open an issue on GitHub to share your thoughts. Some ideas for improvement:

*   **Enhanced AI Features**:
    *   Use Gemini to suggest task titles or descriptions based on keywords.
    *   Generate summaries for airdrop campaigns.
    *   Help categorize tasks or suggest relevant tags.
*   **Calendar View**: A visual calendar showing when tasks are due or reset.
*   **Notifications**: Browser notifications for upcoming task resets.
*   **Full Supabase Authentication**: Implement a complete email/password or OAuth login flow via Supabase Auth instead of manual User ID entry.
*   **Bulk Actions**: Allow users to edit or delete multiple tasks at once.
*   **Export/Import Data**: Functionality to back up or transfer task data.
*   **More Tag Customization**: Allow users to pick specific colors for tags rather than just random assignment.
*   **Team/Shared Access**: (Advanced) Allow sharing task lists with other users.

Thank you for checking out Sumber Rejeki!
