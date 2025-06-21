import { ManagedTask, TaskResetCategory, SubTask } from './types';
import { calculateNextResetTimestamp, getInitialNextResetTimestamp, toSupabaseDate, parseSupabaseDate } from './services/utils'; // For initial data setup

export const COMMON_TASK_TAGS: string[] = ["Big Project", "Testnet", "DePIN", "Social", "Daily Login", "Galxe", "Zealy", "Mainnet", "Node", "Claim", "Points", "Multi-step"];

// The MOCK_USER_ID is now sourced from environment variables in App.tsx.
// Ensure MOCK_USER_ID is set in your .env file and corresponds to a real Supabase Auth User ID.

export const PREDEFINED_TAG_COLOR_CLASSES: Record<string, string> = {
  "Big Project": "bg-yellow-500 text-black",
  "Testnet": "bg-amber-500 text-black", 
  "DePIN": "bg-purple-600 text-white",
  "Social": "bg-pink-500 text-white",
  "Daily Login": "bg-teal-500 text-white",
  "Galxe": "bg-orange-500 text-black", 
  "Zealy": "bg-blue-600 text-white",
  "Mainnet": "bg-emerald-600 text-white", 
  "Node": "bg-lime-500 text-black",
  "Claim": "bg-cyan-500 text-black",
  "Points": "bg-indigo-500 text-white",
  "Multi-step": "bg-fuchsia-500 text-white",
  "Hot": "bg-red-600 text-white",
  "Recommendation": "bg-green-600 text-white",
  "Big Airdrop": "bg-accent text-primary", 
  "New": "bg-sky-500 text-white",
  "Campaign": "bg-rose-500 text-white",
};

export const RANDOM_COLOR_PAIRS: { bg: string; text: string }[] = [
  { bg: 'bg-red-500', text: 'text-white' },
  { bg: 'bg-orange-600', text: 'text-white' },
  { bg: 'bg-amber-400', text: 'text-black' },
  { bg: 'bg-yellow-400', text: 'text-black' },
  { bg: 'bg-lime-600', text: 'text-white' },
  { bg: 'bg-green-500', text: 'text-white' },
  { bg: 'bg-emerald-500', text: 'text-white' },
  { bg: 'bg-teal-600', text: 'text-white' },
  { bg: 'bg-cyan-400', text: 'text-black' },
  { bg: 'bg-sky-600', text: 'text-white' },
  { bg: 'bg-blue-500', text: 'text-white' },
  { bg: 'bg-indigo-600', text: 'text-white' },
  { bg: 'bg-violet-500', text: 'text-white' },
  { bg: 'bg-purple-500', text: 'text-white' },
  { bg: 'bg-fuchsia-600', text: 'text-white' },
  { bg: 'bg-pink-600', text: 'text-white' },
  { bg: 'bg-rose-600', text: 'text-white' },
];

export const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; 
  }
  return Math.abs(hash);
};

export const generateInitialColorClassesForTag = (text: string): string => {
  if (PREDEFINED_TAG_COLOR_CLASSES[text]) {
    return PREDEFINED_TAG_COLOR_CLASSES[text];
  }
  const hashIndex = simpleHash(text) % RANDOM_COLOR_PAIRS.length;
  const randomPair = RANDOM_COLOR_PAIRS[hashIndex];
  return `${randomPair.bg} ${randomPair.text}`;
};

export const generateNewRandomColorClasses = (): string => {
  const randomIndex = Math.floor(Math.random() * RANDOM_COLOR_PAIRS.length);
  const pair = RANDOM_COLOR_PAIRS[randomIndex];
  return `${pair.bg} ${pair.text}`;
};

