import React from 'react';
import { SubTask, TaskResetCategory, WeekDays } from '../../types';
import { UrlRenderer } from '../shared/UrlRenderer';
import { CheckCircleIcon, CircleIcon, ClockIcon, CalendarDaysIcon, ArrowPathIcon, InformationCircleIcon, ShieldCheckIcon } from '../shared/icons/HeroIcons';
import { useCountdown } from '../../hooks/useCountdown';
import { parseSupabaseDate } from '../../services/utils';

interface SubTaskListItemProps {
  subTask: SubTask;
  taskId: string;
  onToggleComplete: (taskId: string, subTaskTitle?: string) => void;
  parentIsEnded?: boolean; // Optional: To inherit ended state from parent if needed
}

const getSubCategoryIcon = (category: TaskResetCategory | "", className?: string) => {
  const baseClassName = className || "w-3 h-3 mr-1"; 
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
    case TaskResetCategory.ENDED:
      return <ShieldCheckIcon className={`${baseClassName} text-success/80`} />;
    default:
      return null;
  }
};

export const SubTaskListItem: React.FC<SubTaskListItemProps> = ({ subTask, taskId, onToggleComplete, parentIsEnded }) => {
  const isSubTaskEnded = subTask.category === TaskResetCategory.ENDED;
  const isEffectivelyCompleted = parentIsEnded || isSubTaskEnded || subTask.isCompleted;

  const subTaskNextResetNum = parseSupabaseDate(subTask.next_reset_timestamp);
  const subTaskTimeToReset = useCountdown(
    (subTask.category && !isSubTaskEnded && isEffectivelyCompleted && subTaskNextResetNum) ? subTaskNextResetNum : undefined
  );

  const formattedSpecificDays = !isSubTaskEnded && subTask.category === TaskResetCategory.SPECIFIC_DAY && subTask.specific_reset_days && subTask.specific_reset_days.length > 0
    ? `(${subTask.specific_reset_days.map(d => WeekDays.find(wd => wd.id === d)?.name.substring(0,3)).filter(Boolean).join(', ')})`
    : "";

  const handleToggle = () => {
    if (parentIsEnded || isSubTaskEnded) return; // Prevent toggle if parent or sub-task itself is ended
    onToggleComplete(taskId, subTask.title);
  };

  return (
    <li className="flex items-start gap-3 text-sm pl-2 border-l-2 border-base-300/70">
      <button
        onClick={handleToggle}
        disabled={parentIsEnded || isSubTaskEnded}
        className={`p-0.5 flex-shrink-0 focus:outline-none rounded-full ${(parentIsEnded || isSubTaskEnded) ? 'cursor-default' : 'hover:bg-base-300'} mt-1`}
        aria-label={isEffectivelyCompleted ? "Mark sub-task as incomplete" : "Mark sub-task as complete"}
      >
        {isEffectivelyCompleted ? <CheckCircleIcon className="w-5 h-5 text-success/80" /> : <CircleIcon className="w-5 h-5 text-base-content-secondary/70" />}
      </button>
      <div className="flex-grow">
        <div className={`prose prose-sm max-w-none prose-p:my-0 ${isEffectivelyCompleted ? 'prose-p:line-through text-base-content-secondary/80' : 'text-base-content-secondary'}`}>
          <UrlRenderer text={subTask.title} renderAsParagraphs={true} />
        </div>
        {!parentIsEnded && !isSubTaskEnded && (subTask.category || (subTaskTimeToReset && subTaskTimeToReset !== 'N/A' && subTaskTimeToReset !== 'Menghitung...')) && (
          <div className="text-xs flex items-center mt-1.5 space-x-2">
            {subTask.category && (
              <span className="text-base-content-secondary/60 flex items-center">
                {getSubCategoryIcon(subTask.category)} {subTask.category}
                {subTask.category === TaskResetCategory.SPECIFIC_HOURS && subTask.specific_reset_hours && (
                    <span className="ml-0.5">(Every {subTask.specific_reset_hours}h)</span>
                )}
                {formattedSpecificDays}
              </span>
            )}
            {isEffectivelyCompleted && subTaskTimeToReset && subTaskTimeToReset !== 'N/A' && subTaskTimeToReset !== "Saatnya / Terlewat" && (
               <span className="text-accent/80 flex items-center">
                 <ArrowPathIcon className="w-3 h-3 mr-0.5"/> {subTaskTimeToReset}
               </span>
            )}
            {isEffectivelyCompleted && subTaskTimeToReset === "Saatnya / Terlewat" && (
               <span className="text-info/80 flex items-center">
                 <InformationCircleIcon className="w-3 h-3 mr-0.5"/> Ready
               </span>
            )}
            {!isEffectivelyCompleted && subTask.category && subTaskNextResetNum && Date.now() > subTaskNextResetNum && (
                 <span className="text-error/80 flex items-center">
                    <InformationCircleIcon className="w-3 h-3 mr-0.5"/> Overdue
                </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
};
