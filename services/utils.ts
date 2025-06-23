
import { TaskResetCategory, ManagedTask, WeekDays } from '../types';

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Fungsi untuk mengonversi timestamp ISO dari Supabase ke number (milidetik)
export function parseSupabaseDate(dateString?: string | null): number | undefined {
  if (!dateString) return undefined;
  return new Date(dateString).getTime();
}

// Fungsi untuk mengonversi number (milidetik) ke string ISO untuk Supabase
export function toSupabaseDate(timestamp?: number | null): string | undefined {
  if (timestamp === undefined || timestamp === null) return undefined;
  return new Date(timestamp).toISOString();
}


export function formatTimestamp(
  timestamp?: number | string, // Bisa menerima number atau ISO string
  options?: Intl.DateTimeFormatOptions,
  timeZone: string = 'Asia/Jakarta' // WIB
): string {
  const tsNumber = typeof timestamp === 'string' ? parseSupabaseDate(timestamp) : timestamp;
  if (!tsNumber) return 'N/A';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Format 24 jam
    timeZone: timeZone,
    ...options,
  };
  try {
    return new Date(tsNumber).toLocaleString('id-ID', defaultOptions); // 'id-ID' untuk format Indonesia
  } catch (e) {
    console.error("Error formatting date:", e);
    // Fallback jika timezone tidak valid
    return new Date(tsNumber).toLocaleString('id-ID', { ...defaultOptions, timeZone: undefined });
  }
}

interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export function calculateTimeParts(targetTimestamp?: number): TimeParts {
  if (targetTimestamp === undefined || targetTimestamp === null) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }; // Consider as past if no target
  }

  const now = Date.now();
  const diff = targetTimestamp - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isPast: false };
}

export function formatTimeDifference(targetTimestamp?: number | string): string {
    const tsNumber = typeof targetTimestamp === 'string' ? parseSupabaseDate(targetTimestamp) : targetTimestamp;
    
    if (tsNumber === undefined || tsNumber === null) return 'N/A';

    const { days, hours, minutes, seconds, isPast } = calculateTimeParts(tsNumber);

    if (isPast) return "Saatnya / Terlewat";

    if (days > 0) return `${days}h ${hours}j tersisa`;
    if (hours > 0) return `${hours}j ${minutes}m tersisa`;
    if (minutes > 0) return `${minutes}m ${seconds}d tersisa`;
    if (seconds >= 0) return `${seconds}d tersisa`; // Show 0d if exactly on time
    
    return "Segera"; // Should be covered by isPast for 0 or negative diff
}


// Fungsi helper untuk mendapatkan tanggal tengah malam di WIB
function getMidnightWIB(date: Date): Date {
  const wibYear = parseInt(date.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Jakarta' }));
  const wibMonth = parseInt(date.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Jakarta' })) - 1; // month is 0-indexed
  const wibDay = parseInt(date.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Jakarta' }));
  return new Date(Date.UTC(wibYear, wibMonth, wibDay, -7, 0, 0)); // UTC 00:00:00 minus offset WIB (7 jam)
}


export function calculateNextResetTimestamp(
  taskCategory: TaskResetCategory,
  specificResetDays: number[] | undefined | null, // Array hari (0 Minggu - 6 Sabtu)
  baseTimestamp: number, // Biasanya Date.now() atau last_completion_timestamp (UTC)
  isTaskJustCompleted: boolean = false,
  specificResetHours?: number | null
): number | null { // Return type changed to number | null
  const baseDate = new Date(baseTimestamp); // Ini adalah UTC
  let nextResetDateUTC = new Date(baseTimestamp);

  switch (taskCategory) {
    case TaskResetCategory.ENDED:
      return null; // Ended tasks don't have a next reset

    case TaskResetCategory.DAILY:
      let midnightWIBToday = getMidnightWIB(baseDate);
      if (baseTimestamp >= midnightWIBToday.getTime() || isTaskJustCompleted) {
        const tomorrow = new Date(baseDate);
        tomorrow.setDate(baseDate.getDate() + 1);
        nextResetDateUTC = getMidnightWIB(tomorrow);
      } else {
        nextResetDateUTC = midnightWIBToday;
      }
      break;

    case TaskResetCategory.COUNTDOWN_24H:
      return baseTimestamp + 24 * 60 * 60 * 1000;
    
    case TaskResetCategory.SPECIFIC_HOURS:
      if (specificResetHours && specificResetHours > 0) {
        return baseTimestamp + specificResetHours * 60 * 60 * 1000;
      }
      // Fallback if hours not set or invalid, treat like 24h countdown or a default
      console.warn(`Specific hours not set or invalid for SPECIFIC_HOURS category. Defaulting to 24h.`);
      return baseTimestamp + 24 * 60 * 60 * 1000;


    case TaskResetCategory.WEEKLY_MONDAY:
    case TaskResetCategory.SPECIFIC_DAY:
      const targetDays = taskCategory === TaskResetCategory.WEEKLY_MONDAY ? [1] : specificResetDays;
      if (!targetDays || targetDays.length === 0) {
        console.error("Specific days not provided or empty for category:", taskCategory);
        return baseTimestamp + 7 * 24 * 60 * 60 * 1000; // Default ke 7 hari
      }

      let closestNextReset = Infinity;

      for (const targetDay of targetDays) {
          let candidateReset = getMidnightWIB(baseDate); 
          const currentDayWIB = (new Date(baseDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))).getDay(); 

          let daysUntilTarget = (targetDay - currentDayWIB + 7) % 7;

          if (daysUntilTarget === 0 && (isTaskJustCompleted || baseTimestamp >= candidateReset.getTime())) {
            daysUntilTarget = 7; 
          }
          
          let tempCalcDate = new Date(baseDate.getTime()); 
          tempCalcDate.setUTCDate(tempCalcDate.getUTCDate() + daysUntilTarget); 
          candidateReset = getMidnightWIB(tempCalcDate); 

          if (candidateReset.getTime() < closestNextReset) {
              closestNextReset = candidateReset.getTime();
          }
      }
      nextResetDateUTC = new Date(closestNextReset);
      break;
      
    default:
      console.error(`Unknown task category: ${taskCategory}`);
      return baseTimestamp + 24 * 60 * 60 * 1000; // Default 24 jam
  }
  return nextResetDateUTC.getTime(); // Ini adalah timestamp UTC
}


export function getInitialNextResetTimestamp(task: Omit<ManagedTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'next_reset_timestamp' | 'last_completion_timestamp' | 'sub_tasks' >): number | null {
    return calculateNextResetTimestamp(
        task.category,
        task.specific_reset_days,
        Date.now(),
        false, // Bukan baru selesai, ini kalkulasi awal
        task.specific_reset_hours
    );
}