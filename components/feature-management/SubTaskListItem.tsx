import React from 'react';
import { SubTask, TaskResetCategory, WeekDays } from '../../types';
import { UrlRenderer } from '../shared/UrlRenderer';
import { CheckCircleIcon, CircleIcon, ClockIcon, CalendarDaysIcon, ArrowPathIcon, InformationCircleIcon } from '../shared/icons/HeroIcons';
import { useCountdown } from '../../hooks/useCountdown';
import { parseSupabaseDate } from '../../services/utils';

interface SubTaskListItemProps {
  subTask: SubTask;
  taskId: string;
  onToggleComplete: (taskId: string, subTaskTitle?: string) => void;
}

const getSubCategoryIcon = (category: TaskResetCategory | "", className?: string) => {
  const baseClassName = className || "w-3 h-3 mr-1"; // Slightly smaller for sub-tasks
  switch (category) {
    case TaskResetCategory.DAILY:
      return <CalendarDaysIcon className={`${baseClassName} text-blue-400/80`} />;
    case TaskResetCategory.COUNTDOWN_24H:
      return <ClockIcon className={`${baseClassName} text-orange-400/80`} />;
    case TaskResetCategory.SPECIFIC_HOURS: 
      return <ClockIcon className={`${baseClassName} text-teal-400/80`} />;
    case TaskResetCategory.WEEKLY_MONDAY:
    case TaskResetCategory.SPECIFIC_DAY:
      return <CalendarDaysIcon className={`${baseClassName} text-purple-400/80`} />;
    default:
      return null;
  }
};

export const SubTaskListItem: React.FC<SubTaskListItemProps> = ({ subTask, taskId, onToggleComplete }) => {
  const subTaskNextResetNum = parseSupabaseDate(subTask.next_reset_timestamp);
  const subTaskTimeToReset = useCountdown(
    (subTask.category && subTask.isCompleted && subTaskNextResetNum) ? subTaskNextResetNum : undefined
  );

  const formattedSpecificDays = subTask.category === TaskResetCategory.SPECIFIC_DAY && subTask.specific_reset_days && subTask.specific_reset_days.length > 0
    ? ` (${subTask.specific_reset_days.map(d => WeekDays.find(wd => wd.id === d)?.name.substring(0,3)).filter(Boolean).join(', ')})`
    : "";

  return (
    <li className="flex items-start gap-2 text-sm">
      <button
        onClick={() => onToggleComplete(taskId, subTask.title)}
        className="p-0.5 flex-shrink-0 focus:outline-none rounded-full hover:bg-base-300/50 mt-0.5"
        aria-label={subTask.isCompleted ? "Mark sub-task as incomplete" : "Mark sub-task as complete"}
      >
        {subTask.isCompleted ? <CheckCircleIcon className="w-5 h-5 text-success/80" /> : <CircleIcon className="w-5 h-5 text-base-content-secondary/70" />}
      </button>
      <div className="flex-grow">
        <div className={subTask.isCompleted ? 'text-base-content-secondary/80' : 'text-base-content-secondary'}>
          <UrlRenderer text={subTask.title} renderAsParagraphs={true} />
        </div>
        {(subTask.category || (subTaskTimeToReset && subTaskTimeToReset !== 'N/A' && subTaskTimeToReset !== 'Menghitung...')) && (
          <div className="text-xs flex items-center mt-1 space-x-2">
            {subTask.category && (
              <span className="text-base-content-secondary/70 flex items-center">
                {getSubCategoryIcon(subTask.category)} {subTask.category}
                {subTask.category === TaskResetCategory.SPECIFIC_HOURS && subTask.specific_reset_hours && (
                    <span className="ml-0.5">(Every {subTask.specific_reset_hours}h)</span>
                )}
                {formattedSpecificDays}
              </span>
            )}
            {subTask.isCompleted && subTaskTimeToReset && subTaskTimeToReset !== 'N/A' && subTaskTimeToReset !== "Saatnya / Terlewat" && (
               <span className="text-accent/80 flex items-center">
                 <ArrowPathIcon className="w-3 h-3 mr-0.5"/> {subTaskTimeToReset}
               </span>
            )}
            {subTask.isCompleted && subTaskTimeToReset === "Saatnya / Terlewat" && (
               <span className="text-info/80 flex items-center">
                 <InformationCircleIcon className="w-3 h-3 mr-0.5"/> {subTaskTimeToReset}
               </span>
            )}
            {!subTask.isCompleted && subTask.category && subTaskNextResetNum && Date.now() > subTaskNextResetNum && (
                 <span className="text-error/80 flex items-center">
                    <InformationCircleIcon className="w-3 h-3 mr-0.5"/> Terlewat
                </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
};