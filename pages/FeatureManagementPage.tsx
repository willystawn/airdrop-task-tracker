
import React, { useState, useMemo, useCallback } from 'react';
import { ManagedTask, TaskFilters, TaskSortOption, UserProfile, GlobalTag } from '../types';
import { TaskItem } from '../components/feature-management/TaskItem';
import { TaskForm } from '../components/feature-management/TaskForm';
import { FilterControlsFM } from '../components/feature-management/FilterControlsFM';
import { PlusCircleIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, ArrowLeftOnRectangleIcon } from '../components/shared/icons/HeroIcons';
import { Tag } from '../components/shared/Tag'; 

interface FeatureManagementPageProps {
  tasks: ManagedTask[];
  currentUser: UserProfile | null; 
  onUpdateTask: (updatedTask: ManagedTask) => Promise<void>; 
  onAddTask: (
    newTaskData: Omit<ManagedTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'next_reset_timestamp' | 'last_completion_timestamp'>
  ) => Promise<ManagedTask | null>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onToggleComplete: (taskId: string, subTaskTitle?: string) => Promise<void>;
  globalTagDefinitions: GlobalTag[];
  onAddGlobalTag: (text: string) => void;
  onDeleteGlobalTag: (text: string) => void;
  onLogout: () => void;
}

const initialFilters: TaskFilters = {
  category: "",
  tags: [],
  searchText: "",
  showCompleted: false, 
};

