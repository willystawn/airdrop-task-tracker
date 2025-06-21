
import { useState, useEffect } from 'react';
import { calculateTimeParts, parseSupabaseDate } from '../services/utils';

export const useCountdown = (targetTimestampProp?: number | string | null): string => {
  const targetTimestamp = typeof targetTimestampProp === 'string' 
    ? parseSupabaseDate(targetTimestampProp) 
    : targetTimestampProp;

  const [timeLeftString, setTimeLeftString] = useState<string>('Menghitung...');

  useEffect(() => {
    if (targetTimestamp === undefined || targetTimestamp === null) {
      setTimeLeftString('N/A');
      return;
    }

    const updateCountdown = () => {
      const { days, hours, minutes, seconds, isPast } = calculateTimeParts(targetTimestamp);

      if (isPast) {
        setTimeLeftString("Saatnya / Terlewat");
        // No need to clear interval here if we want to keep it "Terlewat"
        // If the targetTimestamp itself changes, useEffect will re-run and clear.
        return; 
      }

      if (days > 0) {
        setTimeLeftString(`${days}h ${hours}j tersisa`);
      } else if (hours > 0) {
        setTimeLeftString(`${hours}j ${minutes}m tersisa`);
      } else if (minutes > 0) {
        setTimeLeftString(`${minutes}m ${seconds}d tersisa`);
      } else if (seconds >= 0) {
        setTimeLeftString(`${seconds}d tersisa`);
      } else {
        // This case should ideally be caught by isPast, but as a fallback:
        setTimeLeftString("Segera");
      }
    };

    // Initial call to set the time immediately
    updateCountdown();

    // Set up the interval to update every second
    const intervalId = setInterval(updateCountdown, 1000);

    // Clean up the interval when the component unmounts or targetTimestamp changes
    return () => clearInterval(intervalId);
  }, [targetTimestamp]);

  return timeLeftString;
};