// INITIAL_TASKS are used for seeding if the database is empty for the user.
// App.tsx handles converting these to the format Supabase expects during seeding.
export const INITIAL_TASKS: Omit<ManagedTask, 'id' | 'user_id'>[] = [
  {
    title: "Daily Login: NebulaFi",
    description: "Log in to NebulaFi platform for daily star-dust points. URL: https://nebulafi.example.com/login",
    logo_url: "https://picsum.photos/seed/nebula/200",
    is_completed: false,
    category: TaskResetCategory.DAILY,
    tags: ["Daily Login", "Points", "DeFi"],
    next_reset_timestamp: toSupabaseDate(calculateNextResetTimestamp(TaskResetCategory.DAILY, undefined, Date.now(), false)),
    last_completion_timestamp: undefined,
    sub_tasks: [],
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    specific_reset_days: [],
    specific_reset_hours: null,
  },
  {
    title: "Weekly Zealy Quests: Galaxy DAO",
    description: "Complete new quests on Zealy for Galaxy DAO. Check https://zealy.io/cw/galaxydao for updates.",
    is_completed: true,
    category: TaskResetCategory.WEEKLY_MONDAY,
    tags: ["Zealy", "SocialFi", "Community"],
    last_completion_timestamp: toSupabaseDate(Date.now() - 2 * 24 * 60 * 60 * 1000), 
    next_reset_timestamp: toSupabaseDate(calculateNextResetTimestamp(TaskResetCategory.WEEKLY_MONDAY, undefined, Date.now() - 2 * 24 * 60 * 60 * 1000, true)),
    sub_tasks: [],
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    specific_reset_days: [],
    specific_reset_hours: null,
  },
  { 
    title: "Project Alpha Campaign", 
    description: "Main tracking task for the Project Alpha campaign. Complete all sub-tasks for full credit. More info at projectalpha.example.com",
    logo_url: "https://picsum.photos/seed/alpha/200",
    is_completed: false,
    category: TaskResetCategory.WEEKLY_MONDAY, 
    tags: ["Project Alpha", "Campaign", "Multi-step"],
    sub_tasks: [
        { title: "Complete Profile Setup on Alpha Platform", isCompleted: false },
        { title: "Perform Social Share (Twitter/X)", isCompleted: false },
        { title: "Refer 1 Friend", isCompleted: false }
    ],
    next_reset_timestamp: toSupabaseDate(getInitialNextResetTimestamp({
        title: "Project Alpha Campaign", 
        description: "Parent task for Project Alpha", 
        category: TaskResetCategory.WEEKLY_MONDAY, 
        tags: ["Project Alpha", "Campaign", "Multi-step"], 
        is_completed: false,
        specific_reset_days: [],
        specific_reset_hours: null,
        logo_url: undefined,
    })),
    last_completion_timestamp: undefined,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    specific_reset_days: [],
    specific_reset_hours: null,
  },
   {
    title: "24h Claim: Test Token Faucet",
    description: "Claim test tokens every 24 hours from faucet. Faucet URL: https://faucet.example.com",
    is_completed: false,
    category: TaskResetCategory.COUNTDOWN_24H,
    tags: ["Faucet", "Testnet", "Claim"],
    last_completion_timestamp: toSupabaseDate(Date.now() - 10 * 60 * 60 * 1000), 
    next_reset_timestamp: toSupabaseDate(calculateNextResetTimestamp(TaskResetCategory.COUNTDOWN_24H, undefined, Date.now() - 10 * 60 * 60 * 1000, false)), 
    sub_tasks: [],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), 
    specific_reset_days: [],
    specific_reset_hours: null,
  },
  {
    title: "Hourly Check: Server Status Bot",
    description: "Bot checks server status every 3 hours. Manual trigger if needed.",
    logo_url: "https://picsum.photos/seed/serverbot/200",
    is_completed: false,
    category: TaskResetCategory.SPECIFIC_HOURS,
    specific_reset_hours: 3, // Resets every 3 hours
    tags: ["Utility", "Bot", "Monitoring"],
    next_reset_timestamp: toSupabaseDate(calculateNextResetTimestamp(TaskResetCategory.SPECIFIC_HOURS, undefined, Date.now(), false, 3)),
    last_completion_timestamp: undefined,
    sub_tasks: [],
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    specific_reset_days: [],
  }
];