export const FeatureManagementPage: React.FC<FeatureManagementPageProps> = ({ 
    tasks, 
    currentUser, 
    onUpdateTask, 
    onAddTask,
    onDeleteTask,
    onToggleComplete,
    globalTagDefinitions,
    onAddGlobalTag,
    onDeleteGlobalTag,
    onLogout
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ManagedTask | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  const [sortOption, setSortOption] = useState<TaskSortOption>(TaskSortOption.DEFAULT);
  const [newGlobalTagText, setNewGlobalTagText] = useState('');
  const [isManageTagsVisible, setIsManageTagsVisible] = useState(false);

  const handleFilterChange = useCallback(<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSortOption(TaskSortOption.DEFAULT); 
  }, []);

  const handleAddGlobalTag = () => {
    if (newGlobalTagText.trim()) {
      onAddGlobalTag(newGlobalTagText.trim());
      setNewGlobalTagText('');
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let processedTasks = [...tasks];
    if (!filters.showCompleted) {
        processedTasks = processedTasks.filter(task => !task.is_completed);
    }
    if (filters.searchText) {
      const searchTextLower = filters.searchText.toLowerCase();
      processedTasks = processedTasks.filter(task =>
        task.title.toLowerCase().includes(searchTextLower) ||
        task.description.toLowerCase().includes(searchTextLower)
      );
    }
    if (filters.category) {
      processedTasks = processedTasks.filter(task => task.category === filters.category);
    }
    if (filters.tags.length > 0) {
      processedTasks = processedTasks.filter(task =>
        filters.tags.every(filterTag => task.tags && task.tags.includes(filterTag))
      );
    }
    processedTasks.sort((a, b) => {
      if (sortOption === TaskSortOption.DEFAULT) {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1; 
        const nextA = a.next_reset_timestamp ? new Date(a.next_reset_timestamp).getTime() : Infinity;
        const nextB = b.next_reset_timestamp ? new Date(b.next_reset_timestamp).getTime() : Infinity;
        if (!a.is_completed && !b.is_completed) { 
            if (nextA !== nextB) return nextA - nextB;
        }
        return (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0); 
      }
      switch (sortOption) {
        case TaskSortOption.CREATED_AT_ASC:
          return (new Date(a.created_at).getTime() || 0) - (new Date(b.created_at).getTime() || 0);
        case TaskSortOption.TITLE_ASC:
          return a.title.localeCompare(b.title);
        case TaskSortOption.TITLE_DESC:
          return b.title.localeCompare(a.title);
        case TaskSortOption.NEXT_RESET_ASC:
          const nextA = a.next_reset_timestamp ? new Date(a.next_reset_timestamp).getTime() : Infinity;
          const nextB = b.next_reset_timestamp ? new Date(b.next_reset_timestamp).getTime() : Infinity;
          if (a.is_completed && !b.is_completed) return 1; 
          if (!a.is_completed && b.is_completed) return -1;
          return nextA - nextB;
        case TaskSortOption.CREATED_AT_DESC:
        default:
          return (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0);
      }
    });
    return processedTasks;
  }, [tasks, filters, sortOption]);

  const handleSaveTask = async (taskDataFromForm: ManagedTask) => {
    if (editingTask) {
      await onUpdateTask(taskDataFromForm);
    } else {
       const { id, user_id, created_at, updated_at, next_reset_timestamp, last_completion_timestamp, ...newManagedTaskData } = taskDataFromForm;
      await onAddTask(newManagedTaskData);
    }
    setEditingTask(null);
    setIsFormOpen(false);
  };

  const openAddTaskForm = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const openEditTaskForm = (task: ManagedTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Sumber Rejeki</h1>
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="text-sm text-base-content-secondary hidden md:block">
              Welcome, <span className="font-semibold text-base-content">{currentUser.username}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            title="Logout"
            className="p-2.5 rounded-lg text-base-content-secondary hover:bg-base-300/70 hover:text-error focus:outline-none focus:ring-2 focus:ring-base-300"
            aria-label="Logout"
            >
            <ArrowLeftOnRectangleIcon className="w-5 h-5"/>
          </button>
          <button
            onClick={openAddTaskForm}
            className="w-auto bg-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-focus flex items-center justify-center shadow-md transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-opacity-50"
          >
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            Add New Task
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 bg-base-200/80 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-primary">Manage System Tags</h2>
            <button 
                onClick={() => setIsManageTagsVisible(!isManageTagsVisible)}
                className="p-1 text-base-content-secondary hover:text-primary focus:outline-none"
                aria-label={isManageTagsVisible ? "Hide system tag management" : "Show system tag management"}
            >
                {isManageTagsVisible ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
        </div>

        {isManageTagsVisible && (
            <div className="animate-fade-in">
                <div className="flex flex-wrap gap-2 mb-3">
                {globalTagDefinitions.map(tagDef => (
                    <div key={tagDef.text} className="flex items-center">
                    <Tag text={tagDef.text} colorClasses={tagDef.colorClasses} />
                    <button 
                        onClick={() => onDeleteGlobalTag(tagDef.text)} 
                        className="ml-1 p-0.5 text-error/70 hover:text-error focus:outline-none"
                        aria-label={`Delete tag ${tagDef.text}`}
                    >
                        <TrashIcon className="w-3.5 h-3.5"/>
                    </button>
                    </div>
                ))}
                </div>
                <div className="flex gap-2">
                <input 
                    type="text"
                    value={newGlobalTagText}
                    onChange={(e) => setNewGlobalTagText(e.target.value)}
                    placeholder="New system tag name"
                    className="flex-grow bg-base-100 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
                <button onClick={handleAddGlobalTag} className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary-focus focus:outline-none">
                    Add Tag
                </button>
                </div>
                {globalTagDefinitions.length === 0 && <p className="text-xs text-base-content-secondary mt-2">No system tags defined. Add some to use them in tasks and filters.</p>}
            </div>
        )}
      </div>

      <FilterControlsFM
        filters={filters}
        onFilterChange={handleFilterChange}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onClearFilters={handleClearFilters}
        showCompleted={filters.showCompleted}
        onShowCompletedChange={(show) => handleFilterChange('showCompleted', show)}
        globalTagDefinitions={globalTagDefinitions}
      />

      {filteredAndSortedTasks.length === 0 ? (
         <div className="text-center py-10 text-base-content-secondary rounded-lg bg-base-200/50 p-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-base-content-secondary/50">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <p className="text-xl">No tasks found.</p>
            <p className="text-sm mt-1">
                {filters.searchText || filters.category || filters.tags.length > 0 
                    ? "Try adjusting your search or filter criteria." 
                    : "Get started by adding a new task!"}
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredAndSortedTasks.map(task => (
            <div key={task.id} className="relative group/taskitem">
                <TaskItem task={task} onToggleComplete={onToggleComplete} globalTagDefinitions={globalTagDefinitions} />
                <div className="absolute top-5 right-14 opacity-0 group-hover/taskitem:opacity-100 transition-opacity flex items-center gap-2"> {/* Adjusted top to top-5 */}
                    <button onClick={() => openEditTaskForm(task)} className="p-1.5 bg-base-300/70 hover:bg-secondary rounded-full text-secondary-content hover:text-white focus:outline-none" title="Edit Task">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                    </button>
                    <button onClick={() => onDeleteTask(task.id)} className="p-1.5 bg-base-300/70 hover:bg-error rounded-full text-error-content hover:text-white focus:outline-none" title="Delete Task">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c-.34-.059-.68-.114-1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                </div>
            </div>
          ))}
        </div>
      )}

      <TaskForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        existingData={editingTask}
        globalTagDefinitions={globalTagDefinitions}
      />
    </div>
  );
};
