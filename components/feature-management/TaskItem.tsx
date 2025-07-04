import React from 'react';
import { ManagedTask, TaskResetCategory, GlobalTag } from '../../types';
import { Accordion } from '../shared/Accordion';
import { UrlRenderer } from '../shared/UrlRenderer';
import { Tag } from '../shared/Tag';
import { CheckCircleIcon, CircleIcon, ClockIcon, CalendarDaysIcon, ArrowPathIcon, InformationCircleIcon, ShieldCheckIcon, PencilSquareIcon, TrashIcon } from '../shared/icons/HeroIcons';
import { formatTimestamp, parseSupabaseDate } from '../../services/utils';
import { useCountdown } from '../../hooks/useCountdown';
import { SubTaskListItem } from './SubTaskListItem';

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
    case TaskResetCategory.SPECIFIC_HOURS: 
      return <ClockIcon className={`${baseClassName} text-teal-400`} />; 
    case TaskResetCategory.WEEKLY_MONDAY:
    case TaskResetCategory.SPECIFIC_DAY:
      return <CalendarDaysIcon className={`${baseClassName} text-purple-400`} />;
    case TaskResetCategory.ENDED:
      return <ShieldCheckIcon className={`${baseClassName} text-success`} />;
    default:
      return null;
  }
};

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleComplete, globalTagDefinitions }) => {
  const isEndedTask = task.category === TaskResetCategory.ENDED;
  const isEffectivelyCompleted = isEndedTask || task.is_completed;

  const nextResetNum = parseSupabaseDate(task.next_reset_timestamp);
  const timeToReset = useCountdown(isEffectivelyCompleted && !isEndedTask ? nextResetNum : undefined);
  
  const hasSubTasks = task.sub_tasks && task.sub_tasks.length > 0;

  const getTagColorClasses = (tagText: string): string => {
    const found = globalTagDefinitions.find(gtd => gtd.text === tagText);
    return found ? found.colorClasses : DEFAULT_TAG_COLOR_ITEM;
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEndedTask) return;
    onToggleComplete(task.id);
  };

  const titleContent = (
    <div className="flex items-start w-full gap-4">
      {task.logo_url && <img src={task.logo_url} alt="task logo" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
      <div className="flex-grow text-left overflow-hidden">
        <h3 className={`font-semibold text-base-content group-hover/accordion:text-primary transition-colors ${isEffectivelyCompleted ? 'line-through text-base-content/60' : ''}`}>
          <UrlRenderer text={task.title} />
        </h3>
        <div className="text-xs text-base-content-secondary flex items-center mt-1.5">
          {getCategoryIcon(task.category)} {task.category}
          {!isEndedTask && task.category === TaskResetCategory.SPECIFIC_DAY && task.specific_reset_days && task.specific_reset_days.length > 0 && (
            <span className="ml-1">({task.specific_reset_days.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(', ')})</span>
          )}
          {!isEndedTask && task.category === TaskResetCategory.SPECIFIC_HOURS && task.specific_reset_hours && (
            <span className="ml-1">(Every {task.specific_reset_hours}h)</span>
          )}
        </div>
      </div>
       <div className="flex-shrink-0 text-right">
        {!isEndedTask && isEffectivelyCompleted && timeToReset && timeToReset !== 'N/A' && timeToReset !== "Saatnya / Terlewat" && (
            <div className="text-xs text-accent flex items-center ml-auto whitespace-nowrap">
            <ArrowPathIcon className="w-3.5 h-3.5 mr-1"/> Resets in {timeToReset}
            </div>
        )}
        {!isEndedTask && (isEffectivelyCompleted && timeToReset === "Saatnya / Terlewat") && (
            <div className="text-xs text-info flex items-center ml-auto whitespace-nowrap">
                <InformationCircleIcon className="w-4 h-4 mr-1"/> Ready to Reset
            </div>
        )}
        {!isEndedTask && (!isEffectivelyCompleted && nextResetNum && Date.now() > nextResetNum) && (
            <div className="text-xs text-error flex items-center ml-auto whitespace-nowrap">
                <InformationCircleIcon className="w-4 h-4 mr-1"/> Overdue
            </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`bg-base-200/60 border border-base-300/50 shadow-md rounded-xl transition-all duration-300 ${isEffectivelyCompleted ? 'opacity-60 hover:opacity-100' : 'hover:border-primary/50 hover:shadow-glow-primary'}`}>
        <div className="flex items-start p-4 gap-3">
             <button
                onClick={handleToggle}
                disabled={isEndedTask}
                className={`p-1 mt-1 flex-shrink-0 focus:outline-none rounded-full transition-colors ${isEndedTask ? 'cursor-default' : 'hover:bg-base-300'}`}
                aria-label={isEffectivelyCompleted ? "Mark as incomplete" : "Mark as complete"}
            >
                {isEffectivelyCompleted ? (
                <CheckCircleIcon className="w-7 h-7 text-success" />
                ) : (
                <CircleIcon className="w-7 h-7 text-base-content-secondary group-hover:text-primary transition-colors" />
                )}
            </button>
            <div className="w-full">
                <Accordion 
                    titleContent={titleContent}
                    initiallyOpen={false}
                >
                    <div className="space-y-4 pt-4">
                    <div className="text-sm text-base-content-secondary prose prose-sm max-w-none prose-a:text-accent prose-a:hover:underline prose-p:my-1">
                        <UrlRenderer text={task.description} renderAsParagraphs={true} />
                    </div>

                    {hasSubTasks && (
                        <div className="pt-3 mt-3 border-t border-base-300/50">
                        <h4 className="text-xs font-semibold uppercase text-base-content-secondary mb-2">Sub-Tasks</h4>
                        <ul className="space-y-3">
                            {task.sub_tasks!.map((subTask, index) => (
                            <SubTaskListItem
                                key={`${task.id}-sub-${index}-${subTask.title}`} 
                                subTask={subTask}
                                taskId={task.id}
                                onToggleComplete={onToggleComplete}
                                parentIsEnded={isEndedTask}
                            />
                            ))}
                        </ul>
                        </div>
                    )}

                    {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-base-300/50">
                        {task.tags.map(tagText => (
                            <Tag 
                                key={tagText} 
                                text={tagText} 
                                colorClasses={getTagColorClasses(tagText)} 
                            />
                        ))}
                        </div>
                    )}
                    {!isEndedTask && (
                        <div className="text-xs text-base-content-secondary/70 pt-3 border-t border-base-300/50 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Next Reset: {formatTimestamp(task.next_reset_timestamp)}</span>
                        {task.last_completion_timestamp && (
                            <span>Last Completed: {formatTimestamp(task.last_completion_timestamp)}</span>
                        )}
                        </div>
                    )}
                    </div>
                </Accordion>
            </div>
        </div>
    </div>
  );
};
