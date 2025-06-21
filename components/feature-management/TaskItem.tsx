
import React from 'react';
import { ManagedTask, TaskResetCategory, GlobalTag } from '../../types';
import { Accordion } from '../shared/Accordion';
import { UrlRenderer } from '../shared/UrlRenderer';
import { Tag } from '../shared/Tag';
import { CheckCircleIcon, CircleIcon, ClockIcon, CalendarDaysIcon, ArrowPathIcon, InformationCircleIcon } from '../shared/icons/HeroIcons';
import { formatTimestamp, parseSupabaseDate } from '../../services/utils';
import { useCountdown } from '../../hooks/useCountdown';
import { SubTaskListItem } from './SubTaskListItem'; // Import the new SubTaskListItem

interface TaskItemProps {
  task: ManagedTask;
  onToggleComplete: (taskId: string, subTaskTitle?: string) => void;
  globalTagDefinitions: GlobalTag[];
}

const DEFAULT_TAG_COLOR_ITEM = "bg-neutral text-base-content"; 

const getCategoryIcon = (category: TaskResetCategory | "", className?: string) => {
  const baseClassName = className || "w-4 h-4 mr-1.5";
  switch (category) {
    case TaskResetCategory.DAILY:
      return <CalendarDaysIcon className={`${baseClassName} text-blue-400`} />;
    case TaskResetCategory.COUNTDOWN_24H:
      return <ClockIcon className={`${baseClassName} text-orange-400`} />;
    case TaskResetCategory.SPECIFIC_HOURS: // New Icon
      return <ClockIcon className={`${baseClassName} text-teal-400`} />; 
    case TaskResetCategory.WEEKLY_MONDAY:
    case TaskResetCategory.SPECIFIC_DAY:
      return <CalendarDaysIcon className={`${baseClassName} text-purple-400`} />;
    default:
      return null;
  }
};

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleComplete, globalTagDefinitions }) => {
  const nextResetNum = parseSupabaseDate(task.next_reset_timestamp);
  const timeToReset = useCountdown(task.is_completed ? nextResetNum : undefined);
  
  const hasSubTasks = task.sub_tasks && task.sub_tasks.length > 0;

  const getTagColorClasses = (tagText: string): string => {
    const found = globalTagDefinitions.find(gtd => gtd.text === tagText);
    return found ? found.colorClasses : DEFAULT_TAG_COLOR_ITEM;
  };

  const titleContent = (
    <div className="flex items-center w-full gap-3">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task.id); 
        }}
        className="p-1 flex-shrink-0 focus:outline-none rounded-full hover:bg-base-300/50"
        aria-label={task.is_completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {task.is_completed ? (
          <CheckCircleIcon className="w-6 h-6 text-success" />
        ) : (
          <CircleIcon className="w-6 h-6 text-base-content-secondary group-hover:text-base-content" />
        )}
      </button>
      {task.logo_url && <img src={task.logo_url} alt="task logo" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
      <div className="flex-grow text-left overflow-hidden">
        <h3 className={`font-semibold ${task.is_completed ? 'text-base-content-secondary' : 'text-base-content'} group-hover:text-primary transition-colors`}>
          <UrlRenderer text={task.title} />
        </h3>
        <div className="text-xs text-base-content-secondary flex items-center mt-1">
          {getCategoryIcon(task.category)} {task.category}
          {task.category === TaskResetCategory.SPECIFIC_DAY && task.specific_reset_days && task.specific_reset_days.length > 0 && (
            <span className="ml-1">({task.specific_reset_days.map(d => ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d]).join(', ')})</span>
          )}
          {task.category === TaskResetCategory.SPECIFIC_HOURS && task.specific_reset_hours && (
            <span className="ml-1">(Every {task.specific_reset_hours}h)</span>
          )}
        </div>
      </div>
       {task.is_completed && timeToReset && timeToReset !== 'N/A' && timeToReset !== "Saatnya / Terlewat" && (
        <div className="text-xs text-accent flex items-center ml-auto flex-shrink-0 whitespace-nowrap hidden sm:flex">
          <ArrowPathIcon className="w-3.5 h-3.5 mr-1"/> {timeToReset}
        </div>
      )}
       {(task.is_completed && timeToReset === "Saatnya / Terlewat") && (
         <div className="text-xs text-info flex items-center ml-auto flex-shrink-0 whitespace-nowrap hidden sm:flex">
            <InformationCircleIcon className="w-4 h-4 mr-1"/> {timeToReset}
        </div>
       )}
       {(!task.is_completed && nextResetNum && Date.now() > nextResetNum) && (
         <div className="text-xs text-error flex items-center ml-auto flex-shrink-0 whitespace-nowrap hidden sm:flex">
            <InformationCircleIcon className="w-4 h-4 mr-1"/> Terlewat
        </div>
       )}
    </div>
  );

  return (
    <div className="mb-3 bg-base-200 shadow-lg rounded-lg group transition-all duration-200 hover:shadow-primary/30">
      <Accordion 
        titleContent={titleContent}
        initiallyOpen={false} // Changed to false
      >
        <div className="space-y-3">
          <div className="text-sm text-base-content-secondary prose prose-sm max-w-none prose-a:text-accent prose-a:hover:underline">
            <UrlRenderer text={task.description} renderAsParagraphs={true} />
          </div>

          {hasSubTasks && (
            <div className="pt-2 mt-2 border-t border-base-300">
              <h4 className="text-xs font-semibold uppercase text-base-content-secondary mb-2">Sub-Tasks:</h4>
              <ul className="space-y-2.5">
                {task.sub_tasks!.map((subTask, index) => (
                  <SubTaskListItem
                    key={`${task.id}-sub-${index}-${subTask.title}`} // More stable key
                    subTask={subTask}
                    taskId={task.id}
                    onToggleComplete={onToggleComplete}
                  />
                ))}
              </ul>
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {task.tags.map(tagText => (
                <Tag 
                    key={tagText} 
                    text={tagText} 
                    colorClasses={getTagColorClasses(tagText)} 
                />
              ))}
            </div>
          )}
          <div className="text-xs text-base-content-secondary pt-2 border-t border-base-300 mt-2 space-x-4">
            <span>Reset Berikutnya: {formatTimestamp(task.next_reset_timestamp)}</span>
            {task.last_completion_timestamp && (
                <span>Terakhir Selesai: {formatTimestamp(task.last_completion_timestamp)}</span>
            )}
          </div>
        </div>
      </Accordion>
    </div>
  );
};
