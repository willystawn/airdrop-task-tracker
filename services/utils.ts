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
export function toSupabaseDate(timestamp?: number): string | undefined {
  if (!timestamp) return undefined;
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

export function formatTimeDifference(timestamp?: number | string, timeZone: string = 'Asia/Jakarta'): string {
    const tsNumber = typeof timestamp === 'string' ? parseSupabaseDate(timestamp) : timestamp;
    if (!tsNumber) return 'N/A';

    // Untuk perbedaan waktu, kita bandingkan dengan 'now' dalam timezone yang sama
    // Namun, Date.now() selalu UTC. Perbedaan absolut tidak bergantung timezone.
    const now = Date.now();
    const diff = tsNumber - now;

    if (diff <= 0) return "Now / Past";

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}h ${hours % 24}j tersisa`;
    if (hours > 0) return `${hours}j ${minutes % 60}m tersisa`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}d tersisa`; // 'd' untuk detik
    if (seconds > 0) return `${seconds}d tersisa`;
    return "Segera";
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
  specificResetDays: number[] | undefined, // Array hari (0 Minggu - 6 Sabtu)
  baseTimestamp: number, // Biasanya Date.now() atau last_completion_timestamp (UTC)
  isTaskJustCompleted: boolean = false
): number {
  const baseDate = new Date(baseTimestamp); // Ini adalah UTC
  let nextResetDateUTC = new Date(baseTimestamp);

  switch (taskCategory) {
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


export function getInitialNextResetTimestamp(task: Omit<ManagedTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'next_reset_timestamp' | 'last_completion_timestamp' | 'sub_tasks' >): number {
    return calculateNextResetTimestamp(
        task.category,
        task.specific_reset_days,
        Date.now(),
        false // Bukan baru selesai, ini kalkulasi awal
    );
}