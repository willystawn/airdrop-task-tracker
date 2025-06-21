// Enum untuk kategori reset tugas, disesuaikan dengan nilai di DB
export enum TaskResetCategory {
  DAILY = "Daily",
  COUNTDOWN_24H = "24h Countdown",
  WEEKLY_MONDAY = "Weekly (Monday)",
  SPECIFIC_DAY = "Specific Day",
  SPECIFIC_HOURS = "Specific Hours", // New Category
}

export const WeekDays = [
  { id: 0, name: "Minggu" }, // Sunday
  { id: 1, name: "Senin" },   // Monday
  { id: 2, name: "Selasa" },  // Tuesday
  { id: 3, name: "Rabu" }, // Wednesday
  { id: 4, name: "Kamis" }, // Thursday
  { id: 5, name: "Jumat" },  // Friday
  { id: 6, name: "Sabtu" },  // Saturday
];

// Interface untuk SubTask (child task)
// This matches the structure stored in Supabase JSONB field.
export interface SubTask {
  title: string;
  isCompleted: boolean;
  category?: TaskResetCategory | "";
  specific_reset_hours?: number | null; // New field for specific hours category
  last_completion_timestamp?: string | null; // Timestamp for sub-task's own completion
  next_reset_timestamp?: string | null;      // Timestamp for sub-task's own reset
}

// Interface for globally managed tags, aligning with Supabase table
export interface GlobalTag {
  // id?: string; 
  // user_id?: string; 
  text: string;
  colorClasses: string; // Tailwind classes for background and text color
  // created_at?: string;
}

// Aligning with Supabase 'managed_tasks' table
export interface ManagedTask {
  id: string; // UUID, primary key
  user_id: string; // Foreign key to profiles.id
  title: string;
  description: string; 
  logo_url?: string | null; 
  is_completed: boolean;
  category: TaskResetCategory; 
  specific_reset_days?: number[] | null; 
  specific_reset_hours?: number | null; // New field for specific hours category
  last_completion_timestamp?: string | null; 
  next_reset_timestamp?: string | null; 
  tags: string[]; 
  sub_tasks?: SubTask[] | null; 
  created_at: string; 
  updated_at: string; 
}


// Supabase User and Profile (aligns with 'profiles' table)
export interface UserProfile {
  id: string; // UUID, same as auth.users.id
  username: string;
  is_admin?: boolean | null; 
  updated_at: string;
  created_at: string;
}

// Filter dan Sort types
export interface TaskFilters {
  category: TaskResetCategory | "";
  tags: string[];
  searchText: string;
  showCompleted: boolean;
}

export enum TaskSortOption {
  DEFAULT = "Default (Incomplete First)", 
  CREATED_AT_DESC = "Newest First",
  CREATED_AT_ASC = "Oldest First",
  TITLE_ASC = "Title (A-Z)",
  TITLE_DESC = "Title (Z-A)",
  NEXT_RESET_ASC = "Next Reset (Soonest)",
}

export interface FormComponentProps<T> {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: T) => Promise<void | ManagedTask | null>; 
  existingData?: T | null;
  // currentUser?: UserProfile | null; // Removed, user context is global via App.tsx
  globalTagDefinitions: GlobalTag[]; 
}

// Type for Supabase JSON fields, mirroring types_db.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];