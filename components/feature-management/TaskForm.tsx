import React, { useState, useEffect } from 'react';
import { ManagedTask, TaskResetCategory, WeekDays, FormComponentProps, SubTask, GlobalTag } from '../../types';
import { Modal } from '../shared/Modal';
import { Tag } from '../shared/Tag';
import { PlusCircleIcon, TrashIcon, PencilSquareIcon, CheckCircleIcon as SaveIcon, XMarkIcon as CancelIcon } from '../shared/icons/HeroIcons'; 
import { calculateNextResetTimestamp, toSupabaseDate, parseSupabaseDate } from '../../services/utils';

const initialFormStateOmit: Omit<ManagedTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'next_reset_timestamp' | 'last_completion_timestamp'> = {
  title: '',
  description: '',
  logo_url: '',
  is_completed: false,
  category: TaskResetCategory.DAILY,
  specific_reset_days: [],
  specific_reset_hours: null,
  tags: [],
  sub_tasks: [],
};

const DEFAULT_TAG_COLOR = "bg-neutral text-base-content";

export const TaskForm: React.FC<FormComponentProps<ManagedTask> & { globalTagDefinitions: GlobalTag[] }> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    existingData: existingTask, 
    globalTagDefinitions
}) => {
  const [taskData, setTaskData] = useState(initialFormStateOmit);
  const [currentTagInput, setCurrentTagInput] = useState('');
  
  // State for adding a new sub-task
  const [currentSubTaskTitle, setCurrentSubTaskTitle] = useState('');
  const [currentSubTaskCategory, setCurrentSubTaskCategory] = useState<TaskResetCategory | "">("");
  const [currentSubTaskHours, setCurrentSubTaskHours] = useState<number | null>(null);
  const [currentSubTaskSpecificDays, setCurrentSubTaskSpecificDays] = useState<number[]>([]);

  // State for editing an existing sub-task
  const [editingSubTask, setEditingSubTask] = useState<{ 
    index: number; 
    title: string; 
    category: TaskResetCategory | "";
    hours: number | null;
    specific_days: number[] | null; // For specific days
  } | null>(null);

  useEffect(() => {
    if (existingTask && isOpen) { 
      setTaskData({
        title: existingTask.title,
        description: existingTask.description,
        logo_url: existingTask.logo_url || '',
        is_completed: existingTask.is_completed, 
        category: existingTask.category,
        specific_reset_days: existingTask.specific_reset_days || [],
        specific_reset_hours: existingTask.specific_reset_hours || null,
        tags: existingTask.tags || [],
        sub_tasks: (existingTask.sub_tasks || []).map(st => ({ 
            ...st, 
            category: st.category || "",
            specific_reset_hours: st.specific_reset_hours || null,
            specific_reset_days: st.specific_reset_days || [], // Ensure default
            last_completion_timestamp: st.last_completion_timestamp,
            next_reset_timestamp: st.next_reset_timestamp,
        })),
      });
    } else if (!existingTask && isOpen) { 
      setTaskData(initialFormStateOmit);
    }
    // Reset sub-task input fields
    setCurrentTagInput('');
    setCurrentSubTaskTitle('');
    setCurrentSubTaskCategory("");
    setCurrentSubTaskHours(null);
    setCurrentSubTaskSpecificDays([]);
    setEditingSubTask(null); 
  }, [existingTask, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === "specific_reset_hours") {
        setTaskData(prev => ({ ...prev, [name]: value ? parseInt(value, 10) : null }));
    } else if (name === "category") {
        const newCategory = value as TaskResetCategory;
        setTaskData(prev => ({
            ...prev,
            category: newCategory,
            specific_reset_days: newCategory === TaskResetCategory.SPECIFIC_DAY ? prev.specific_reset_days : [],
            specific_reset_hours: newCategory === TaskResetCategory.SPECIFIC_HOURS ? prev.specific_reset_hours : null,
        }));
    } else {
        setTaskData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDayToggle = (dayId: number) => {
    setTaskData(prev => {
      const currentDays = prev.specific_reset_days || [];
      const newDays = currentDays.includes(dayId)
        ? currentDays.filter(d => d !== dayId)
        : [...currentDays, dayId];
      return { ...prev, specific_reset_days: newDays.sort((a,b) => a-b) };
    });
  };

  const handleSubTaskDayToggle = (dayId: number, isEditing: boolean) => {
    if (isEditing && editingSubTask) {
        setEditingSubTask(prev => {
            if (!prev) return null;
            const currentDays = prev.specific_days || [];
            const newDays = currentDays.includes(dayId)
                ? currentDays.filter(d => d !== dayId)
                : [...currentDays, dayId];
            return { ...prev, specific_days: newDays.sort((a,b) => a-b) };
        });
    } else {
        setCurrentSubTaskSpecificDays(prev => {
            const newDays = prev.includes(dayId)
                ? prev.filter(d => d !== dayId)
                : [...prev, dayId];
            return newDays.sort((a,b) => a-b);
        });
    }
  };


  const handleTagAdd = (tagText: string) => {
    const newTag = tagText.trim();
    if (newTag && !taskData.tags.includes(newTag) && taskData.tags.length < 10) {
      setTaskData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
    }
    setCurrentTagInput('');
  };

  const handleTagRemove = (tagToRemove: string) => {
    setTaskData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const handleAddSubTask = () => {
    const title = currentSubTaskTitle.trim();
    if (!title) return;

    if (currentSubTaskCategory === TaskResetCategory.SPECIFIC_HOURS && (!currentSubTaskHours || currentSubTaskHours <= 0)) {
        alert("For 'Specific Hours' sub-task category, 'Hours' must be a positive number.");
        return;
    }
    if (currentSubTaskCategory === TaskResetCategory.SPECIFIC_DAY && currentSubTaskSpecificDays.length === 0) {
        alert("For 'Specific Day' sub-task category, at least one day must be selected.");
        return;
    }


    let nextResetTimeSubTask: string | null = null;
    if (currentSubTaskCategory) {
        nextResetTimeSubTask = toSupabaseDate(calculateNextResetTimestamp(
            currentSubTaskCategory, 
            currentSubTaskCategory === TaskResetCategory.SPECIFIC_DAY ? currentSubTaskSpecificDays : undefined,
            Date.now(), 
            false, 
            currentSubTaskCategory === TaskResetCategory.SPECIFIC_HOURS ? currentSubTaskHours : undefined
        ));
    }

    const newSubTask: SubTask = { 
        title, 
        isCompleted: false, 
        category: currentSubTaskCategory,
        specific_reset_hours: currentSubTaskCategory === TaskResetCategory.SPECIFIC_HOURS ? currentSubTaskHours : null,
        specific_reset_days: currentSubTaskCategory === TaskResetCategory.SPECIFIC_DAY ? currentSubTaskSpecificDays : [],
        last_completion_timestamp: null,
        next_reset_timestamp: nextResetTimeSubTask,
    };
    setTaskData(prev => ({
        ...prev,
        sub_tasks: [...(prev.sub_tasks || []), newSubTask]
    }));
    setCurrentSubTaskTitle('');
    setCurrentSubTaskCategory("");
    setCurrentSubTaskHours(null);
    setCurrentSubTaskSpecificDays([]);
  };

  const handleRemoveSubTask = (indexToRemove: number) => {
    setTaskData(prev => ({
        ...prev,
        sub_tasks: (prev.sub_tasks || []).filter((_, index) => index !== indexToRemove)
    }));
    if (editingSubTask?.index === indexToRemove) {
        setEditingSubTask(null);
    }
  };
  
  const handleEditSubTask = (index: number) => {
    const subTask = (taskData.sub_tasks || [])[index];
    setEditingSubTask({ 
        index, 
        title: subTask.title, 
        category: subTask.category || "",
        hours: subTask.specific_reset_hours || null,
        specific_days: subTask.specific_reset_days || [],
    });
  };

  const handleSaveEditedSubTask = () => {
    if (editingSubTask && editingSubTask.title.trim()) {
      if (editingSubTask.category === TaskResetCategory.SPECIFIC_HOURS && (!editingSubTask.hours || editingSubTask.hours <= 0)) {
          alert("For 'Specific Hours' sub-task category, 'Hours' must be a positive number.");
          return;
      }
      if (editingSubTask.category === TaskResetCategory.SPECIFIC_DAY && (!editingSubTask.specific_days || editingSubTask.specific_days.length === 0)) {
          alert("For 'Specific Day' sub-task category, at least one day must be selected.");
          return;
      }

      const updatedSubTasks = [...(taskData.sub_tasks || [])];
      const subTaskToUpdate = updatedSubTasks[editingSubTask.index];

      subTaskToUpdate.title = editingSubTask.title.trim();
      const oldCategory = subTaskToUpdate.category;
      const oldHours = subTaskToUpdate.specific_reset_hours;
      const oldSpecificDays = subTaskToUpdate.specific_reset_days;

      subTaskToUpdate.category = editingSubTask.category;
      subTaskToUpdate.specific_reset_hours = editingSubTask.category === TaskResetCategory.SPECIFIC_HOURS ? editingSubTask.hours : null;
      subTaskToUpdate.specific_reset_days = editingSubTask.category === TaskResetCategory.SPECIFIC_DAY ? editingSubTask.specific_days : [];


      if (oldCategory !== editingSubTask.category || 
          (editingSubTask.category === TaskResetCategory.SPECIFIC_HOURS && oldHours !== editingSubTask.hours) ||
          (editingSubTask.category === TaskResetCategory.SPECIFIC_DAY && JSON.stringify(oldSpecificDays) !== JSON.stringify(editingSubTask.specific_days)) ||
          (editingSubTask.category && !subTaskToUpdate.next_reset_timestamp)) { 
          
          if (editingSubTask.category) {
              let baseTimestampForCalc: number;
              if (subTaskToUpdate.isCompleted && subTaskToUpdate.last_completion_timestamp) {
                  const parsedTs = parseSupabaseDate(subTaskToUpdate.last_completion_timestamp);
                  baseTimestampForCalc = parsedTs !== undefined ? parsedTs : Date.now();
              } else {
                  baseTimestampForCalc = Date.now();
              }
              
              subTaskToUpdate.next_reset_timestamp = toSupabaseDate(calculateNextResetTimestamp(
                  editingSubTask.category, 
                  editingSubTask.category === TaskResetCategory.SPECIFIC_DAY ? editingSubTask.specific_days : undefined, 
                  baseTimestampForCalc, 
                  subTaskToUpdate.isCompleted,
                  editingSubTask.category === TaskResetCategory.SPECIFIC_HOURS ? editingSubTask.hours : undefined
              ));
          } else { 
              subTaskToUpdate.next_reset_timestamp = null;
              subTaskToUpdate.last_completion_timestamp = null;
              subTaskToUpdate.specific_reset_hours = null;
              subTaskToUpdate.specific_reset_days = [];
          }
      }
      
      setTaskData(prev => ({ ...prev, sub_tasks: updatedSubTasks }));
      setEditingSubTask(null);
    } else if (editingSubTask) {
        alert("Sub-task title cannot be empty.");
    }
  };

  const handleCancelEditSubTask = () => {
    setEditingSubTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskData.title) {
        alert("Title is required.");
        return;
    }
    if (taskData.category === TaskResetCategory.SPECIFIC_HOURS && (!taskData.specific_reset_hours || taskData.specific_reset_hours <= 0)) {
        alert("Please enter a valid number of hours (greater than 0) for the 'Specific Hours' category.");
        return;
    }
     if (taskData.category === TaskResetCategory.SPECIFIC_DAY && (!taskData.specific_reset_days || taskData.specific_reset_days.length === 0)) {
        alert("Please select at least one day for the 'Specific Day' category.");
        return;
    }
    if (editingSubTask) {
        alert("Please save or cancel the sub-task you are currently editing before saving the main task.");
        return;
    }

    const completeTaskData: ManagedTask = {
      id: existingTask?.id || '', 
      user_id: existingTask?.user_id || '', 
      created_at: existingTask?.created_at || '', 
      updated_at: '', 
      next_reset_timestamp: existingTask?.next_reset_timestamp, 
      last_completion_timestamp: existingTask?.last_completion_timestamp, 
      ...taskData, 
      specific_reset_days: taskData.category === TaskResetCategory.SPECIFIC_DAY ? taskData.specific_reset_days : [],
      specific_reset_hours: taskData.category === TaskResetCategory.SPECIFIC_HOURS ? taskData.specific_reset_hours : null,
      sub_tasks: (taskData.sub_tasks || []).map(st => ({
          ...st, 
          category: st.category || undefined, 
          specific_reset_hours: st.category === TaskResetCategory.SPECIFIC_HOURS ? st.specific_reset_hours : null,
          specific_reset_days: st.category === TaskResetCategory.SPECIFIC_DAY ? st.specific_reset_days : [],
          last_completion_timestamp: st.last_completion_timestamp,
          next_reset_timestamp: st.next_reset_timestamp,
      })),
    };
    try {
        await onSave(completeTaskData); 
        onClose(); 
    } catch (error) {
        console.error("Failed to save task:", error);
        alert("Failed to save task. See console for details."); 
    }
  };
  
  const getTagColor = (tagText: string) => {
    const found = globalTagDefinitions.find(gtd => gtd.text === tagText);
    return found ? found.colorClasses : DEFAULT_TAG_COLOR;
  }

  const isSaveDisabled = () => {
    if (editingSubTask) {
        if (editingSubTask.category === TaskResetCategory.SPECIFIC_HOURS && (!editingSubTask.hours || editingSubTask.hours <= 0)) return true;
        if (editingSubTask.category === TaskResetCategory.SPECIFIC_DAY && (!editingSubTask.specific_days || editingSubTask.specific_days.length === 0)) return true;
        return false; // No, can save subtask
    }
    if (taskData.category === TaskResetCategory.SPECIFIC_HOURS && (!taskData.specific_reset_hours || taskData.specific_reset_hours <= 0)) return true;
    if (taskData.category === TaskResetCategory.SPECIFIC_DAY && (!taskData.specific_reset_days || taskData.specific_reset_days.length === 0)) return true;
    
    if (currentSubTaskTitle.trim() !== '') { // If adding a new sub-task
        if (currentSubTaskCategory === TaskResetCategory.SPECIFIC_HOURS && (!currentSubTaskHours || currentSubTaskHours <= 0)) return true;
        if (currentSubTaskCategory === TaskResetCategory.SPECIFIC_DAY && currentSubTaskSpecificDays.length === 0) return true;
    }
    return false;
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingTask ? "Edit Task" : "Add New Task"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-2">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-base-content-secondary">Title</label>
          <input type="text" name="title" id="title" value={taskData.title} onChange={handleChange} required
                 className="mt-1 block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-base-content-secondary">Description (URLs &amp; [text](url) will be clickable)</label>
          <textarea name="description" id="description" value={taskData.description} onChange={handleChange} rows={5}
                    className="mt-1 block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
        <div>
          <label htmlFor="logo_url" className="block text-sm font-medium text-base-content-secondary">Logo URL (Optional)</label>
          <input type="url" name="logo_url" id="logo_url" value={taskData.logo_url || ''} onChange={handleChange}
                 className="mt-1 block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-base-content-secondary">Reset Category</label>
          <select name="category" id="category" value={taskData.category} onChange={handleChange}
                  className="mt-1 block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm appearance-none">
            {Object.values(TaskResetCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {taskData.category === TaskResetCategory.SPECIFIC_HOURS && (
          <div>
            <label htmlFor="specific_reset_hours" className="block text-sm font-medium text-base-content-secondary">Reset Every (Hours)</label>
            <input 
                type="number" 
                name="specific_reset_hours" 
                id="specific_reset_hours" 
                value={taskData.specific_reset_hours || ''} 
                onChange={handleChange}
                min="1"
                placeholder="e.g., 3 for every 3 hours"
                className="mt-1 block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" 
            />
             {(!taskData.specific_reset_hours || taskData.specific_reset_hours <= 0) && (
                <p className="text-xs text-error mt-1">Hours must be a positive number.</p>
            )}
          </div>
        )}

        {taskData.category === TaskResetCategory.SPECIFIC_DAY && (
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Reset on Specific Days (WIB Midnight)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1">
              {WeekDays.map(day => (
                <label key={day.id} className="flex items-center space-x-2 p-2 bg-base-200 border border-base-300 rounded-md hover:bg-base-300/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(taskData.specific_reset_days || []).includes(day.id)}
                    onChange={() => handleDayToggle(day.id)}
                    className="form-checkbox h-4 w-4 text-primary rounded border-neutral focus:ring-primary"
                  />
                  <span className="text-sm text-base-content">{day.name}</span>
                </label>
              ))}
            </div>
             {(!taskData.specific_reset_days || taskData.specific_reset_days.length === 0) && (
                <p className="text-xs text-error mt-1">At least one day must be selected.</p>
            )}
          </div>
        )}
        <div>
            <label className="block text-sm font-medium text-base-content-secondary">Tags (max 10)</label>
            <div className="mt-1 flex flex-wrap gap-2 items-center min-h-[38px] p-1 border border-transparent">
                {taskData.tags.map(tagText => (
                    <Tag 
                        key={tagText} 
                        text={tagText} 
                        colorClasses={getTagColor(tagText)}
                        onClick={() => handleTagRemove(tagText)} 
                        className="cursor-pointer !py-0.5 !px-1.5 !text-xs"
                    />
                ))}
            </div>
            {taskData.tags.length < 10 && (
                <div className="mt-2 flex">
                    <input 
                        type="text" 
                        value={currentTagInput}
                        onChange={(e) => setCurrentTagInput(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleTagAdd(currentTagInput);}}}
                        placeholder="Add a new tag and press Enter"
                        className="flex-grow bg-base-200 border border-base-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" 
                    />
                    <button type="button" onClick={() => handleTagAdd(currentTagInput)} className="bg-primary text-white px-3 py-2 rounded-r-md hover:bg-primary-focus focus:outline-none">Add</button>
                </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
                {globalTagDefinitions
                    .filter(gtd => !taskData.tags.includes(gtd.text) && taskData.tags.length < 10)
                    .slice(0, 10) 
                    .map(gtd => (
                        <Tag
                            key={gtd.text}
                            text={gtd.text}
                            colorClasses={gtd.colorClasses}
                            onClick={() => handleTagAdd(gtd.text)}
                            className="cursor-pointer !text-xs opacity-80 hover:opacity-100"
                        />
                ))}
            </div>
        </div>

        {/* Sub-tasks Section */}
        <div className="pt-4 border-t border-base-300">
            <h3 className="text-md font-semibold text-base-content mb-2">Sub-tasks (titles/descriptions can use [text](url) format)</h3>
            <div className="space-y-3">
                {(taskData.sub_tasks || []).map((subTask, index) => (
                    <div key={index} className={`p-3 rounded-md border ${editingSubTask?.index === index ? 'bg-base-300/50 border-primary' : 'bg-base-100/70 border-base-300/70'}`}>
                        {editingSubTask?.index === index ? (
                            // Editing Sub-task Form
                            <div className="space-y-2">
                                <textarea
                                    value={editingSubTask.title}
                                    onChange={(e) => setEditingSubTask({ ...editingSubTask!, title: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEditedSubTask(); } else if (e.key === 'Escape') { handleCancelEditSubTask();}}}
                                    className="block w-full bg-base-100 border border-primary rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                    rows={2} autoFocus placeholder="Sub-task title/description"
                                />
                                 <select 
                                    value={editingSubTask.category} 
                                    onChange={(e) => {
                                        const newCat = e.target.value as TaskResetCategory | "";
                                        setEditingSubTask({...editingSubTask!, category: newCat, 
                                            hours: newCat === TaskResetCategory.SPECIFIC_HOURS ? editingSubTask!.hours : null,
                                            specific_days: newCat === TaskResetCategory.SPECIFIC_DAY ? (editingSubTask!.specific_days || []) : []
                                        });
                                    }}
                                    className="block w-full bg-base-100 border border-primary rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm appearance-none text-xs"
                                >
                                    <option value="">No Category (Resets with Parent)</option>
                                    {Object.values(TaskResetCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                {editingSubTask.category === TaskResetCategory.SPECIFIC_HOURS && (
                                     <input 
                                        type="number" 
                                        value={editingSubTask.hours || ''} 
                                        onChange={(e) => setEditingSubTask({...editingSubTask!, hours: e.target.value ? parseInt(e.target.value, 10) : null})}
                                        min="1" placeholder="e.g., 3 (hours)"
                                        className="block w-full bg-base-100 border border-primary rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-xs" 
                                    />
                                )}
                                {editingSubTask.category === TaskResetCategory.SPECIFIC_HOURS && (!editingSubTask.hours || editingSubTask.hours <=0) && (
                                    <p className="text-xs text-error">Hours must be a positive number.</p>
                                )}
                                {editingSubTask.category === TaskResetCategory.SPECIFIC_DAY && (
                                    <div className="space-y-1">
                                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 mt-1">
                                          {WeekDays.map(day => (
                                              <label key={`edit-subtask-day-${day.id}`} className="flex items-center space-x-1 p-1 bg-base-100/50 border border-primary/50 rounded-md hover:bg-primary/10 cursor-pointer text-xs">
                                                  <input type="checkbox" checked={(editingSubTask.specific_days || []).includes(day.id)} onChange={() => handleSubTaskDayToggle(day.id, true)} className="form-checkbox h-3 w-3 text-primary rounded border-neutral-focus focus:ring-primary"/>
                                                  <span>{day.name.substring(0,3)}</span>
                                              </label>
                                          ))}
                                      </div>
                                      {(!editingSubTask.specific_days || editingSubTask.specific_days.length === 0) && (
                                        <p className="text-xs text-error">At least one day must be selected.</p>
                                      )}
                                    </div>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={handleSaveEditedSubTask} className="p-1.5 text-success hover:text-success-focus focus:outline-none rounded-md bg-base-200 hover:bg-success/20" title="Save Sub-task"><SaveIcon className="w-5 h-5"/></button>
                                    <button type="button" onClick={handleCancelEditSubTask} className="p-1.5 text-neutral-content hover:opacity-70 focus:outline-none rounded-md bg-base-200 hover:bg-neutral/30" title="Cancel Edit"><CancelIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ) : (
                            // Displaying Sub-task
                            <div className="flex items-start justify-between">
                                <div className="text-sm text-base-content-secondary flex-grow pr-2">
                                  <p className="whitespace-pre-wrap break-all">{subTask.title}</p>
                                  {subTask.category && (
                                    <p className="text-xs text-base-content-secondary/70 mt-0.5">
                                        {subTask.category}
                                        {subTask.category === TaskResetCategory.SPECIFIC_HOURS && subTask.specific_reset_hours && ` (Every ${subTask.specific_reset_hours}h)`}
                                        {subTask.category === TaskResetCategory.SPECIFIC_DAY && subTask.specific_reset_days && subTask.specific_reset_days.length > 0 && 
                                            ` (${subTask.specific_reset_days.map(d => WeekDays.find(wd => wd.id === d)?.name.substring(0,3)).filter(Boolean).join(', ')})`
                                        }
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button type="button" onClick={() => handleEditSubTask(index)} className="p-1 text-secondary hover:text-secondary-focus focus:outline-none" title="Edit Sub-task"><PencilSquareIcon className="w-4 h-4"/></button>
                                    <button type="button" onClick={() => handleRemoveSubTask(index)} className="p-1 text-error hover:text-error-focus focus:outline-none" title="Remove Sub-task"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
             {/* Add New Sub-task Form */}
            {editingSubTask === null && (
              <div className="mt-4 p-3 border border-dashed border-base-300 rounded-md space-y-2">
                  <textarea
                      value={currentSubTaskTitle}
                      onChange={(e) => setCurrentSubTaskTitle(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddSubTask();}}}
                      placeholder="Enter sub-task title/description (Shift+Enter for new line)"
                      className="block w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      rows={2}
                  />
                  <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <div className="flex-grow w-full space-y-1.5">
                        <select 
                            value={currentSubTaskCategory} 
                            onChange={(e) => {
                                const newCat = e.target.value as TaskResetCategory | "";
                                setCurrentSubTaskCategory(newCat);
                                if (newCat !== TaskResetCategory.SPECIFIC_HOURS) setCurrentSubTaskHours(null);
                                if (newCat !== TaskResetCategory.SPECIFIC_DAY) setCurrentSubTaskSpecificDays([]);
                            }}
                            className="w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm appearance-none text-xs"
                        >
                            <option value="">No Category (Resets with Parent)</option>
                            {Object.values(TaskResetCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        {currentSubTaskCategory === TaskResetCategory.SPECIFIC_HOURS && (
                            <input
                                type="number" value={currentSubTaskHours || ''}
                                onChange={(e) => setCurrentSubTaskHours(e.target.value ? parseInt(e.target.value, 10) : null)}
                                min="1" placeholder="Hours (e.g., 3)"
                                className="w-full bg-base-200 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-xs"
                            />
                        )}
                         {currentSubTaskCategory === TaskResetCategory.SPECIFIC_HOURS && currentSubTaskTitle.trim() !== '' && (!currentSubTaskHours || currentSubTaskHours <=0) && (
                            <p className="text-xs text-error">Hours must be a positive number.</p>
                        )}
                        {currentSubTaskCategory === TaskResetCategory.SPECIFIC_DAY && (
                             <div className="space-y-1">
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 mt-1">
                                    {WeekDays.map(day => (
                                        <label key={`add-subtask-day-${day.id}`} className="flex items-center space-x-1 p-1 bg-base-200 border border-base-300 rounded-md hover:bg-primary/10 cursor-pointer text-xs">
                                            <input type="checkbox" checked={currentSubTaskSpecificDays.includes(day.id)} onChange={() => handleSubTaskDayToggle(day.id, false)} className="form-checkbox h-3 w-3 text-primary rounded border-neutral-focus focus:ring-primary"/>
                                            <span>{day.name.substring(0,3)}</span>
                                        </label>
                                    ))}
                                </div>
                                {currentSubTaskCategory === TaskResetCategory.SPECIFIC_DAY && currentSubTaskTitle.trim() !== '' && currentSubTaskSpecificDays.length === 0 && (
                                    <p className="text-xs text-error">At least one day must be selected.</p>
                                )}
                            </div>
                        )}
                    </div>
                    <button 
                        type="button" onClick={handleAddSubTask} 
                        className="w-full mt-2 sm:mt-0 sm:w-auto sm:flex-shrink-0 bg-secondary text-white px-3 py-2 rounded-md hover:bg-secondary-focus flex items-center justify-center focus:outline-none text-sm self-start"
                        disabled={
                            (currentSubTaskCategory === TaskResetCategory.SPECIFIC_HOURS && (!currentSubTaskHours || currentSubTaskHours <=0)) ||
                            (currentSubTaskCategory === TaskResetCategory.SPECIFIC_DAY && currentSubTaskSpecificDays.length === 0)
                        }
                    >
                        <PlusCircleIcon className="w-4 h-4 mr-1 sm:mr-0 md:mr-1"/> <span className="hidden sm:inline md:hidden lg:inline">Add</span>
                    </button>
                  </div>
              </div>
            )}
            {(taskData.sub_tasks || []).length === 0 && editingSubTask === null && (
                <p className="text-xs text-base-content-secondary mt-2">No sub-tasks yet. Add some if this is a multi-step task.</p>
            )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-base-300 rounded-md text-sm font-medium hover:bg-base-300/70 focus:outline-none">Cancel</button>
          <button 
            type="submit" 
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-focus" 
            disabled={isSaveDisabled()}
          >
            {editingSubTask !== null ? "Save Task (Complete Sub-task Edit First)" : (existingTask ? "Save Changes" : "Add Task")}
          </button>
        </div>
      </form>
    </Modal>
  );
};