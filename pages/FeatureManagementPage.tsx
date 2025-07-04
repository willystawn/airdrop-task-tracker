import React, { useState, useMemo, useCallback } from 'react';
import { ManagedTask, TaskFilters, TaskSortOption, UserProfile, GlobalTag } from '../types';
import { TaskItem } from '../components/feature-management/TaskItem';
import { TaskForm } from '../components/feature-management/TaskForm';
import { FilterControlsFM } from '../components/feature-management/FilterControlsFM';
import { PlusCircleIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, ArrowLeftOnRectangleIcon, PencilSquareIcon, XMarkIcon } from '../components/shared/icons/HeroIcons';
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

const DiamondIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.0001 23.3137L3.9292 13.0435C3.33934 12.2882 3.00006 11.3787 3.00006 10.4357V4.71795C3.00006 3.96428 3.51868 3.29413 4.24271 3.12581L11.2427 1.3401C11.7246 1.22129 12.2756 1.22129 12.7575 1.3401L19.7575 3.12581C20.4815 3.29413 21.0001 3.96428 21.0001 4.71795V10.4357C21.0001 11.3787 20.6608 12.2882 20.0709 13.0435L12.0001 23.3137Z" />
    </svg>
);

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
        (task.description && task.description.toLowerCase().includes(searchTextLower))
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
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-base-300/50 gap-4">
        <div className="flex items-center gap-3">
            <DiamondIcon className="w-9 h-9 text-primary"/>
            <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
                Airdrop Task Tracker
            </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAddTaskForm}
            className="w-auto bg-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-focus flex items-center justify-center shadow-lg transition-all hover:shadow-glow-primary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-opacity-50"
          >
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            New Task
          </button>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-2.5 rounded-lg text-base-content-secondary hover:bg-base-200 hover:text-error focus:outline-none focus:ring-2 focus:ring-base-300"
            aria-label="Logout"
            >
            <ArrowLeftOnRectangleIcon className="w-5 h-5"/>
          </button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column for controls */}
        <aside className="md:col-span-1 md:sticky md:top-6 self-start">
            <div className="space-y-6 max-h-[calc(100vh-48px)] overflow-y-auto pr-2">
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

                <div className="p-4 bg-base-200/50 border border-base-300/30 rounded-lg shadow">
                    <button
                        onClick={() => setIsManageTagsVisible(!isManageTagsVisible)}
                        className="w-full flex justify-between items-center mb-3 group"
                    >
                        <h2 className="text-lg font-semibold text-base-content group-hover:text-primary transition-colors">Manage Tags</h2>
                        {isManageTagsVisible ? <ChevronUpIcon className="w-5 h-5 text-base-content-secondary group-hover:text-primary" /> : <ChevronDownIcon className="w-5 h-5 text-base-content-secondary group-hover:text-primary" />}
                    </button>

                    {isManageTagsVisible && (
                        <div className="animate-fade-in space-y-4">
                            <div className="flex flex-wrap gap-2">
                            {globalTagDefinitions.map(tagDef => (
                                <div key={tagDef.text} className="flex items-center bg-base-100/50 rounded-full">
                                <Tag text={tagDef.text} colorClasses={tagDef.colorClasses} />
                                <button 
                                    onClick={() => onDeleteGlobalTag(tagDef.text)} 
                                    className="ml-1 mr-2 p-0.5 text-error/70 hover:text-error focus:outline-none"
                                    aria-label={`Delete tag ${tagDef.text}`}
                                >
                                    <XMarkIcon className="w-3.5 h-3.5"/>
                                </button>
                                </div>
                            ))}
                            </div>
                            <div className="flex gap-2">
                            <input 
                                type="text"
                                value={newGlobalTagText}
                                onChange={(e) => setNewGlobalTagText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGlobalTag(); } }}
                                placeholder="New tag name..."
                                className="flex-grow bg-base-100 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                            <button onClick={handleAddGlobalTag} className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary-focus focus:outline-none text-sm">
                                Add
                            </button>
                            </div>
                            {globalTagDefinitions.length === 0 && <p className="text-xs text-base-content-secondary mt-2">No system tags defined. Add one to get started.</p>}
                        </div>
                    )}
                </div>
            </div>
        </aside>

        {/* Right column for tasks */}
        <div className="md:col-span-2">
            {filteredAndSortedTasks.length === 0 ? (
                <div className="text-center py-16 text-base-content-secondary rounded-lg bg-base-200/50 border border-base-300/30 p-6 flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-base-content-secondary/30">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                    </svg>
                    <p className="text-xl font-semibold">No tasks found.</p>
                    <p className="text-sm mt-2">
                        {filters.searchText || filters.category || filters.tags.length > 0 
                            ? "Try adjusting your search or filter criteria." 
                            : "Click 'New Task' to get started!"}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                {filteredAndSortedTasks.map(task => (
                    <div key={task.id} className="relative group/taskitem">
                        <TaskItem task={task} onToggleComplete={onToggleComplete} globalTagDefinitions={globalTagDefinitions} />
                        <div className="absolute top-4 right-4 opacity-0 group-hover/taskitem:opacity-100 transition-opacity flex items-center gap-2 z-10">
                            <button onClick={() => openEditTaskForm(task)} className="p-2 bg-base-300/80 hover:bg-secondary rounded-full text-base-content hover:text-white focus:outline-none backdrop-blur-sm" title="Edit Task">
                                <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDeleteTask(task.id)} className="p-2 bg-base-300/80 hover:bg-error rounded-full text-base-content hover:text-white focus:outline-none backdrop-blur-sm" title="Delete Task">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </div>
      </div>


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