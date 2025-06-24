

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
// Input: a Date object (UTC timestamp)
// Output: a Date object (UTC timestamp) representing 00:00:00 on the WIB day of the input date
function getMidnightWIB(date: Date): Date {
  const wibYear = parseInt(date.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Jakarta' }));
  const wibMonth = parseInt(date.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Jakarta' })) - 1; // month is 0-indexed
  const wibDay = parseInt(date.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Jakarta' }));
  // Construct a new UTC Date object that represents 00:00:00 on that WIB date.
  // WIB is UTC+7. So, WIB 00:00 is previous day 17:00 UTC.
  return new Date(Date.UTC(wibYear, wibMonth, wibDay, -7, 0, 0, 0)); 
}


export function calculateNextResetTimestamp(
  taskCategory: TaskResetCategory,
  specificResetDays: number[] | undefined | null, // Array hari (0 Minggu - 6 Sabtu)
  baseTimestamp: number, // Biasanya Date.now() atau last_completion_timestamp (UTC)
  isTaskJustCompleted: boolean = false,
  specificResetHours?: number | null
): number | null { // Return type changed to number | null
  const baseDate = new Date(baseTimestamp); // This is UTC
  let nextResetDateUTC: Date;

  switch (taskCategory) {
    case TaskResetCategory.ENDED:
      return null; // Ended tasks don't have a next reset

    case TaskResetCategory.DAILY: {
      // Determine the calendar date (Year, Month, Day) in WIB for the baseTimestamp.
      const dateInWIB = new Date(baseTimestamp);
      const wibYear = parseInt(dateInWIB.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Jakarta' }));
      const wibMonth = parseInt(dateInWIB.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Jakarta' })) - 1; // JS months 0-11
      const wibDay = parseInt(dateInWIB.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Jakarta' }));

      // This is 00:00:00 on the WIB calendar day of baseTimestamp, expressed as a UTC Date object.
      // (e.g., if baseTimestamp is 22 June (any time WIB), this is 22 June 00:00 WIB / 21 June 17:00 UTC)
      const midnightOfWIBBaseDay = new Date(Date.UTC(wibYear, wibMonth, wibDay, -7, 0, 0, 0));

      // Calculate 23:59:00 on that WIB calendar day.
      let endOfWIBDayTarget = new Date(midnightOfWIBBaseDay.getTime());
      endOfWIBDayTarget.setUTCHours(endOfWIBDayTarget.getUTCHours() + 23);
      endOfWIBDayTarget.setUTCMinutes(endOfWIBDayTarget.getUTCMinutes() + 59);
      // (e.g., if midnightOfWIBBaseDay is 22 June 00:00 WIB, endOfWIBDayTarget is 22 June 23:59 WIB)

      if (isTaskJustCompleted) {
        // Task was just completed. Next reset is 23:59:00 on the day of completion (WIB).
        nextResetDateUTC = endOfWIBDayTarget;
      } else {
        // Task is incomplete. We are calculating its current reset period or next one if today's passed.
        if (baseTimestamp >= endOfWIBDayTarget.getTime()) {
          // Current time (baseTimestamp) is at or after 23:59:00 of the current WIB day.
          // So, the reset for "today" (WIB) has effectively passed.
          // The relevant next reset for this incomplete task is for 23:59:00 of the *next* WIB day.
          let endOfNextWIBDay = new Date(endOfWIBDayTarget.getTime());
          endOfNextWIBDay.setUTCDate(endOfNextWIBDay.getUTCDate() + 1); // Handles month/year rollover
          nextResetDateUTC = endOfNextWIBDay;
        } else {
          // Current time (baseTimestamp) is before 23:59:00 of the current WIB day.
          // The task is available for completion "today" (WIB). Its reset point is 23:59:00 of today (WIB).
          nextResetDateUTC = endOfWIBDayTarget;
        }
      }
      break;
    }

    case TaskResetCategory.COUNTDOWN_24H:
      return baseTimestamp + 24 * 60 * 60 * 1000;
    
    case TaskResetCategory.SPECIFIC_HOURS:
      if (specificResetHours && specificResetHours > 0) {
        return baseTimestamp + specificResetHours * 60 * 60 * 1000;
      }
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
          let candidateResetBaseDate = new Date(baseDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
          let candidateReset = getMidnightWIB(candidateResetBaseDate); // Midnight of the current WIB day of baseDate

          const currentDayWIB = candidateResetBaseDate.getDay(); // Day of week in WIB (0 Sun - 6 Sat)

          let daysUntilTarget = (targetDay - currentDayWIB + 7) % 7;

          if (daysUntilTarget === 0 && (isTaskJustCompleted || baseTimestamp >= candidateReset.getTime())) {
            // If target is today, but task was just completed OR current time is past today's midnight
            // then we need to aim for the *next* occurrence of this target day (i.e., 7 days later).
            daysUntilTarget = 7; 
          }
          
          // Calculate the actual date for the reset
          let tempCalcDate = new Date(candidateReset.getTime()); // Start from midnight of current WIB day
          tempCalcDate.setUTCDate(tempCalcDate.getUTCDate() + daysUntilTarget); 
          // At this point, tempCalcDate's time part might not be midnight if DST was crossed or something weird.
          // So, re-normalize to midnight WIB of that target calendar day.
          candidateReset = getMidnightWIB(tempCalcDate); 

          if (candidateReset.getTime() < closestNextReset) {
              closestNextReset = candidateReset.getTime();
          }
      }
      nextResetDateUTC = new Date(closestNextReset);
      break;
      
    default:
      console.error(`Unknown task category: ${taskCategory}`);
      nextResetDateUTC = new Date(baseTimestamp + 24 * 60 * 60 * 1000); // Default 24 jam
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
